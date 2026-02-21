import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiting';
import { UserModel } from '../models/User';
import { TokenUsageModel } from '../models/TokenUsage';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { captureException, captureMessage, isSentryInitialized } from '../analytics';
import { trackEvent, isPostHogInitialized } from '../analytics/posthog';

const router: Router = Router();

/**
 * @swagger
 * /api/debug/user-status:
 *   get:
 *     summary: Get detailed user status
 *     tags: [Debug]
 *     description: Retrieve comprehensive debug information about the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User debug information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDebugInfo'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/user-status', 
  generalLimiter,
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    
    try {
      // Get user details
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
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
      
      const debugInfo = {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          is_active: user.is_active,
          role: user.role,
          token_limit_global: user.token_limit_global,
          token_limit_monthly: user.token_limit_monthly,
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
          node_env: process.env.NODE_ENV,
          has_openai_key: !!process.env.OPENAI_API_KEY,
          has_anthropic_key: !!process.env.ANTHROPIC_API_KEY
        }
      };
      
      logger.info('User debug info requested', { 
        userId, 
        userEmail, 
        canSendMessages,
        projectCount,
        agentCount 
      });
      
      res.json({
        success: true,
        data: debugInfo
      });
      
    } catch (error) {
      logger.error('Error getting user debug info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user debug information'
      });
    }
  })
);

/**
 * @swagger
 * /api/debug/test-token-limit:
 *   post:
 *     summary: Test token limit checking
 *     tags: [Debug]
 *     description: Test whether a specified number of tokens would be allowed
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenLimitTestRequest'
 *     responses:
 *       200:
 *         description: Token limit check passed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenLimitTestResponse'
 *       402:
 *         description: Token limit would be exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenLimitTestResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/test-token-limit',
  generalLimiter,
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { tokens_to_use = 1000 } = req.body;
    
    try {
      // Test the token limit check
      await UserModel.checkTokenLimit(userId, tokens_to_use);
      
      res.json({
        success: true,
        message: `Token limit check passed for ${tokens_to_use} tokens`,
        data: {
          tokens_requested: tokens_to_use,
          check_result: 'PASSED'
        }
      });
      
    } catch (error) {
      logger.warn('Token limit check failed', { 
        userId, 
        tokensRequested: tokens_to_use, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      res.status(402).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token limit check failed',
        data: {
          tokens_requested: tokens_to_use,
          check_result: 'FAILED'
        }
      });
    }
  })
);

/**
 * @swagger
 * /api/debug/test-ai-service:
 *   get:
 *     summary: Test AI service connectivity
 *     tags: [Debug]
 *     description: Check configuration and connectivity of AI service providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIServiceStatus'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/test-ai-service',
  generalLimiter,
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { aiService } = await import('../services/aiService');
      
      // Get available providers and models
      const status = {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          key_length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
        },
        anthropic: {
          configured: !!process.env.ANTHROPIC_API_KEY,
          key_length: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0
        }
      };
      
      res.json({
        success: true,
        data: {
          ai_service_status: status,
          environment: process.env.NODE_ENV
        }
      });
      
    } catch (error) {
      logger.error('Error checking AI service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check AI service status'
      });
    }
  })
);

/**
 * @swagger
 * /api/debug/reset-user-usage/{userId}:
 *   post:
 *     summary: Reset user token usage
 *     tags: [Debug]
 *     description: Reset all token usage records for a specific user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User usage reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsageResetResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/reset-user-usage/:userId',
  generalLimiter,
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const authUser = req.user!;
    const targetUserId = req.params.userId;
    
    // Get full user object to check role
    const adminUser = await UserModel.findById(authUser.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    try {
      // Delete all token usage for the user
      const deleteQuery = 'DELETE FROM token_usage WHERE user_id = $1';
      const result = await UserModel.query(deleteQuery, [targetUserId]);
      
      logger.info('User token usage reset', { 
        adminUserId: authUser.id, 
        targetUserId, 
        deletedRecords: result.rowCount 
      });
      
      res.json({
        success: true,
        message: `Reset token usage for user ${targetUserId}`,
        data: {
          deleted_records: result.rowCount
        }
      });
      
    } catch (error) {
      logger.error('Error resetting user token usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset user token usage'
      });
    }
  })
);

router.get('/test-sentry',
  generalLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const sentryInitialized = isSentryInitialized();
    const testError = new Error('Sentry test error from /api/debug/test-sentry');
    const eventId = captureException(testError);
    captureMessage('Sentry test message', 'info');
    logger.info('Sentry test triggered', { sentryInitialized, eventId });
    res.json({ success: true, sentryInitialized, eventId });
  })
);

router.get('/test-posthog',
  generalLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const posthogInitialized = isPostHogInitialized();
    trackEvent('test_event', 'debug-user', { source: 'debug-endpoint', timestamp: new Date().toISOString() });
    logger.info('PostHog test triggered', { posthogInitialized });
    res.json({ success: true, posthogInitialized });
  })
);

export default router;
