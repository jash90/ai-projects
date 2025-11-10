import {
  Body,
  Controller,
  Get,
  Put,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { UserModel } from '../models/User';
import { ErrorResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

interface ProfileUpdateRequest {
  username?: string;
  email?: string;
}

interface PasswordUpdateRequest {
  current_password: string;
  new_password: string;
}

interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
  email_notifications?: boolean;
}

interface UserUsageStats {
  total_tokens_used?: number;
  total_cost?: number;
  monthly_tokens_used?: number;
  monthly_cost?: number;
  project_count?: number;
  message_count?: number;
  token_limit_global?: number;
  token_limit_monthly?: number;
  remaining_global_tokens?: number;
  remaining_monthly_tokens?: number;
}

// ===== Success Response Types =====

interface GetProfileResponse {
  success: true;
  data: {
    user: UserProfile;
  };
}

interface UpdateProfileResponse {
  success: true;
  data: {
    user: UserProfile;
  };
}

interface UpdatePasswordResponse {
  success: true;
  message: string;
}

interface GetPreferencesResponse {
  success: true;
  data: {
    preferences: UserPreferences;
  };
}

interface UpdatePreferencesResponse {
  success: true;
  data: {
    preferences: UserPreferences;
  };
}

interface GetUsageResponse {
  success: true;
  data: {
    stats: UserUsageStats;
  };
}

/**
 * User Settings Management
 *
 * Endpoints for managing user profile, password, preferences, and viewing usage statistics.
 */
@Route('settings')
@Tags('Settings')
export class SettingsController extends Controller {
  /**
   * Get user profile
   *
   * Retrieves the current user's profile information including username, email, and role.
   *
   * @summary Get current user profile
   */
  @Get('profile')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to get profile')
  public async getProfile(
    @Request() request: ExpressRequest
  ): Promise<GetProfileResponse> {
    try {
      const user = await UserModel.findById(request.user!.id);

      if (!user) {
        this.setStatus(404);
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      this.setStatus(500);
      throw error;
    }
  }

  /**
   * Update user profile
   *
   * Updates the current user's profile information (username and/or email).
   *
   * @summary Update user profile
   */
  @Put('profile')
  @Security('jwt')
  @SuccessResponse('200', 'Updated successfully')
  @TsoaResponse<ErrorResponse>(400, 'Email or username already taken')
  @TsoaResponse<ErrorResponse>(404, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update profile')
  public async updateProfile(
    @Body() requestBody: ProfileUpdateRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdateProfileResponse> {
    try {
      const userId = request.user!.id;

      // Check if email is already taken (if updating email)
      if (requestBody.email) {
        const existingUser = await UserModel.findByEmail(requestBody.email);
        if (existingUser && existingUser.id !== userId) {
          this.setStatus(400);
          throw new Error('Email is already taken');
        }
      }

      // Check if username is already taken (if updating username)
      if (requestBody.username) {
        const query = 'SELECT id FROM users WHERE username = $1 AND id != $2';
        const result = await UserModel.query(query, [requestBody.username, userId]);
        if (result.rows.length > 0) {
          this.setStatus(400);
          throw new Error('Username is already taken');
        }
      }

      const updatedUser = await UserModel.updateProfile(userId, requestBody);

      if (!updatedUser) {
        this.setStatus(404);
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            created_at: updatedUser.created_at,
            updated_at: updatedUser.updated_at
          }
        }
      };
    } catch (error) {
      logger.error('Error updating user profile:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Update password
   *
   * Updates the current user's password. Requires current password for verification.
   *
   * @summary Update user password
   */
  @Put('password')
  @Security('jwt')
  @SuccessResponse('200', 'Password updated successfully')
  @TsoaResponse<ErrorResponse>(400, 'Current password is incorrect')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update password')
  public async updatePassword(
    @Body() requestBody: PasswordUpdateRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdatePasswordResponse> {
    try {
      const userId = request.user!.id;

      await UserModel.updatePassword(
        userId,
        requestBody.current_password,
        requestBody.new_password
      );

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      logger.error('Error updating password:', error);

      if (error.message === 'Current password is incorrect') {
        this.setStatus(400);
      } else {
        this.setStatus(500);
      }

      throw error;
    }
  }

  /**
   * Get user preferences
   *
   * Retrieves the current user's preferences (theme, notifications, etc.).
   *
   * @summary Get user preferences
   */
  @Get('preferences')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to get preferences')
  public async getPreferences(
    @Request() request: ExpressRequest
  ): Promise<GetPreferencesResponse> {
    try {
      const preferences = await UserModel.getUserPreferences(request.user!.id);

      return {
        success: true,
        data: { preferences }
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      this.setStatus(500);
      throw error;
    }
  }

  /**
   * Update user preferences
   *
   * Updates the current user's preferences (theme, notifications, etc.).
   *
   * @summary Update user preferences
   */
  @Put('preferences')
  @Security('jwt')
  @SuccessResponse('200', 'Updated successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update preferences')
  public async updatePreferences(
    @Body() requestBody: UserPreferences,
    @Request() request: ExpressRequest
  ): Promise<UpdatePreferencesResponse> {
    try {
      const userId = request.user!.id;
      const updatedPreferences = await UserModel.updateUserPreferences(userId, requestBody);

      return {
        success: true,
        data: { preferences: updatedPreferences }
      };
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      this.setStatus(500);
      throw error;
    }
  }

  /**
   * Get user usage statistics
   *
   * Retrieves the current user's token usage, costs, and limits.
   *
   * @summary Get usage statistics
   */
  @Get('usage')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to get usage statistics')
  public async getUsage(
    @Request() request: ExpressRequest
  ): Promise<GetUsageResponse> {
    try {
      const userId = request.user!.id;
      const stats = await UserModel.getUserStatsById(userId);

      return {
        success: true,
        data: { stats }
      };
    } catch (error) {
      logger.error('Error getting user usage stats:', error);
      this.setStatus(500);
      throw error;
    }
  }
}
