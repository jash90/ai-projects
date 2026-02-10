import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiting';
import { UserModel } from '../models/User';
import { SubscriptionEventModel } from '../models/SubscriptionEvent';
import { RevenueCatService, PLAN_CONFIGS, PRODUCT_MAP } from '../services/revenuecatService';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * GET /api/billing/subscription
 * Get current user's subscription info + plan config
 */
router.get('/subscription', authenticateToken, async (req: Request, res: Response) => {
  try {
    const subscriptionInfo = await UserModel.getSubscriptionInfo(req.user!.id);
    const planConfig = PLAN_CONFIGS[subscriptionInfo.tier];

    res.json({
      success: true,
      data: {
        subscription: subscriptionInfo,
        plan: planConfig,
      },
    });
  } catch (error) {
    logger.error('Error getting subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to get subscription info' });
  }
});

/**
 * GET /api/billing/offerings
 * Get available plans (public endpoint, no auth required)
 */
router.get('/offerings', async (_req: Request, res: Response) => {
  try {
    const offerings = Object.values(PLAN_CONFIGS);
    res.json({
      success: true,
      data: { offerings },
    });
  } catch (error) {
    logger.error('Error getting offerings:', error);
    res.status(500).json({ success: false, error: 'Failed to get offerings' });
  }
});

/**
 * POST /api/billing/customer
 * Ensure RevenueCat customer exists, return customer_id
 */
router.post('/customer', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const customerId = await RevenueCatService.ensureCustomer(userId);

    // Store the customer ID if not already set
    const user = await UserModel.findById(userId);
    if (user && !user.revenuecat_customer_id) {
      await UserModel.updateSubscription(
        userId,
        user.subscription_tier || 'starter',
        user.subscription_status || 'active',
        customerId
      );
    }

    res.json({
      success: true,
      data: { customer_id: customerId },
    });
  } catch (error) {
    logger.error('Error ensuring customer:', error);
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

/**
 * GET /api/billing/portal
 * Get customer portal management URL
 */
router.get('/portal', authenticateToken, async (req: Request, res: Response) => {
  try {
    const subscriptionInfo = await UserModel.getSubscriptionInfo(req.user!.id);

    if (!subscriptionInfo.revenuecat_customer_id) {
      return res.status(400).json({
        success: false,
        error: 'No subscription found. Please subscribe to a plan first.',
      });
    }

    const managementUrl = await RevenueCatService.getManagementUrl(subscriptionInfo.revenuecat_customer_id);

    if (!managementUrl) {
      return res.status(404).json({
        success: false,
        error: 'Management portal not available',
      });
    }

    res.json({
      success: true,
      data: { url: managementUrl },
    });
  } catch (error) {
    logger.error('Error getting portal URL:', error);
    res.status(500).json({ success: false, error: 'Failed to get portal URL' });
  }
});

/**
 * POST /api/billing/webhook
 * RevenueCat webhook receiver — processes subscription events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const authHeader = req.headers['authorization'] as string | undefined;
    if (!RevenueCatService.verifyWebhookSignature(authHeader)) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.event?.type || event.type;
    const appUserId = event.event?.app_user_id || event.app_user_id;
    const productId = event.event?.product_id || event.product_id;
    const price = event.event?.price;
    const currency = event.event?.currency;

    logger.info('Received RevenueCat webhook', { eventType, appUserId, productId });

    // Find the user by RC customer ID or app_user_id (which is our user UUID)
    let user = await UserModel.findByRevenueCatCustomerId(appUserId);
    if (!user) {
      // The app_user_id might be the user's UUID directly
      user = await UserModel.findById(appUserId);
    }

    // Log the event regardless of whether we find the user
    await SubscriptionEventModel.create({
      user_id: user?.id,
      revenuecat_customer_id: appUserId,
      event_type: eventType,
      product_id: productId,
      price: price ? parseFloat(price) : undefined,
      currency,
      raw_payload: event,
    });

    if (!user) {
      logger.warn('User not found for webhook event', { appUserId, eventType });
      // Return 200 to acknowledge receipt — don't want RC to retry
      return res.json({ success: true, message: 'Event logged, user not found' });
    }

    // Determine the tier from the product ID
    const tier = productId ? PRODUCT_MAP[productId] : undefined;

    // Process event based on type
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        if (tier) {
          await UserModel.updateSubscription(user.id, tier, 'active', appUserId);
          logger.info('Subscription upgraded', { userId: user.id, tier, eventType });
        }
        break;

      case 'PRODUCT_CHANGE':
        if (tier) {
          await UserModel.updateSubscription(user.id, tier, 'active', appUserId);
          logger.info('Subscription changed', { userId: user.id, tier, eventType });
        }
        break;

      case 'CANCELLATION':
        await UserModel.updateSubscription(
          user.id,
          user.subscription_tier || 'starter',
          'cancelled',
          appUserId
        );
        logger.info('Subscription cancelled', { userId: user.id, eventType });
        break;

      case 'EXPIRATION':
        await UserModel.updateSubscription(user.id, 'starter', 'active', appUserId);
        logger.info('Subscription expired, downgraded to starter', { userId: user.id, eventType });
        break;

      case 'BILLING_ISSUE':
        await UserModel.updateSubscription(
          user.id,
          user.subscription_tier || 'starter',
          'billing_issue',
          appUserId
        );
        logger.info('Billing issue detected', { userId: user.id, eventType });
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType, appUserId });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    // Return 200 to prevent retries on server errors
    res.json({ success: true, error: 'Internal processing error' });
  }
});

export default router;
