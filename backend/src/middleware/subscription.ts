import { Request, Response, NextFunction } from 'express';
import { SubscriptionModel } from '../models/Subscription';
import { PlanName } from '../types';
import logger from '../utils/logger';

/**
 * Middleware to require a minimum subscription plan
 */
export const requireSubscription = (minPlan?: PlanName) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const planName = await SubscriptionModel.getUserPlanName(userId);
      const subscription = await SubscriptionModel.getUserSubscription(userId);

      // Check if subscription is in good standing
      if (subscription && ['past_due', 'canceled', 'incomplete'].includes(subscription.status)) {
        return res.status(402).json({
          success: false,
          error: 'Your subscription requires attention. Please update your payment method.',
          code: 'SUBSCRIPTION_ISSUE',
          status: subscription.status,
        });
      }

      // If no minimum plan required, just ensure user exists
      if (!minPlan) {
        return next();
      }

      // Check plan level
      const planLevels: Record<PlanName, number> = {
        free: 0,
        pro: 1,
        enterprise: 2,
      };

      const currentLevel = planLevels[planName as PlanName] ?? 0;
      const requiredLevel = planLevels[minPlan];

      if (currentLevel < requiredLevel) {
        return res.status(402).json({
          success: false,
          error: `This feature requires a ${minPlan} plan or higher`,
          code: 'PLAN_REQUIRED',
          required_plan: minPlan,
          current_plan: planName,
        });
      }

      next();
    } catch (error) {
      logger.error('Subscription middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify subscription',
      });
    }
  };
};

/**
 * Middleware to check project creation limit
 */
export const checkProjectLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limitCheck = await SubscriptionModel.checkProjectLimit(userId);

    if (!limitCheck.allowed) {
      return res.status(402).json({
        success: false,
        error: limitCheck.message || 'Project limit reached',
        code: 'PROJECT_LIMIT_REACHED',
        current: limitCheck.current,
        max: limitCheck.max,
      });
    }

    next();
  } catch (error) {
    logger.error('Project limit check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check project limit',
    });
  }
};

/**
 * Middleware to check agent creation limit
 */
export const checkAgentLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limitCheck = await SubscriptionModel.checkAgentLimit(userId);

    if (!limitCheck.allowed) {
      return res.status(402).json({
        success: false,
        error: limitCheck.message || 'Agent limit reached',
        code: 'AGENT_LIMIT_REACHED',
        current: limitCheck.current,
        max: limitCheck.max,
      });
    }

    next();
  } catch (error) {
    logger.error('Agent limit check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check agent limit',
    });
  }
};

/**
 * Middleware to check file size limit based on subscription
 */
export const checkFileSizeLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limits = await SubscriptionModel.getUserLimits(userId);
    const maxSizeBytes = limits.max_file_size_mb * 1024 * 1024;

    // Check if file size is provided
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: `File size exceeds your plan limit of ${limits.max_file_size_mb}MB`,
        code: 'FILE_SIZE_LIMIT_EXCEEDED',
        max_size_mb: limits.max_file_size_mb,
      });
    }

    // Store limit for later use in the request
    (req as any).maxFileSizeBytes = maxSizeBytes;

    next();
  } catch (error) {
    logger.error('File size limit check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check file size limit',
    });
  }
};

/**
 * Middleware to require a paid subscription (pro or enterprise)
 */
export const requirePaidSubscription = requireSubscription('pro');

/**
 * Middleware to require enterprise subscription
 */
export const requireEnterprise = requireSubscription('enterprise');
