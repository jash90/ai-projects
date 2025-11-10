import {
  Body,
  Controller,
  Get,
  Post,
  Path,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { UserModel } from '../models/User';
import { TokenUsageModel } from '../models/TokenUsage';
import { ErrorResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface UserDebugInfo {
  user: {
    id: string;
    email: string;
    username: string;
    is_active: boolean;
    role: string;
    token_limit_global: number | null;
    token_limit_monthly: number | null;
    created_at: Date;
    updated_at: Date;
  };
  limits: {
    global_limit: number | null;
    monthly_limit: number | null;
    effective_global_limit: number | null;
    effective_monthly_limit: number | null;
  };
  usage: {
    total_tokens: number;
    total_cost: number;
    monthly_tokens: number;
    monthly_cost: number;
    by_provider: any;
  };
  resources: {
    project_count: number;
    agent_count: number;
  };
  status: {
    can_send_messages: boolean;
    global_limit_exceeded: boolean;
    monthly_limit_exceeded: boolean;
    account_active: boolean;
  };
  environment: {
    node_env: string;
    has_openai_key: boolean;
    has_anthropic_key: boolean;
  };
}

interface TestTokenLimitRequest {
  tokens_to_use?: number;
}

interface AIServiceStatus {
  openai: {
    configured: boolean;
    key_length: number;
  };
  anthropic: {
    configured: boolean;
    key_length: number;
  };
}

// ===== Success Response Types =====

interface GetUserStatusResponse {
  success: true;
  data: UserDebugInfo;
}

interface TestTokenLimitResponse {
  success: true;
  message: string;
  data: {
    tokens_requested: number;
    check_result: 'PASSED' | 'FAILED';
  };
}

interface GetAIServiceStatusResponse {
  success: true;
  data: {
    ai_service_status: AIServiceStatus;
    environment: string;
  };
}

interface ResetUserUsageResponse {
  success: true;
  message: string;
  data: {
    deleted_records: number;
  };
}

/**
 * Debug Tools
 *
 * Debug endpoints for troubleshooting user accounts and system status.
 */
@Route('debug')
@Tags('Debug')
export class DebugController extends Controller {
  /**
   * Check user status and capabilities
   *
   * Retrieves comprehensive debug information about the current user's account status,
   * token limits, usage, and system configuration.
   *
   * @summary Get user debug information
   */
  @Get('user-status')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to get user debug information')
  public async getUserStatus(
    @Request() request: ExpressRequest
  ): Promise<GetUserStatusResponse> {
    try {
      const userId = request.user!.id;
      const userEmail = request.user!.email;

      // Get user details
      const user = await UserModel.findById(userId);
      if (!user) {
        this.setStatus(404);
        throw new Error('User not found');
      }

      // Get token usage
      const usage = await TokenUsageModel.getUserSummary(userId);

      // Get global limits
      const globalLimits = await UserModel.getGlobalTokenLimits();

      // Calculate effective limits
      const effectiveGlobalLimit = user.token_limit_global || globalLimits.global;
      const effectiveMonthlyLimit = user.token_limit_monthly || globalLimits.monthly;

      // Get current month usage
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthlyUsage = await TokenUsageModel.getUserSummary(userId, startOfMonth);

      // Check if user can send messages
      const canSendMessages = user.is_active &&
        (effectiveGlobalLimit === null || effectiveGlobalLimit === 0 || usage.total_tokens < effectiveGlobalLimit) &&
        (effectiveMonthlyLimit === null || effectiveMonthlyLimit === 0 || monthlyUsage.total_tokens < effectiveMonthlyLimit);

      // Get user's projects count
      const projectsQuery = `
        SELECT COUNT(*) as project_count
        FROM projects
        WHERE user_id = $1
      `;
      const projectsResult = await UserModel.query(projectsQuery, [userId]);
      const projectCount = parseInt(projectsResult.rows[0].project_count);

      // Get user's agents count
      const agentsQuery = `
        SELECT COUNT(*) as agent_count
        FROM agents
        WHERE user_id = $1
      `;
      const agentsResult = await UserModel.query(agentsQuery, [userId]);
      const agentCount = parseInt(agentsResult.rows[0].agent_count);

      const debugInfo: UserDebugInfo = {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          is_active: user.is_active,
          role: user.role,
          token_limit_global: user.token_limit_global ?? null,
          token_limit_monthly: user.token_limit_monthly ?? null,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        limits: {
          global_limit: globalLimits.global,
          monthly_limit: globalLimits.monthly,
          effective_global_limit: effectiveGlobalLimit,
          effective_monthly_limit: effectiveMonthlyLimit
        },
        usage: {
          total_tokens: usage.total_tokens,
          total_cost: usage.total_cost,
          monthly_tokens: monthlyUsage.total_tokens,
          monthly_cost: monthlyUsage.total_cost,
          by_provider: usage.by_provider
        },
        resources: {
          project_count: projectCount,
          agent_count: agentCount
        },
        status: {
          can_send_messages: canSendMessages,
          global_limit_exceeded: effectiveGlobalLimit > 0 && usage.total_tokens >= effectiveGlobalLimit,
          monthly_limit_exceeded: effectiveMonthlyLimit > 0 && monthlyUsage.total_tokens >= effectiveMonthlyLimit,
          account_active: user.is_active
        },
        environment: {
          node_env: process.env.NODE_ENV || 'development',
          has_openai_key: !!process.env.OPENAI_API_KEY,
          has_anthropic_key: !!process.env.ANTHROPIC_API_KEY
        }
      };

      logger.info('User debug info requested', {
        userId,
        userEmail,
        canSendMessages,
        projectCount,
        agentCount,
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      return {
        success: true,
        data: debugInfo
      };
    } catch (error) {
      logger.error('Error getting user debug info:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Test token limit checking
   *
   * Simulates checking token limits for a specified number of tokens.
   * Useful for debugging token limit enforcement.
   *
   * @summary Test token limit check
   */
  @Post('test-token-limit')
  @Security('jwt')
  @SuccessResponse('200', 'Token limit check passed')
  @TsoaResponse<ErrorResponse>(402, 'Token limit exceeded')
  @TsoaResponse<ErrorResponse>(500, 'Test failed')
  public async testTokenLimit(
    @Body() requestBody: TestTokenLimitRequest,
    @Request() request: ExpressRequest
  ): Promise<TestTokenLimitResponse> {
    try {
      const userId = request.user!.id;
      const { tokens_to_use = 1000 } = requestBody;

      // Test the token limit check
      await UserModel.checkTokenLimit(userId, tokens_to_use);

      return {
        success: true,
        message: `Token limit check passed for ${tokens_to_use} tokens`,
        data: {
          tokens_requested: tokens_to_use,
          check_result: 'PASSED'
        }
      };
    } catch (error) {
      const userId = request.user!.id;
      const { tokens_to_use = 1000 } = requestBody;

      logger.warn('Token limit check failed', {
        userId,
        tokensRequested: tokens_to_use,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      this.setStatus(402);
      return {
        success: true,
        message: error instanceof Error ? error.message : 'Token limit check failed',
        data: {
          tokens_requested: tokens_to_use,
          check_result: 'FAILED'
        }
      };
    }
  }

  /**
   * Check AI service connectivity
   *
   * Tests connectivity to AI service providers (OpenAI, Anthropic).
   *
   * @summary Test AI service connectivity
   */
  @Get('test-ai-service')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to check AI service status')
  public async testAIService(
    @Request() request: ExpressRequest
  ): Promise<GetAIServiceStatusResponse> {
    try {
      const status: AIServiceStatus = {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          key_length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
        },
        anthropic: {
          configured: !!process.env.ANTHROPIC_API_KEY,
          key_length: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0
        }
      };

      return {
        success: true,
        data: {
          ai_service_status: status,
          environment: process.env.NODE_ENV || 'development'
        }
      };
    } catch (error) {
      logger.error('Error checking AI service:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to check AI service status');
    }
  }

  /**
   * Reset user token usage (admin only)
   *
   * Deletes all token usage records for a specific user. Admin access required.
   *
   * @summary Reset user token usage
   * @param userId User ID
   */
  @Post('reset-user-usage/{userId}')
  @Security('jwt', ['admin'])
  @SuccessResponse('200', 'User token usage reset successfully')
  @TsoaResponse<ErrorResponse>(403, 'Admin access required')
  @TsoaResponse<ErrorResponse>(500, 'Failed to reset user token usage')
  public async resetUserUsage(
    @Path() userId: string,
    @Request() request: ExpressRequest
  ): Promise<ResetUserUsageResponse> {
    try {
      const authUser = request.user!;

      // Get full user object to check role
      const adminUser = await UserModel.findById(authUser.id);
      if (!adminUser || adminUser.role !== 'admin') {
        this.setStatus(403);
        throw new Error('Admin access required');
      }

      // Delete all token usage for the user
      const deleteQuery = 'DELETE FROM token_usage WHERE user_id = $1';
      const result = await UserModel.query(deleteQuery, [userId]);

      logger.info('User token usage reset', {
        adminUserId: authUser.id,
        targetUserId: userId,
        deletedRecords: result.rowCount,
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      return {
        success: true,
        message: `Reset token usage for user ${userId}`,
        data: {
          deleted_records: result.rowCount || 0
        }
      };
    } catch (error) {
      logger.error('Error resetting user token usage:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }
}
