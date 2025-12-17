import { pool } from '../database/connection';
import {
  SubscriptionPlan,
  UserSubscription,
  SubscriptionHistoryEvent,
  UserLimits,
  LimitCheck,
  BillingCycle,
  SubscriptionStatus,
} from '../types';
import logger from '../utils/logger';

export class SubscriptionModel {
  // ==================== Plan Methods ====================

  static async getPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
    const query = `
      SELECT
        id, name, display_name, description,
        stripe_price_id_monthly, stripe_price_id_yearly,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        features, max_projects, max_agents, max_file_size_mb,
        priority_support, is_active, sort_order,
        created_at, updated_at
      FROM subscription_plans
      ${includeInactive ? '' : 'WHERE is_active = true'}
      ORDER BY sort_order ASC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      features: row.features || [],
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: parseFloat(row.price_yearly),
    }));
  }

  static async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const query = `
      SELECT
        id, name, display_name, description,
        stripe_price_id_monthly, stripe_price_id_yearly,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        features, max_projects, max_agents, max_file_size_mb,
        priority_support, is_active, sort_order,
        created_at, updated_at
      FROM subscription_plans
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      features: row.features || [],
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: parseFloat(row.price_yearly),
    };
  }

  static async getPlanByName(name: string): Promise<SubscriptionPlan | null> {
    const query = `
      SELECT
        id, name, display_name, description,
        stripe_price_id_monthly, stripe_price_id_yearly,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        features, max_projects, max_agents, max_file_size_mb,
        priority_support, is_active, sort_order,
        created_at, updated_at
      FROM subscription_plans
      WHERE name = $1
    `;

    const result = await pool.query(query, [name]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      features: row.features || [],
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: parseFloat(row.price_yearly),
    };
  }

  static async getPlanByStripePrice(priceId: string): Promise<SubscriptionPlan | null> {
    const query = `
      SELECT
        id, name, display_name, description,
        stripe_price_id_monthly, stripe_price_id_yearly,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        features, max_projects, max_agents, max_file_size_mb,
        priority_support, is_active, sort_order,
        created_at, updated_at
      FROM subscription_plans
      WHERE stripe_price_id_monthly = $1 OR stripe_price_id_yearly = $1
    `;

    const result = await pool.query(query, [priceId]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      features: row.features || [],
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: parseFloat(row.price_yearly),
    };
  }

  static async updatePlanStripePrices(
    planId: string,
    monthlyPriceId?: string,
    yearlyPriceId?: string
  ): Promise<void> {
    const fields: string[] = [];
    const values: (string | undefined)[] = [];
    let paramCount = 1;

    if (monthlyPriceId !== undefined) {
      fields.push(`stripe_price_id_monthly = $${paramCount++}`);
      values.push(monthlyPriceId);
    }

    if (yearlyPriceId !== undefined) {
      fields.push(`stripe_price_id_yearly = $${paramCount++}`);
      values.push(yearlyPriceId);
    }

    if (fields.length === 0) return;

    values.push(planId);
    const query = `
      UPDATE subscription_plans
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
    `;

    await pool.query(query, values);
  }

  // ==================== User Subscription Methods ====================

  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const query = `
      SELECT
        us.id, us.user_id, us.plan_id,
        us.stripe_customer_id, us.stripe_subscription_id, us.stripe_price_id,
        us.status, us.billing_cycle,
        us.current_period_start, us.current_period_end,
        us.cancel_at_period_end, us.canceled_at,
        us.trial_start, us.trial_end,
        us.metadata, us.created_at, us.updated_at,
        sp.name as plan_name, sp.display_name as plan_display_name,
        sp.token_limit_monthly, sp.token_limit_global,
        sp.max_projects, sp.max_agents, sp.max_file_size_mb,
        sp.features, sp.priority_support
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      stripe_price_id: row.stripe_price_id,
      status: row.status as SubscriptionStatus,
      billing_cycle: row.billing_cycle as BillingCycle,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end,
      canceled_at: row.canceled_at,
      trial_start: row.trial_start,
      trial_end: row.trial_end,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      plan: {
        id: row.plan_id,
        name: row.plan_name,
        display_name: row.plan_display_name,
        token_limit_monthly: row.token_limit_monthly,
        token_limit_global: row.token_limit_global,
        max_projects: row.max_projects,
        max_agents: row.max_agents,
        max_file_size_mb: row.max_file_size_mb,
        features: row.features || [],
        priority_support: row.priority_support,
        price_monthly: 0,
        price_yearly: 0,
        is_active: true,
        sort_order: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    };
  }

  static async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | null> {
    const query = `
      SELECT
        us.id, us.user_id, us.plan_id,
        us.stripe_customer_id, us.stripe_subscription_id, us.stripe_price_id,
        us.status, us.billing_cycle,
        us.current_period_start, us.current_period_end,
        us.cancel_at_period_end, us.canceled_at,
        us.trial_start, us.trial_end,
        us.metadata, us.created_at, us.updated_at
      FROM user_subscriptions us
      WHERE us.stripe_subscription_id = $1
    `;

    const result = await pool.query(query, [stripeSubscriptionId]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      status: row.status as SubscriptionStatus,
      billing_cycle: row.billing_cycle as BillingCycle,
    };
  }

  static async getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<UserSubscription | null> {
    const query = `
      SELECT
        us.id, us.user_id, us.plan_id,
        us.stripe_customer_id, us.stripe_subscription_id, us.stripe_price_id,
        us.status, us.billing_cycle,
        us.current_period_start, us.current_period_end,
        us.cancel_at_period_end, us.canceled_at,
        us.trial_start, us.trial_end,
        us.metadata, us.created_at, us.updated_at
      FROM user_subscriptions us
      WHERE us.stripe_customer_id = $1
    `;

    const result = await pool.query(query, [stripeCustomerId]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      status: row.status as SubscriptionStatus,
      billing_cycle: row.billing_cycle as BillingCycle,
    };
  }

  static async createSubscription(data: {
    userId: string;
    planId: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    status?: SubscriptionStatus;
    billingCycle?: BillingCycle;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }): Promise<UserSubscription> {
    const query = `
      INSERT INTO user_subscriptions (
        user_id, plan_id, stripe_customer_id, stripe_subscription_id,
        stripe_price_id, status, billing_cycle,
        current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, user_subscriptions.stripe_customer_id),
        stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_subscriptions.stripe_subscription_id),
        stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, user_subscriptions.stripe_price_id),
        status = EXCLUDED.status,
        billing_cycle = EXCLUDED.billing_cycle,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.userId,
      data.planId,
      data.stripeCustomerId || null,
      data.stripeSubscriptionId || null,
      data.stripePriceId || null,
      data.status || 'active',
      data.billingCycle || 'monthly',
      data.currentPeriodStart || null,
      data.currentPeriodEnd || null,
    ]);

    // Also update user's subscription_plan_id
    await pool.query(
      'UPDATE users SET subscription_plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [data.planId, data.userId]
    );

    return result.rows[0];
  }

  static async updateSubscription(
    userId: string,
    data: Partial<{
      planId: string;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      stripePriceId: string;
      status: SubscriptionStatus;
      billingCycle: BillingCycle;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      canceledAt: Date | null;
      trialEnd: Date | null;
      metadata: Record<string, unknown>;
    }>
  ): Promise<UserSubscription | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    const fieldMappings: Record<string, string> = {
      planId: 'plan_id',
      stripeCustomerId: 'stripe_customer_id',
      stripeSubscriptionId: 'stripe_subscription_id',
      stripePriceId: 'stripe_price_id',
      status: 'status',
      billingCycle: 'billing_cycle',
      currentPeriodStart: 'current_period_start',
      currentPeriodEnd: 'current_period_end',
      cancelAtPeriodEnd: 'cancel_at_period_end',
      canceledAt: 'canceled_at',
      trialEnd: 'trial_end',
      metadata: 'metadata',
    };

    for (const [key, column] of Object.entries(fieldMappings)) {
      if (data[key as keyof typeof data] !== undefined) {
        fields.push(`${column} = $${paramCount++}`);
        const value = data[key as keyof typeof data];
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
      }
    }

    if (fields.length === 0) {
      return this.getUserSubscription(userId);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `
      UPDATE user_subscriptions
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Also update user's subscription_plan_id if planId changed
    if (data.planId) {
      await pool.query(
        'UPDATE users SET subscription_plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [data.planId, userId]
      );
    }

    return result.rows[0] || null;
  }

  static async deleteSubscription(userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get free plan ID
      const freePlanResult = await client.query(
        "SELECT id FROM subscription_plans WHERE name = 'free'"
      );
      const freePlanId = freePlanResult.rows[0]?.id;

      // Delete subscription
      await client.query('DELETE FROM user_subscriptions WHERE user_id = $1', [userId]);

      // Set user back to free plan
      if (freePlanId) {
        await client.query(
          'UPDATE users SET subscription_plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [freePlanId, userId]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting subscription:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== History Methods ====================

  static async logSubscriptionEvent(event: {
    userId: string;
    subscriptionId?: string;
    eventType: SubscriptionHistoryEvent['event_type'];
    fromPlanId?: string;
    toPlanId?: string;
    stripeEventId?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const query = `
      INSERT INTO subscription_history (
        user_id, subscription_id, event_type,
        from_plan_id, to_plan_id, stripe_event_id, details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      event.userId,
      event.subscriptionId || null,
      event.eventType,
      event.fromPlanId || null,
      event.toPlanId || null,
      event.stripeEventId || null,
      event.details ? JSON.stringify(event.details) : null,
    ]);
  }

  static async getSubscriptionHistory(
    userId: string,
    limit = 50
  ): Promise<SubscriptionHistoryEvent[]> {
    const query = `
      SELECT
        sh.id, sh.user_id, sh.subscription_id, sh.event_type,
        sh.from_plan_id, sh.to_plan_id, sh.stripe_event_id,
        sh.details, sh.created_at,
        fp.name as from_plan_name,
        tp.name as to_plan_name
      FROM subscription_history sh
      LEFT JOIN subscription_plans fp ON sh.from_plan_id = fp.id
      LEFT JOIN subscription_plans tp ON sh.to_plan_id = tp.id
      WHERE sh.user_id = $1
      ORDER BY sh.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  // ==================== Limits Methods ====================

  static async getUserLimits(userId: string): Promise<UserLimits> {
    const query = `
      SELECT
        sp.token_limit_monthly,
        sp.token_limit_global,
        sp.max_projects,
        sp.max_agents,
        sp.max_file_size_mb
      FROM users u
      LEFT JOIN subscription_plans sp ON u.subscription_plan_id = sp.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (!result.rows[0] || !result.rows[0].token_limit_monthly) {
      // Fall back to free plan limits
      const freePlan = await this.getPlanByName('free');
      if (freePlan) {
        return {
          token_limit_monthly: freePlan.token_limit_monthly,
          token_limit_global: freePlan.token_limit_global,
          max_projects: freePlan.max_projects,
          max_agents: freePlan.max_agents,
          max_file_size_mb: freePlan.max_file_size_mb,
        };
      }
      // Ultimate fallback
      return {
        token_limit_monthly: 50000,
        token_limit_global: 500000,
        max_projects: 3,
        max_agents: 2,
        max_file_size_mb: 20,
      };
    }

    return result.rows[0];
  }

  static async checkProjectLimit(userId: string): Promise<LimitCheck> {
    const limits = await this.getUserLimits(userId);

    if (limits.max_projects === null || limits.max_projects === undefined) {
      return { allowed: true, current: 0, max: null };
    }

    const countQuery = 'SELECT COUNT(*) as count FROM projects WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [userId]);
    const current = parseInt(countResult.rows[0].count, 10);

    return {
      allowed: current < limits.max_projects,
      current,
      max: limits.max_projects,
      message: current >= limits.max_projects
        ? `Project limit reached (${current}/${limits.max_projects}). Upgrade your plan to create more projects.`
        : undefined,
    };
  }

  static async checkAgentLimit(userId: string): Promise<LimitCheck> {
    const limits = await this.getUserLimits(userId);

    if (limits.max_agents === null || limits.max_agents === undefined) {
      return { allowed: true, current: 0, max: null };
    }

    // Count agents across all user's projects
    const countQuery = `
      SELECT COUNT(*) as count
      FROM agents a
      JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = $1
    `;
    const countResult = await pool.query(countQuery, [userId]);
    const current = parseInt(countResult.rows[0].count, 10);

    return {
      allowed: current < limits.max_agents,
      current,
      max: limits.max_agents,
      message: current >= limits.max_agents
        ? `Agent limit reached (${current}/${limits.max_agents}). Upgrade your plan to create more agents.`
        : undefined,
    };
  }

  // ==================== Utility Methods ====================

  static async getUserPlanName(userId: string): Promise<string> {
    const query = `
      SELECT sp.name
      FROM users u
      LEFT JOIN subscription_plans sp ON u.subscription_plan_id = sp.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0]?.name || 'free';
  }

  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
    return activeStatuses.includes(subscription.status);
  }

  static async isPaidUser(userId: string): Promise<boolean> {
    const planName = await this.getUserPlanName(userId);
    return planName !== 'free';
  }

  // ==================== Admin Plan Management Methods ====================

  static async createPlan(data: {
    name: string;
    display_name: string;
    description?: string;
    price_monthly: number;
    price_yearly: number;
    token_limit_monthly: number;
    token_limit_global?: number;
    max_projects?: number;
    max_agents?: number;
    max_file_size_mb: number;
    features: string[];
    priority_support?: boolean;
    sort_order?: number;
  }): Promise<SubscriptionPlan> {
    const query = `
      INSERT INTO subscription_plans (
        name, display_name, description,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        max_projects, max_agents, max_file_size_mb,
        features, priority_support, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id, name, display_name, description,
        stripe_price_id_monthly, stripe_price_id_yearly,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        features, max_projects, max_agents, max_file_size_mb,
        priority_support, is_active, sort_order,
        created_at, updated_at
    `;

    const result = await pool.query(query, [
      data.name,
      data.display_name,
      data.description || null,
      data.price_monthly,
      data.price_yearly,
      data.token_limit_monthly,
      data.token_limit_global || null,
      data.max_projects || null,
      data.max_agents || null,
      data.max_file_size_mb,
      JSON.stringify(data.features),
      data.priority_support || false,
      data.sort_order || 0,
    ]);

    const row = result.rows[0];
    return {
      ...row,
      features: row.features || [],
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: parseFloat(row.price_yearly),
    };
  }

  static async updatePlan(
    planId: string,
    data: {
      display_name?: string;
      description?: string;
      price_monthly?: number;
      price_yearly?: number;
      token_limit_monthly?: number;
      token_limit_global?: number;
      max_projects?: number;
      max_agents?: number;
      max_file_size_mb?: number;
      features?: string[];
      priority_support?: boolean;
      sort_order?: number;
      is_active?: boolean;
    }
  ): Promise<SubscriptionPlan | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    const fieldMappings: Record<string, string> = {
      display_name: 'display_name',
      description: 'description',
      price_monthly: 'price_monthly',
      price_yearly: 'price_yearly',
      token_limit_monthly: 'token_limit_monthly',
      token_limit_global: 'token_limit_global',
      max_projects: 'max_projects',
      max_agents: 'max_agents',
      max_file_size_mb: 'max_file_size_mb',
      features: 'features',
      priority_support: 'priority_support',
      sort_order: 'sort_order',
      is_active: 'is_active',
    };

    for (const [key, column] of Object.entries(fieldMappings)) {
      if (data[key as keyof typeof data] !== undefined) {
        fields.push(`${column} = $${paramCount++}`);
        const value = data[key as keyof typeof data];
        values.push(key === 'features' ? JSON.stringify(value) : value);
      }
    }

    if (fields.length === 0) {
      return this.getPlanById(planId);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(planId);

    const query = `
      UPDATE subscription_plans
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id, name, display_name, description,
        stripe_price_id_monthly, stripe_price_id_yearly,
        price_monthly, price_yearly,
        token_limit_monthly, token_limit_global,
        features, max_projects, max_agents, max_file_size_mb,
        priority_support, is_active, sort_order,
        created_at, updated_at
    `;

    const result = await pool.query(query, values);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      features: row.features || [],
      price_monthly: parseFloat(row.price_monthly),
      price_yearly: parseFloat(row.price_yearly),
    };
  }

  static async deletePlan(planId: string): Promise<boolean> {
    // Soft delete by setting is_active = false
    const query = `
      UPDATE subscription_plans
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [planId]);
    return result.rows.length > 0;
  }

  static async planHasActiveUsers(planId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_subscriptions
      WHERE plan_id = $1
        AND status IN ('active', 'trialing')
    `;

    const result = await pool.query(query, [planId]);
    return parseInt(result.rows[0].count, 10) > 0;
  }
}
