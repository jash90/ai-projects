import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin, logAdminActivity } from '../../middleware/adminAuth';
import { validate } from '../../middleware/validation';
import { SubscriptionModel } from '../../models/Subscription';
import { StripeService } from '../../services/stripeService';
import { PlanCreate, PlanUpdate } from '../../types';
import Joi from 'joi';
import logger from '../../utils/logger';

const router: Router = Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Validation schemas
const createPlanSchema = Joi.object({
  name: Joi.string().min(1).max(50).required()
    .pattern(/^[a-z0-9-]+$/)
    .messages({
      'string.pattern.base': 'Plan name must be lowercase alphanumeric with hyphens only (e.g., "basic-plan")'
    }),
  display_name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  price_monthly: Joi.number().min(0).max(999999).required(),
  price_yearly: Joi.number().min(0).max(999999).required(),
  token_limit_monthly: Joi.number().integer().min(0).required(),
  token_limit_global: Joi.number().integer().min(0).optional().allow(null),
  max_projects: Joi.number().integer().min(0).optional().allow(null),
  max_agents: Joi.number().integer().min(0).optional().allow(null),
  max_file_size_mb: Joi.number().integer().min(1).max(1000).required(),
  features: Joi.array().items(Joi.string()).min(0).required(),
  priority_support: Joi.boolean().optional().default(false),
  sort_order: Joi.number().integer().min(0).optional().default(0),
});

const updatePlanSchema = Joi.object({
  display_name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  price_monthly: Joi.number().min(0).max(999999).optional(),
  price_yearly: Joi.number().min(0).max(999999).optional(),
  token_limit_monthly: Joi.number().integer().min(0).optional(),
  token_limit_global: Joi.number().integer().min(0).optional().allow(null),
  max_projects: Joi.number().integer().min(0).optional().allow(null),
  max_agents: Joi.number().integer().min(0).optional().allow(null),
  max_file_size_mb: Joi.number().integer().min(1).max(1000).optional(),
  features: Joi.array().items(Joi.string()).min(0).optional(),
  priority_support: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const updatePricesSchema = Joi.object({
  price_monthly: Joi.number().min(0).max(999999).required(),
  price_yearly: Joi.number().min(0).max(999999).required(),
});

/**
 * @swagger
 * /api/admin/subscriptions/plans:
 *   get:
 *     summary: Get all subscription plans
 *     tags: [Admin - Subscriptions]
 *     description: Retrieve all subscription plans including inactive ones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include inactive plans
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.include_inactive !== 'false';
    const plans = await SubscriptionModel.getPlans(includeInactive);

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching subscription plans for admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

/**
 * @swagger
 * /api/admin/subscriptions/plans:
 *   post:
 *     summary: Create new subscription plan
 *     tags: [Admin - Subscriptions]
 *     description: Create a new subscription plan (without Stripe sync)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlanCreate'
 *     responses:
 *       201:
 *         description: Plan created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Plan with this name already exists
 */
router.post('/plans',
  validate({ body: createPlanSchema }),
  logAdminActivity('create_subscription_plan'),
  async (req: Request, res: Response) => {
    try {
      const planData: PlanCreate = req.body;

      // Check if plan with this name already exists
      const existingPlan = await SubscriptionModel.getPlanByName(planData.name);
      if (existingPlan) {
        return res.status(409).json({
          success: false,
          error: `Plan with name "${planData.name}" already exists`
        });
      }

      const plan = await SubscriptionModel.createPlan(planData);

      logger.info(`Subscription plan created: ${plan.name} (${plan.id})`, {
        adminId: (req as any).user?.id,
        planId: plan.id,
      });

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Subscription plan created successfully. Use sync endpoint to create Stripe prices.'
      });
    } catch (error) {
      logger.error('Error creating subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription plan'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/subscriptions/plans/{planId}:
 *   put:
 *     summary: Update subscription plan
 *     tags: [Admin - Subscriptions]
 *     description: Update subscription plan details (does not update Stripe prices)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlanUpdate'
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Plan not found
 */
router.put('/plans/:planId',
  validate({ body: updatePlanSchema }),
  logAdminActivity('update_subscription_plan'),
  async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const updateData: PlanUpdate = req.body;

      const plan = await SubscriptionModel.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      const updatedPlan = await SubscriptionModel.updatePlan(planId, updateData);

      logger.info(`Subscription plan updated: ${plan.name} (${planId})`, {
        adminId: (req as any).user?.id,
        planId,
        updates: Object.keys(updateData),
      });

      res.json({
        success: true,
        data: updatedPlan,
        message: 'Plan updated successfully. If prices changed, use sync endpoint to update Stripe.'
      });
    } catch (error) {
      logger.error('Error updating subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription plan'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/subscriptions/plans/{planId}:
 *   delete:
 *     summary: Deactivate subscription plan
 *     tags: [Admin - Subscriptions]
 *     description: Soft delete (deactivate) a subscription plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Plan deactivated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Plan not found
 *       409:
 *         description: Cannot deactivate plan (has active users)
 */
router.delete('/plans/:planId',
  logAdminActivity('delete_subscription_plan'),
  async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;

      const plan = await SubscriptionModel.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Check if there are active users with this plan
      const hasActiveUsers = await SubscriptionModel.planHasActiveUsers(planId);
      if (hasActiveUsers) {
        return res.status(409).json({
          success: false,
          error: 'Cannot deactivate plan with active subscribers. Migrate users first.'
        });
      }

      await SubscriptionModel.deletePlan(planId);

      logger.info(`Subscription plan deactivated: ${plan.name} (${planId})`, {
        adminId: (req as any).user?.id,
        planId,
      });

      res.json({
        success: true,
        message: 'Plan deactivated successfully'
      });
    } catch (error) {
      logger.error('Error deleting subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete subscription plan'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/subscriptions/plans/{planId}/sync-stripe:
 *   post:
 *     summary: Sync plan with Stripe
 *     tags: [Admin - Subscriptions]
 *     description: Create or update Stripe prices for this plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Stripe sync successful
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Plan not found
 *       503:
 *         description: Stripe is not configured
 */
router.post('/plans/:planId/sync-stripe',
  logAdminActivity('sync_plan_stripe'),
  async (req: Request, res: Response) => {
    try {
      if (!StripeService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
        });
      }

      const { planId } = req.params;

      const plan = await SubscriptionModel.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      const result = await StripeService.syncPlanPrices(plan);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to sync with Stripe',
          details: result.errors
        });
      }

      logger.info(`Plan synced with Stripe: ${plan.name} (${planId})`, {
        adminId: (req as any).user?.id,
        planId,
        priceIdMonthly: result.price_id_monthly,
        priceIdYearly: result.price_id_yearly,
      });

      res.json({
        success: true,
        data: result,
        message: 'Plan successfully synced with Stripe'
      });
    } catch (error) {
      logger.error('Error syncing plan with Stripe:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync with Stripe',
        details: (error as Error).message
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/subscriptions/plans/{planId}/prices:
 *   put:
 *     summary: Update plan prices
 *     tags: [Admin - Subscriptions]
 *     description: Update plan prices and optionally sync with Stripe
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sync_stripe
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to sync prices with Stripe immediately
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price_monthly
 *               - price_yearly
 *             properties:
 *               price_monthly:
 *                 type: number
 *               price_yearly:
 *                 type: number
 *     responses:
 *       200:
 *         description: Prices updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Plan not found
 */
router.put('/plans/:planId/prices',
  validate({ body: updatePricesSchema }),
  logAdminActivity('update_plan_prices'),
  async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const { price_monthly, price_yearly } = req.body;
      const syncStripe = req.query.sync_stripe === 'true';

      const plan = await SubscriptionModel.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Update prices
      const updatedPlan = await SubscriptionModel.updatePlan(planId, {
        price_monthly,
        price_yearly,
      });

      let stripeResult = null;
      if (syncStripe && StripeService.isConfigured()) {
        stripeResult = await StripeService.syncPlanPrices(updatedPlan!);
      }

      logger.info(`Plan prices updated: ${plan.name} (${planId})`, {
        adminId: (req as any).user?.id,
        planId,
        priceMonthly: price_monthly,
        priceYearly: price_yearly,
        stripeSynced: !!stripeResult?.success,
      });

      res.json({
        success: true,
        data: updatedPlan,
        stripe_sync: stripeResult || { message: 'Stripe sync not requested' },
        message: `Prices updated successfully${syncStripe ? ' and synced with Stripe' : ''}`
      });
    } catch (error) {
      logger.error('Error updating plan prices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update plan prices'
      });
    }
  }
);

export default router;
