import { pool } from '../database/connection';
import { User, UserCreate, UserProfileUpdate, UserPasswordUpdate, UserPreferences, UserManagement, AdminStats, UserUsageStats, TokenLimitUpdate } from '../types';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';
import config from '../utils/config';

export class UserModel {
  static async query(sql: string, params: any[] = []): Promise<any> {
    return await pool.query(sql, params);
  }

  static async create(userData: UserCreate): Promise<User> {
    const { email, username, password } = userData;
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Check if this is the admin user
    const isAdmin = email === config.admin.email;
    const role = isAdmin ? 'admin' : 'user';

    const query = `
      INSERT INTO users (email, username, password_hash, role, token_limit_global, token_limit_monthly, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, username, role, token_limit_global, token_limit_monthly, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, [
      email, 
      username, 
      passwordHash, 
      role,
      config.admin.default_token_limit_global,
      config.admin.default_token_limit_monthly,
      true
    ]);
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, role, token_limit_global, token_limit_monthly, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findByEmailWithPassword(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, role, token_limit_global, token_limit_monthly, is_active, password_hash, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, role, token_limit_global, token_limit_monthly, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updateById(id: string, updates: Partial<UserCreate>): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }

    if (updates.username) {
      fields.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }

    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 12);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, role, token_limit_global, token_limit_monthly, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async emailExists(email: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE email = $1 LIMIT 1';
    const result = await pool.query(query, [email]);
    return result.rowCount > 0;
  }

  static async usernameExists(username: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE username = $1 LIMIT 1';
    const result = await pool.query(query, [username]);
    return result.rowCount > 0;
  }

  static async getProjectCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM projects WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  // Admin-specific methods
  static async getAllUsersForAdmin(): Promise<UserManagement[]> {
    const query = `
      SELECT * FROM user_management_view
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getUserStatsById(userId: string): Promise<UserUsageStats | null> {
    const query = `
      SELECT 
        u.id as user_id,
        u.email,
        u.username,
        u.token_limit_global,
        u.token_limit_monthly,
        COALESCE(SUM(tu.total_tokens), 0) as total_tokens,
        COALESCE(SUM(CASE 
          WHEN tu.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN tu.total_tokens 
          ELSE 0 
        END), 0) as monthly_tokens,
        COALESCE(SUM(tu.estimated_cost), 0) as total_cost,
        COALESCE(SUM(CASE 
          WHEN tu.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN tu.estimated_cost 
          ELSE 0 
        END), 0) as monthly_cost,
        COUNT(DISTINCT p.id) as project_count,
        MAX(tu.created_at) as last_active
      FROM users u
      LEFT JOIN projects p ON u.id = p.user_id
      LEFT JOIN token_usage tu ON u.id = tu.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.username, u.token_limit_global, u.token_limit_monthly
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async getAdminStats(): Promise<AdminStats> {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) FROM conversations) as total_messages,
        (SELECT COALESCE(SUM(total_tokens), 0) FROM token_usage) as total_tokens_used,
        (SELECT COALESCE(SUM(estimated_cost), 0) FROM token_usage) as total_cost,
        (SELECT COALESCE(SUM(total_tokens), 0) FROM token_usage WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_tokens,
        (SELECT COALESCE(SUM(estimated_cost), 0) FROM token_usage WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_cost
    `;

    const topUsersQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        u.username,
        COALESCE(SUM(tu.total_tokens), 0) as total_tokens,
        COALESCE(SUM(CASE 
          WHEN tu.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN tu.total_tokens 
          ELSE 0 
        END), 0) as monthly_tokens,
        COALESCE(SUM(tu.estimated_cost), 0) as total_cost,
        COALESCE(SUM(CASE 
          WHEN tu.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN tu.estimated_cost 
          ELSE 0 
        END), 0) as monthly_cost,
        COUNT(DISTINCT p.id) as project_count,
        MAX(tu.created_at) as last_active
      FROM users u
      LEFT JOIN projects p ON u.id = p.user_id
      LEFT JOIN token_usage tu ON u.id = tu.user_id
      GROUP BY u.id, u.email, u.username
      ORDER BY total_tokens DESC
      LIMIT 10
    `;

    const [statsResult, topUsersResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(topUsersQuery)
    ]);

    return {
      ...statsResult.rows[0],
      top_users: topUsersResult.rows
    };
  }

  static async updateTokenLimits(updates: TokenLimitUpdate): Promise<boolean> {
    try {
      if (updates.user_id) {
        // Update specific user limits
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.global_limit !== undefined) {
          fields.push(`token_limit_global = $${paramCount++}`);
          values.push(updates.global_limit);
        }

        if (updates.monthly_limit !== undefined) {
          fields.push(`token_limit_monthly = $${paramCount++}`);
          values.push(updates.monthly_limit);
        }

        if (fields.length > 0) {
          values.push(updates.user_id);
          const query = `
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
          `;
          
          await pool.query(query, values);
        }
      } else {
        // Update global defaults
        if (updates.global_limit !== undefined) {
          await pool.query(
            'UPDATE global_token_limits SET limit_value = $1, updated_at = CURRENT_TIMESTAMP WHERE limit_type = $2',
            [updates.global_limit, 'global']
          );
        }

        if (updates.monthly_limit !== undefined) {
          await pool.query(
            'UPDATE global_token_limits SET limit_value = $1, updated_at = CURRENT_TIMESTAMP WHERE limit_type = $2',
            [updates.monthly_limit, 'monthly']
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating token limits:', error);
      return false;
    }
  }

  static async toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    const query = `
      UPDATE users
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await pool.query(query, [isActive, userId]);
    return result.rowCount > 0;
  }

  static async getGlobalTokenLimits(): Promise<{ global: number; monthly: number }> {
    const query = `
      SELECT limit_type, limit_value
      FROM global_token_limits
      WHERE limit_type IN ('global', 'monthly')
    `;

    const result = await pool.query(query);
    const limits = { global: 1000000, monthly: 100000 }; // defaults

    result.rows.forEach(row => {
      limits[row.limit_type as 'global' | 'monthly'] = row.limit_value;
    });

    return limits;
  }

  static async logAdminActivity(adminUserId: string, actionType: string, targetUserId?: string, details?: any): Promise<void> {
    const query = `
      INSERT INTO admin_activity_log (admin_user_id, action_type, target_user_id, details)
      VALUES ($1, $2, $3, $4)
    `;

    await pool.query(query, [adminUserId, actionType, targetUserId, JSON.stringify(details)]);
  }

  static async checkTokenLimit(userId: string, tokensToUse: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.is_active) {
      const { createUserInactiveError } = await import('../utils/errors');
      throw createUserInactiveError(userId);
    }

    // Get user's current usage
    const usageQuery = `
      SELECT 
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(CASE 
          WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN total_tokens 
          ELSE 0 
        END), 0) as monthly_tokens
      FROM token_usage
      WHERE user_id = $1
    `;

    const usageResult = await pool.query(usageQuery, [userId]);
    const { total_tokens, monthly_tokens } = usageResult.rows[0];
    
    // Convert database string values to numbers to prevent string concatenation
    const totalTokensNum = parseInt(total_tokens) || 0;
    const monthlyTokensNum = parseInt(monthly_tokens) || 0;

    // Get global limits if user doesn't have specific limits
    const globalLimits = await this.getGlobalTokenLimits();
    const globalLimit = user.token_limit_global || globalLimits.global;
    const monthlyLimit = user.token_limit_monthly || globalLimits.monthly;

    // Check global limit
    if (globalLimit > 0 && totalTokensNum + tokensToUse > globalLimit) {
      const { createTokenLimitError } = await import('../utils/errors');
      throw createTokenLimitError('global', totalTokensNum, globalLimit, tokensToUse);
    }

    // Check monthly limit
    if (monthlyLimit > 0 && monthlyTokensNum + tokensToUse > monthlyLimit) {
      const { createTokenLimitError } = await import('../utils/errors');
      throw createTokenLimitError('monthly', monthlyTokensNum, monthlyLimit, tokensToUse);
    }
  }

  static async updateProfile(userId: string, updates: UserProfileUpdate): Promise<User | null> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.username) {
        fields.push(`username = $${paramCount++}`);
        values.push(updates.username);
      }

      if (updates.email) {
        fields.push(`email = $${paramCount++}`);
        values.push(updates.email);
      }

      if (fields.length === 0) {
        return await this.findById(userId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, username, role, token_limit_global, token_limit_monthly, is_active, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // First verify current password
      const user = await this.findByIdWithPassword(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await pool.query(query, [hashedNewPassword, userId]);
      return true;
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  static async findByIdWithPassword(userId: string): Promise<(User & { password_hash: string }) | null> {
    try {
      const query = `
        SELECT id, email, username, password_hash, role, token_limit_global, token_limit_monthly, is_active, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID with password:', error);
      throw error;
    }
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // For now, return default preferences since we don't have a preferences table
      // This can be extended later with a user_preferences table
      return {
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw error;
    }
  }

  static async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
    try {
      // For now, just return the preferences since we don't have a preferences table
      // This can be extended later with a user_preferences table
      logger.info(`User ${userId} preferences updated:`, preferences);
      return preferences;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }
}