import Stripe from 'stripe';
import config from '../utils/config';
import { SubscriptionModel } from '../models/Subscription';
import { UserModel } from '../models/User';
import { BillingCycle, SubscriptionStatus } from '../types';
import logger from '../utils/logger';
import { pool } from '../database/connection';

// Initialize Stripe client
const stripe = config.stripe.secret_key
  ? new Stripe(config.stripe.secret_key)
  : null;

// Log Stripe initialization mode
if (stripe) {
  logger.info(`Stripe initialized in ${config.stripe.mode.toUpperCase()} mode`);
} else {
  logger.warn('Stripe not initialized - missing secret key');
}

function getStripeClient(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

export class StripeService {
  /**
   * Get or create a Stripe customer for a user
   */
  static async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const stripeClient = getStripeClient();

    // Check if user already has a Stripe customer ID
    const subscription = await SubscriptionModel.getUserSubscription(userId);
    if (subscription?.stripe_customer_id) {
      return subscription.stripe_customer_id;
    }

    // Search for existing customer by email
    const existingCustomers = await stripeClient.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customerId = existingCustomers.data[0].id;
      // Store the customer ID
      await SubscriptionModel.updateSubscription(userId, {
        stripeCustomerId: customerId,
      });
      return customerId;
    }

    // Create new customer
    const user = await UserModel.findById(userId);
    const customer = await stripeClient.customers.create({
      email,
      name: user?.username,
      metadata: {
        user_id: userId,
      },
    });

    // Store the customer ID
    const freePlan = await SubscriptionModel.getPlanByName('free');
    if (freePlan) {
      await SubscriptionModel.createSubscription({
        userId,
        planId: freePlan.id,
        stripeCustomerId: customer.id,
        status: 'active',
      });
    }

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(params: {
    userId: string;
    email: string;
    planId: string;
    billingCycle: BillingCycle;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    const stripeClient = getStripeClient();

    // Get the plan
    const plan = await SubscriptionModel.getPlanById(params.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get the price ID based on billing cycle
    const priceId = params.billingCycle === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly;

    if (!priceId) {
      throw new Error(`No Stripe price configured for ${plan.name} ${params.billingCycle} plan`);
    }

    // Get or create customer
    const customerId = await this.getOrCreateCustomer(params.userId, params.email);

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      metadata: {
        user_id: params.userId,
        plan_id: params.planId,
        billing_cycle: params.billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: params.userId,
          plan_id: params.planId,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session');
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create a customer portal session for subscription management
   */
  static async createPortalSession(params: {
    userId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const stripeClient = getStripeClient();

    const subscription = await SubscriptionModel.getUserSubscription(params.userId);
    if (!subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer found for this user');
    }

    const session = await stripeClient.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    userId: string,
    immediately = false
  ): Promise<void> {
    const stripeClient = getStripeClient();

    const subscription = await SubscriptionModel.getUserSubscription(userId);
    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    if (immediately) {
      // Cancel immediately
      await stripeClient.subscriptions.cancel(subscription.stripe_subscription_id);

      // Update local subscription
      await SubscriptionModel.updateSubscription(userId, {
        status: 'canceled',
        canceledAt: new Date(),
      });

      // Revert to free plan
      const freePlan = await SubscriptionModel.getPlanByName('free');
      if (freePlan) {
        await SubscriptionModel.updateSubscription(userId, {
          planId: freePlan.id,
        });
      }

      // Log event
      await SubscriptionModel.logSubscriptionEvent({
        userId,
        subscriptionId: subscription.id,
        eventType: 'canceled',
        fromPlanId: subscription.plan_id,
        details: { immediate: true },
      });
    } else {
      // Cancel at period end
      await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await SubscriptionModel.updateSubscription(userId, {
        cancelAtPeriodEnd: true,
      });

      await SubscriptionModel.logSubscriptionEvent({
        userId,
        subscriptionId: subscription.id,
        eventType: 'canceled',
        details: { cancel_at_period_end: true },
      });
    }
  }

  /**
   * Resume a canceled subscription (before period end)
   */
  static async resumeSubscription(userId: string): Promise<void> {
    const stripeClient = getStripeClient();

    const subscription = await SubscriptionModel.getUserSubscription(userId);
    if (!subscription?.stripe_subscription_id) {
      throw new Error('No subscription found');
    }

    if (!subscription.cancel_at_period_end) {
      throw new Error('Subscription is not scheduled for cancellation');
    }

    await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await SubscriptionModel.updateSubscription(userId, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    await SubscriptionModel.logSubscriptionEvent({
      userId,
      subscriptionId: subscription.id,
      eventType: 'reactivated',
    });
  }

  /**
   * Update subscription plan (upgrade/downgrade)
   */
  static async updateSubscriptionPlan(
    userId: string,
    newPlanId: string,
    billingCycle?: BillingCycle
  ): Promise<void> {
    const stripeClient = getStripeClient();

    const subscription = await SubscriptionModel.getUserSubscription(userId);
    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    const newPlan = await SubscriptionModel.getPlanById(newPlanId);
    if (!newPlan) {
      throw new Error('Plan not found');
    }

    const cycle = billingCycle || subscription.billing_cycle;
    const newPriceId = cycle === 'yearly'
      ? newPlan.stripe_price_id_yearly
      : newPlan.stripe_price_id_monthly;

    if (!newPriceId) {
      throw new Error(`No Stripe price configured for ${newPlan.name} ${cycle} plan`);
    }

    // Get current subscription items
    const stripeSubscription = await stripeClient.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Update subscription with new price
    await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    const oldPlanId = subscription.plan_id;
    const eventType = this.comparePlanLevel(subscription.plan?.name || 'free', newPlan.name) > 0
      ? 'downgraded'
      : 'upgraded';

    await SubscriptionModel.updateSubscription(userId, {
      planId: newPlanId,
      stripePriceId: newPriceId,
      billingCycle: cycle,
    });

    await SubscriptionModel.logSubscriptionEvent({
      userId,
      subscriptionId: subscription.id,
      eventType,
      fromPlanId: oldPlanId,
      toPlanId: newPlanId,
    });
  }

  // ==================== Webhook Idempotency Helpers ====================

  /**
   * Check if a webhook event was already processed
   */
  private static async isEventProcessed(eventId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM stripe_processed_events WHERE event_id = $1',
      [eventId]
    );
    return result.rows.length > 0;
  }

  /**
   * Mark a webhook event as processed
   */
  private static async markEventProcessed(
    eventId: string,
    eventType: string,
    processingTimeMs: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await pool.query(
      `INSERT INTO stripe_processed_events (event_id, event_type, processing_time_ms, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, processingTimeMs, JSON.stringify(metadata || {})]
    );
  }

  /**
   * Handle Stripe webhook events with idempotency
   */
  static async handleWebhookEvent(
    payload: Buffer,
    signature: string
  ): Promise<{ received: boolean; type: string }> {
    const startTime = Date.now();
    const stripeClient = getStripeClient();

    if (!config.stripe.webhook_secret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhook_secret
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      throw new Error('Webhook signature verification failed');
    }

    // Idempotency check: Skip if event was already processed
    if (await this.isEventProcessed(event.id)) {
      logger.info(`Webhook event ${event.id} (${event.type}) already processed, skipping`);
      return { received: true, type: event.type };
    }

    logger.info(`Processing Stripe webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark event as successfully processed
      const processingTimeMs = Date.now() - startTime;
      await this.markEventProcessed(event.id, event.type, processingTimeMs);
      logger.info(`Webhook ${event.id} processed in ${processingTimeMs}ms`);
    } catch (error) {
      // Log but don't mark as processed so it can be retried
      logger.error(`Error processing webhook ${event.id}:`, error);
      throw error;
    }

    return { received: true, type: event.type };
  }

  // ==================== Private Webhook Handlers ====================

  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.client_reference_id || session.metadata?.user_id;
    const planId = session.metadata?.plan_id;
    const billingCycle = (session.metadata?.billing_cycle || 'monthly') as BillingCycle;

    if (!userId || !planId) {
      logger.error('Missing userId or planId in checkout session', { session });
      return;
    }

    const stripeSubscriptionId = session.subscription as string;

    await SubscriptionModel.createSubscription({
      userId,
      planId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId,
      billingCycle,
      status: 'active',
    });

    await SubscriptionModel.logSubscriptionEvent({
      userId,
      eventType: 'created',
      toPlanId: planId,
      stripeEventId: session.id,
      details: { billing_cycle: billingCycle },
    });

    logger.info(`Subscription created for user ${userId}, plan ${planId}`);
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.user_id;
    if (!userId) {
      // Try to find by customer ID
      const existingSub = await SubscriptionModel.getSubscriptionByStripeId(subscription.id);
      if (!existingSub) {
        logger.warn('Could not find user for subscription update', { subscriptionId: subscription.id });
        return;
      }
    }

    const targetUserId = userId || (await SubscriptionModel.getSubscriptionByStripeId(subscription.id))?.user_id;
    if (!targetUserId) return;

    // Map Stripe status to our status
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      trialing: 'trialing',
      paused: 'paused',
      unpaid: 'past_due',
    };

    const status = statusMap[subscription.status] || 'active';
    const priceId = subscription.items.data[0]?.price.id;

    // Find plan by price ID
    const plan = priceId ? await SubscriptionModel.getPlanByStripePrice(priceId) : null;

    // Handle subscription period timestamps (can be number or null in Stripe types)
    const periodStart = (subscription as unknown as { current_period_start?: number }).current_period_start;
    const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

    await SubscriptionModel.updateSubscription(targetUserId, {
      status,
      stripePriceId: priceId,
      stripeSubscriptionId: subscription.id,
      ...(periodStart && { currentPeriodStart: new Date(periodStart * 1000) }),
      ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000) }),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...(plan && { planId: plan.id }),
    });

    logger.info(`Subscription updated for user ${targetUserId}`, { status, priceId });
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const existingSub = await SubscriptionModel.getSubscriptionByStripeId(subscription.id);
    if (!existingSub) {
      logger.warn('Subscription not found for deletion', { subscriptionId: subscription.id });
      return;
    }

    const freePlan = await SubscriptionModel.getPlanByName('free');

    await SubscriptionModel.updateSubscription(existingSub.user_id, {
      status: 'canceled',
      canceledAt: new Date(),
      ...(freePlan && { planId: freePlan.id }),
    });

    await SubscriptionModel.logSubscriptionEvent({
      userId: existingSub.user_id,
      subscriptionId: existingSub.id,
      eventType: 'canceled',
      fromPlanId: existingSub.plan_id,
      toPlanId: freePlan?.id,
      stripeEventId: subscription.id,
    });

    logger.info(`Subscription deleted for user ${existingSub.user_id}`);
  }

  private static async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // subscription field exists on Invoice but may not be in all type versions
    // Use type assertion to access it safely
    const invoiceWithSub = invoice as unknown as { subscription?: string | { id: string } | null };
    const subscriptionId = typeof invoiceWithSub.subscription === 'string'
      ? invoiceWithSub.subscription
      : invoiceWithSub.subscription?.id;
    if (!subscriptionId) return;

    const subscription = await SubscriptionModel.getSubscriptionByStripeId(subscriptionId);
    if (!subscription) return;

    // Ensure subscription is marked as active
    await SubscriptionModel.updateSubscription(subscription.user_id, {
      status: 'active',
    });

    await SubscriptionModel.logSubscriptionEvent({
      userId: subscription.user_id,
      subscriptionId: subscription.id,
      eventType: 'renewed',
      stripeEventId: invoice.id,
      details: { amount_paid: invoice.amount_paid / 100 },
    });

    logger.info(`Invoice paid for user ${subscription.user_id}`);
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // subscription field exists on Invoice but may not be in all type versions
    // Use type assertion to access it safely
    const invoiceWithSub = invoice as unknown as { subscription?: string | { id: string } | null };
    const subscriptionId = typeof invoiceWithSub.subscription === 'string'
      ? invoiceWithSub.subscription
      : invoiceWithSub.subscription?.id;
    if (!subscriptionId) return;

    const subscription = await SubscriptionModel.getSubscriptionByStripeId(subscriptionId);
    if (!subscription) return;

    await SubscriptionModel.updateSubscription(subscription.user_id, {
      status: 'past_due',
    });

    await SubscriptionModel.logSubscriptionEvent({
      userId: subscription.user_id,
      subscriptionId: subscription.id,
      eventType: 'payment_failed',
      stripeEventId: invoice.id,
      details: { attempt_count: invoice.attempt_count },
    });

    logger.warn(`Payment failed for user ${subscription.user_id}`);
  }

  // ==================== Utility Methods ====================

  private static comparePlanLevel(planA: string, planB: string): number {
    const levels: Record<string, number> = {
      free: 0,
      pro: 1,
      enterprise: 2,
    };
    return (levels[planA] || 0) - (levels[planB] || 0);
  }

  /**
   * Check if Stripe is configured
   */
  static isConfigured(): boolean {
    return !!config.stripe.secret_key;
  }

  /**
   * Get Stripe public key for frontend
   */
  static getPublicKey(): string | undefined {
    return config.stripe.public_key;
  }

  // ==================== Admin Plan Management Methods ====================

  /**
   * Sync plan prices with Stripe (create or update)
   * Creates new Stripe Price objects and archives old ones if prices changed
   */
  static async syncPlanPrices(plan: {
    id: string;
    name: string;
    display_name: string;
    price_monthly: number;
    price_yearly: number;
    stripe_price_id_monthly?: string;
    stripe_price_id_yearly?: string;
  }): Promise<{
    success: boolean;
    price_id_monthly?: string;
    price_id_yearly?: string;
    errors?: string[];
    message?: string;
  }> {
    const stripeClient = getStripeClient();
    const errors: string[] = [];

    try {
      // Create a Stripe Product for this plan if it doesn't exist
      // We'll use the plan name as the product ID lookup key
      const products = await stripeClient.products.search({
        query: `metadata['plan_id']:'${plan.id}'`,
      });

      let product: Stripe.Product;

      if (products.data.length > 0) {
        product = products.data[0];
        // Update product details
        product = await stripeClient.products.update(product.id, {
          name: plan.display_name,
          active: true,
        });
      } else {
        // Create new product
        product = await stripeClient.products.create({
          name: plan.display_name,
          metadata: {
            plan_id: plan.id,
            plan_name: plan.name,
          },
        });
      }

      // Archive old prices if they exist (Stripe doesn't allow updating prices)
      if (plan.stripe_price_id_monthly) {
        try {
          await stripeClient.prices.update(plan.stripe_price_id_monthly, {
            active: false,
          });
        } catch (error) {
          logger.warn(`Failed to archive old monthly price: ${error}`);
        }
      }

      if (plan.stripe_price_id_yearly) {
        try {
          await stripeClient.prices.update(plan.stripe_price_id_yearly, {
            active: false,
          });
        } catch (error) {
          logger.warn(`Failed to archive old yearly price: ${error}`);
        }
      }

      // Create new prices
      let priceMonthly: Stripe.Price | null = null;
      let priceYearly: Stripe.Price | null = null;

      if (plan.price_monthly > 0) {
        try {
          priceMonthly = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.price_monthly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
            metadata: {
              plan_id: plan.id,
              plan_name: plan.name,
              billing_cycle: 'monthly',
            },
          });
        } catch (error) {
          errors.push(`Failed to create monthly price: ${(error as Error).message}`);
        }
      }

      if (plan.price_yearly > 0) {
        try {
          priceYearly = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.price_yearly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'year',
              interval_count: 1,
            },
            metadata: {
              plan_id: plan.id,
              plan_name: plan.name,
              billing_cycle: 'yearly',
            },
          });
        } catch (error) {
          errors.push(`Failed to create yearly price: ${(error as Error).message}`);
        }
      }

      // Update plan in database with new price IDs
      if (priceMonthly || priceYearly) {
        await SubscriptionModel.updatePlanStripePrices(
          plan.id,
          priceMonthly?.id,
          priceYearly?.id
        );
      }

      const success = errors.length === 0;
      const result = {
        success,
        price_id_monthly: priceMonthly?.id,
        price_id_yearly: priceYearly?.id,
        errors: errors.length > 0 ? errors : undefined,
        message: success
          ? 'Plan prices synced successfully with Stripe'
          : 'Partial sync completed with errors',
      };

      logger.info(`Stripe sync ${success ? 'successful' : 'partial'} for plan ${plan.name}`, {
        planId: plan.id,
        priceIdMonthly: priceMonthly?.id,
        priceIdYearly: priceYearly?.id,
        errors,
      });

      return result;
    } catch (error) {
      logger.error('Error syncing plan prices with Stripe:', error);
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to sync plan prices with Stripe',
      };
    }
  }
}
