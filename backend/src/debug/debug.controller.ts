import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserModel } from '../models/User';
import { TokenUsageModel } from '../models/TokenUsage';
import logger from '../utils/logger';
import {
  captureException,
  captureMessage,
  isSentryInitialized,
} from '../analytics';
import { trackEvent, isPostHogInitialized } from '../analytics/posthog';

@ApiTags('Debug')
@ApiBearerAuth()
@Controller('debug')
export class DebugController {
  @Get('user-status')
  @ApiOperation({ summary: 'Get detailed user status' })
  async getUserStatus(@CurrentUser() user: { id: string; email: string }) {
    const userId = user.id;

    const dbUser = await UserModel.findById(userId);
    if (!dbUser) {
      return { success: false, error: 'User not found' };
    }

    // Get token usage
    const usage = await TokenUsageModel.getUserSummary(userId);

    // Get global limits
    const globalLimits = await UserModel.getGlobalTokenLimits();

    // Calculate effective limits
    const effectiveGlobalLimit = dbUser.token_limit_global || globalLimits.global;
    const effectiveMonthlyLimit = dbUser.token_limit_monthly || globalLimits.monthly;

    // Get current month usage
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthlyUsage = await TokenUsageModel.getUserSummary(userId, startOfMonth);

    // Check if user can send messages
    const canSendMessages =
      dbUser.is_active &&
      (effectiveGlobalLimit === null ||
        effectiveGlobalLimit === 0 ||
        usage.total_tokens < effectiveGlobalLimit) &&
      (effectiveMonthlyLimit === null ||
        effectiveMonthlyLimit === 0 ||
        monthlyUsage.total_tokens < effectiveMonthlyLimit);

    // Get user's projects count
    const projectsResult = await UserModel.query(
      'SELECT COUNT(*) as project_count FROM projects WHERE user_id = $1',
      [userId],
    );
    const projectCount = parseInt(projectsResult.rows[0].project_count);

    // Get user's agents count
    const agentsResult = await UserModel.query(
      'SELECT COUNT(*) as agent_count FROM agents WHERE user_id = $1',
      [userId],
    );
    const agentCount = parseInt(agentsResult.rows[0].agent_count);

    const debugInfo = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        is_active: dbUser.is_active,
        role: dbUser.role,
        token_limit_global: dbUser.token_limit_global,
        token_limit_monthly: dbUser.token_limit_monthly,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at,
      },
      limits: {
        global_limit: globalLimits.global,
        monthly_limit: globalLimits.monthly,
        effective_global_limit: effectiveGlobalLimit,
        effective_monthly_limit: effectiveMonthlyLimit,
      },
      usage: {
        total_tokens: usage.total_tokens,
        total_cost: usage.total_cost,
        monthly_tokens: monthlyUsage.total_tokens,
        monthly_cost: monthlyUsage.total_cost,
        by_provider: usage.by_provider,
      },
      resources: {
        project_count: projectCount,
        agent_count: agentCount,
      },
      status: {
        can_send_messages: canSendMessages,
        global_limit_exceeded:
          effectiveGlobalLimit > 0 && usage.total_tokens >= effectiveGlobalLimit,
        monthly_limit_exceeded:
          effectiveMonthlyLimit > 0 && monthlyUsage.total_tokens >= effectiveMonthlyLimit,
        account_active: dbUser.is_active,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        has_openai_key: !!process.env.OPENAI_API_KEY,
        has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
      },
    };

    logger.info('User debug info requested', {
      userId,
      userEmail: user.email,
      canSendMessages,
      projectCount,
      agentCount,
    });

    return debugInfo;
  }

  @Post('test-token-limit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test token limit checking' })
  async testTokenLimit(
    @CurrentUser('id') userId: string,
    @Body() body: { tokens_to_use?: number },
  ) {
    const tokensToUse = body.tokens_to_use ?? 1000;

    try {
      await UserModel.checkTokenLimit(userId, tokensToUse);
      return {
        message: `Token limit check passed for ${tokensToUse} tokens`,
        tokens_requested: tokensToUse,
        check_result: 'PASSED',
      };
    } catch (error) {
      logger.warn('Token limit check failed', {
        userId,
        tokensRequested: tokensToUse,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return 402 via throwing — but TransformInterceptor wraps in { success, data }
      // We need to throw an HttpException for the correct status
      const { HttpException } = await import('@nestjs/common');
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Token limit check failed',
          data: {
            tokens_requested: tokensToUse,
            check_result: 'FAILED',
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  @Get('test-ai-service')
  @ApiOperation({ summary: 'Test AI service connectivity' })
  async testAiService() {
    const status = {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        key_length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      },
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        key_length: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
      },
    };

    return {
      ai_service_status: status,
      environment: process.env.NODE_ENV,
    };
  }

  @Post('reset-user-usage/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user token usage (admin only)' })
  async resetUserUsage(
    @Param('userId') targetUserId: string,
    @CurrentUser() authUser: { id: string },
  ) {
    // Check admin role
    const adminUser = await UserModel.findById(authUser.id);
    if (!adminUser || adminUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const deleteQuery = 'DELETE FROM token_usage WHERE user_id = $1';
    const result = await UserModel.query(deleteQuery, [targetUserId]);

    logger.info('User token usage reset', {
      adminUserId: authUser.id,
      targetUserId,
      deletedRecords: result.rowCount,
    });

    return {
      message: `Reset token usage for user ${targetUserId}`,
      deleted_records: result.rowCount,
    };
  }

  @Public()
  @Get('test-sentry')
  @ApiOperation({ summary: 'Test Sentry integration' })
  testSentry() {
    const sentryInitialized = isSentryInitialized();
    const testError = new Error('Sentry test error from /api/debug/test-sentry');
    const eventId = captureException(testError);
    captureMessage('Sentry test message', 'info');
    logger.info('Sentry test triggered', { sentryInitialized, eventId });
    return { sentryInitialized, eventId };
  }

  @Public()
  @Get('test-posthog')
  @ApiOperation({ summary: 'Test PostHog integration' })
  testPosthog() {
    const posthogInitialized = isPostHogInitialized();
    trackEvent('test_event', 'debug-user', {
      source: 'debug-endpoint',
      timestamp: new Date().toISOString(),
    });
    logger.info('PostHog test triggered', { posthogInitialized });
    return { posthogInitialized };
  }
}
