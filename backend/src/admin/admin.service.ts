import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserModel } from '../models/User';
import { TokenLimitUpdate } from '../types';
import { pool } from '../database/connection';

@Injectable()
export class AdminService {
  async getStats() {
    return UserModel.getAdminStats();
  }

  async getUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'inactive';
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    let query = 'SELECT * FROM user_management_view WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (options.search) {
      query += ` AND (email ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
      values.push(`%${options.search}%`);
      paramCount++;
    }

    if (options.role) {
      query += ` AND role = $${paramCount}`;
      values.push(options.role);
      paramCount++;
    }

    if (options.status) {
      const isActive = options.status === 'active';
      query += ` AND is_active = $${paramCount}`;
      values.push(isActive);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT * FROM user_management_view',
      'SELECT COUNT(*) as total FROM user_management_view',
    );
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await pool.query(query, values);

    // Map DB column names to frontend-expected field names
    const users = result.rows.map((row: any) => ({
      ...row,
      total_tokens_used: row.total_tokens,
      monthly_tokens_used: row.monthly_tokens,
    }));

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats(userId: string) {
    const stats = await UserModel.getUserStatsById(userId);
    if (!stats) {
      throw new NotFoundException('User not found');
    }
    return stats;
  }

  async updateUserRole(userId: string, role: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await UserModel.updateById(userId, { role } as any);
    return updated;
  }

  async updateUserLimits(userId: string, updates: { global_limit?: number; monthly_limit?: number }) {
    const tokenUpdates: TokenLimitUpdate = {
      user_id: userId,
      ...updates,
    };
    const success = await UserModel.updateTokenLimits(tokenUpdates);
    if (!success) {
      throw new BadRequestException('Failed to update user token limits');
    }
    return { message: 'User token limits updated successfully' };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const success = await UserModel.toggleUserStatus(userId, isActive);
    if (!success) {
      throw new NotFoundException('User not found');
    }
    return { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
  }

  async updateGlobalLimits(updates: { global_limit?: number; monthly_limit?: number }) {
    const success = await UserModel.updateTokenLimits(updates);
    if (!success) {
      throw new BadRequestException('Failed to update token limits');
    }
    return { message: 'Global token limits updated' };
  }

  async getGlobalLimits() {
    const limits = await UserModel.getGlobalTokenLimits();
    return {
      global_limit: limits.global,
      monthly_limit: limits.monthly,
    };
  }

  async getActivityLog(options: {
    page?: number;
    limit?: number;
    admin_user_id?: string;
    action_type?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 50;

    let query = `
      SELECT
        aal.*,
        admin_user.email as admin_email,
        admin_user.username as admin_username,
        target_user.email as target_email,
        target_user.username as target_username
      FROM admin_activity_log aal
      LEFT JOIN users admin_user ON aal.admin_user_id = admin_user.id
      LEFT JOIN users target_user ON aal.target_user_id = target_user.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (options.admin_user_id) {
      query += ` AND aal.admin_user_id = $${paramCount}`;
      values.push(options.admin_user_id);
      paramCount++;
    }

    if (options.action_type) {
      query += ` AND aal.action_type = $${paramCount}`;
      values.push(options.action_type);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT\s+aal\.\*[\s\S]*?FROM admin_activity_log aal[\s\S]*?WHERE/,
      'SELECT COUNT(*) as total FROM admin_activity_log aal LEFT JOIN users admin_user ON aal.admin_user_id = admin_user.id LEFT JOIN users target_user ON aal.target_user_id = target_user.id WHERE',
    );
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add pagination and ordering
    query += ` ORDER BY aal.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await pool.query(query, values);

    return {
      activities: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async logActivity(adminUserId: string, actionType: string, targetUserId?: string, details?: any) {
    await UserModel.logAdminActivity(adminUserId, actionType, targetUserId, details);
  }
}
