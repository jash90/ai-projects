import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkoutLimiter } from '../middleware/rateLimiting';
import { SubscriptionModel } from '../models/Subscription';
import { StripeService } from '../services/stripeService';
import { CreateCheckoutRequest } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await SubscriptionModel.getPlans();

    // Add Stripe public key to response for frontend
    res.json({
      success: true,
      data: {
        plans,
        stripe_public_key: StripeService.getPublicKey(),
        stripe_configured: StripeService.isConfigured(),
      },
    });
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans',
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current user's subscription
 */
router.get('/current', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = await SubscriptionModel.getUserSubscription(userId);
    const limits = await SubscriptionModel.getUserLimits(userId);
    const planName = await SubscriptionModel.getUserPlanName(userId);

    res.json({
      success: true,
      data: {
        subscription,
        limits,
        plan_name: planName,
        is_paid: planName !== 'free',
      },
    });
  } catch (error) {
    logger.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Create a Stripe checkout session
 * Rate limited: 3 attempts per minute per user
 */
router.post('/checkout', authenticateToken, checkoutLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const { plan_id, billing_cycle, success_url, cancel_url } = req.body as CreateCheckoutRequest;

    if (!plan_id || !billing_cycle) {
      return res.status(400).json({
        success: false,
        error: 'plan_id and billing_cycle are required',
      });
    }

    if (!StripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Payment system is not configured',
      });
    }

    // Validate plan exists and is not free
    const plan = await SubscriptionModel.getPlanById(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    if (plan.name === 'free') {
      return res.status(400).json({
        success: false,
        error: 'Cannot checkout free plan',
      });
    }

    const session = await StripeService.createCheckoutSession({
      userId,
      email,
      planId: plan_id,
      billingCycle: billing_cycle,
      successUrl: success_url || `${config.frontend_url}/settings?tab=subscription&status=success`,
      cancelUrl: cancel_url || `${config.frontend_url}/pricing?status=canceled`,
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/subscriptions/portal
 * Create a Stripe customer portal session
 */
router.post('/portal', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { return_url } = req.body;

    if (!StripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Payment system is not configured',
      });
    }

    const session = await StripeService.createPortalSession({
      userId,
      returnUrl: return_url || `${config.frontend_url}/settings?tab=subscription`,
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating portal session:', error);

    // Check if it's a "no customer" error
    if (message.includes('No Stripe customer')) {
      return res.status(400).json({
        success: false,
        error: 'No billing information found. Please subscribe to a plan first.',
      });
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel the current subscription
 */
router.post('/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { immediately } = req.body;

    if (!StripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Payment system is not configured',
      });
    }

    await StripeService.cancelSubscription(userId, immediately === true);

    res.json({
      success: true,
      message: immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/subscriptions/resume
 * Resume a canceled subscription
 */
router.post('/resume', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!StripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Payment system is not configured',
      });
    }

    await StripeService.resumeSubscription(userId);

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/subscriptions/history
 * Get subscription history for the current user
 */
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await SubscriptionModel.getSubscriptionHistory(userId, limit);

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    logger.error('Error fetching subscription history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history',
    });
  }
});

/**
 * GET /api/subscriptions/limits
 * Get current user's subscription limits
 */
router.get('/limits', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const limits = await SubscriptionModel.getUserLimits(userId);
    const projectLimit = await SubscriptionModel.checkProjectLimit(userId);
    const agentLimit = await SubscriptionModel.checkAgentLimit(userId);

    res.json({
      success: true,
      data: {
        limits,
        usage: {
          projects: projectLimit,
          agents: agentLimit,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching subscription limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription limits',
    });
  }
});

export default router;
