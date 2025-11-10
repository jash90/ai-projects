import {
  Body,
  Controller,
  Get,
  Put,
  Path,
  Query,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { UserModel } from '../models/User';
import { pool } from '../database/connection';
import { TokenLimitUpdate } from '../types';
import { ErrorResponse, PaginationInfo } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface AdminStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_messages?: number;
  total_conversations?: number;
  total_tokens_used: number;
  total_cost: number;
  monthly_tokens: number;
  monthly_cost: number;
  tokens_this_month?: number;
  cost_this_month?: number;
  top_users?: any[];
}

interface UserManagementInfo {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  token_limit_global: number | null;
  token_limit_monthly: number | null;
  total_tokens_used: number;
  total_cost: number;
  project_count: number;
  created_at: Date;
  updated_at: Date;
}

interface UserStats {
  total_tokens_used?: number;
  total_cost?: number;
  monthly_tokens_used?: number;
  monthly_cost?: number;
  project_count?: number;
  message_count?: number;
}

interface TokenLimits {
  global: number | null;
  monthly: number | null;
}

interface UpdateTokenLimitsRequest {
  user_id?: string;
  global_limit?: number;
  monthly_limit?: number;
}

interface ToggleUserStatusRequest {
  is_active: boolean;
}

interface ActivityLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_user_id: string | null;
  details: any;
  created_at: Date;
  admin_email: string;
  admin_username: string;
  target_email: string | null;
  target_username: string | null;
}

// ===== Success Response Types =====

interface GetAdminStatsResponse {
  success: true;
  data: AdminStats;
}

interface GetUsersResponse {
  success: true;
  data: {
    users: UserManagementInfo[];
    pagination: PaginationInfo;
  };
}

interface GetUserStatsResponse {
  success: true;
  data: UserStats;
}

interface UpdateTokenLimitsResponse {
  success: true;
  message: string;
}

interface GetTokenLimitsResponse {
  success: true;
  data: TokenLimits;
}

interface ToggleUserStatusResponse {
  success: true;
  message: string;
}

interface GetActivityLogResponse {
  success: true;
  data: {
    activities: ActivityLog[];
    pagination: PaginationInfo;
  };
}

/**
 * Admin Management
 *
 * Admin-only endpoints for managing users, token limits, and viewing statistics.
 */
@Route('admin')
@Tags('Admin')
export class AdminController extends Controller {
  /**
   * Get admin dashboard statistics
   *
   * Retrieves comprehensive statistics for the admin dashboard.
   *
   * @summary Get admin statistics
   */
  @Get('stats')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch admin statistics')
  public async getAdminStats(
    @Request() request: ExpressRequest
  ): Promise<GetAdminStatsResponse> {
    try {
      const stats = await UserModel.getAdminStats();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error fetching admin stats:', error);
      this.setStatus(500);
      throw new Error('Failed to fetch admin statistics');
    }
  }

  /**
   * Get all users with management information
   *
   * Retrieves a paginated list of all users with their usage statistics.
   *
   * @summary Get all users
   */
  @Get('users')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch users')
  public async getUsers(
    @Query() page: number = 1,
    @Query() limit: number = 20,
    @Query() search?: string,
    @Query() role?: 'user' | 'admin',
    @Query() status?: 'active' | 'inactive',
    @Request() request?: ExpressRequest
  ): Promise<GetUsersResponse> {
    try {
      let query = 'SELECT * FROM user_management_view WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;

      if (search) {
        query += ` AND (email ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
        values.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        query += ` AND role = $${paramCount}`;
        values.push(role);
        paramCount++;
      }

      if (status) {
        const isActive = status === 'active';
        query += ` AND is_active = $${paramCount}`;
        values.push(isActive);
        paramCount++;
      }

      // Get total count
      const countQuery = query.replace('SELECT * FROM user_management_view', 'SELECT COUNT(*) as total FROM user_management_view');
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total, 10);

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, (page - 1) * limit);

      const result = await pool.query(query, values);

      return {
        success: true,
        data: {
          users: result.rows,
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            has_next: page < Math.ceil(total / limit),
            has_prev: page > 1
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching users for admin:', error);
      this.setStatus(500);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get detailed stats for a specific user
   *
   * Retrieves comprehensive usage statistics for a specific user.
   *
   * @summary Get user statistics
   * @param userId User ID
   */
  @Get('users/{userId}/stats')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(404, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch user statistics')
  public async getUserStats(
    @Path() userId: string,
    @Request() request: ExpressRequest
  ): Promise<GetUserStatsResponse> {
    try {
      const stats = await UserModel.getUserStatsById(userId);

      if (!stats) {
        this.setStatus(404);
        throw new Error('User not found');
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Update token limits
   *
   * Updates global default token limits or specific user token limits.
   *
   * @summary Update token limits
   */
  @Put('token-limits')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'Token limits updated successfully')
  @TsoaResponse<ErrorResponse>(400, 'Failed to update token limits')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update token limits')
  public async updateTokenLimits(
    @Body() requestBody: UpdateTokenLimitsRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdateTokenLimitsResponse> {
    try {
      const updates: TokenLimitUpdate = requestBody;
      const success = await UserModel.updateTokenLimits(updates);

      if (!success) {
        this.setStatus(400);
        throw new Error('Failed to update token limits');
      }

      return {
        success: true,
        message: updates.user_id ? 'User token limits updated' : 'Global token limits updated'
      };
    } catch (error) {
      logger.error('Error updating token limits:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get current global token limits
   *
   * Retrieves the current global default token limits.
   *
   * @summary Get global token limits
   */
  @Get('token-limits')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch token limits')
  public async getTokenLimits(
    @Request() request: ExpressRequest
  ): Promise<GetTokenLimitsResponse> {
    try {
      const limits = await UserModel.getGlobalTokenLimits();

      return {
        success: true,
        data: limits
      };
    } catch (error) {
      logger.error('Error fetching token limits:', error);
      this.setStatus(500);
      throw new Error('Failed to fetch token limits');
    }
  }

  /**
   * Toggle user active/inactive status
   *
   * Activates or deactivates a user account.
   *
   * @summary Toggle user status
   * @param userId User ID
   */
  @Put('users/{userId}/status')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'User status updated successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(404, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update user status')
  public async toggleUserStatus(
    @Path() userId: string,
    @Body() requestBody: ToggleUserStatusRequest,
    @Request() request: ExpressRequest
  ): Promise<ToggleUserStatusResponse> {
    try {
      const { is_active } = requestBody;
      const success = await UserModel.toggleUserStatus(userId, is_active);

      if (!success) {
        this.setStatus(404);
        throw new Error('User not found');
      }

      return {
        success: true,
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      logger.error('Error updating user status:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Update token limits for specific user
   *
   * Updates token limits for a specific user account.
   *
   * @summary Update user token limits
   * @param userId User ID
   */
  @Put('users/{userId}/token-limits')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'User token limits updated successfully')
  @TsoaResponse<ErrorResponse>(400, 'Failed to update user token limits')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update user token limits')
  public async updateUserTokenLimits(
    @Path() userId: string,
    @Body() requestBody: UpdateTokenLimitsRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdateTokenLimitsResponse> {
    try {
      const updates: TokenLimitUpdate = {
        user_id: userId,
        ...requestBody
      };

      const success = await UserModel.updateTokenLimits(updates);

      if (!success) {
        this.setStatus(400);
        throw new Error('Failed to update user token limits');
      }

      return {
        success: true,
        message: 'User token limits updated successfully'
      };
    } catch (error) {
      logger.error('Error updating user token limits:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get admin activity log
   *
   * Retrieves a paginated list of admin actions.
   *
   * @summary Get admin activity log
   */
  @Get('activity')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch activity log')
  public async getActivityLog(
    @Query() page: number = 1,
    @Query() limit: number = 50,
    @Query() admin_user_id?: string,
    @Query() action_type?: string,
    @Request() request?: ExpressRequest
  ): Promise<GetActivityLogResponse> {
    try {
      // Build shared filter conditions
      const values: any[] = [];
      let paramCount = 1;
      let filters = 'WHERE 1=1';

      if (admin_user_id) {
        filters += ` AND aal.admin_user_id = $${paramCount}`;
        values.push(admin_user_id);
        paramCount++;
      }

      if (action_type) {
        filters += ` AND aal.action_type = $${paramCount}`;
        values.push(action_type);
        paramCount++;
      }

      // Construct COUNT query independently
      const countQuery = `
        SELECT COUNT(*) as total
        FROM admin_activity_log aal
        ${filters}
      `;
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total, 10);

      // Construct data query with the same filters
      const query = `
        SELECT
          aal.*,
          admin_user.email as admin_email,
          admin_user.username as admin_username,
          target_user.email as target_email,
          target_user.username as target_username
        FROM admin_activity_log aal
        LEFT JOIN users admin_user ON aal.admin_user_id = admin_user.id
        LEFT JOIN users target_user ON aal.target_user_id = target_user.id
        ${filters}
        ORDER BY aal.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      // Add pagination values after all filter values
      const dataValues = [...values, limit, (page - 1) * limit];
      const result = await pool.query(query, dataValues);

      return {
        success: true,
        data: {
          activities: result.rows,
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            has_next: page < Math.ceil(total / limit),
            has_prev: page > 1
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching admin activity log:', error);
      this.setStatus(500);
      throw new Error('Failed to fetch activity log');
    }
  }
}
