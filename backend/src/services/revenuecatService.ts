import config from '../utils/config';
import logger from '../utils/logger';
import { SubscriptionTier, PlanConfig } from '../types';

/**
 * Plan configuration — single source of truth for tier limits and features.
 * Token limits are the same regardless of monthly/annual billing period.
 */
export const PLAN_CONFIGS: Record<SubscriptionTier, PlanConfig> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyTokenLimit: 100000,
    globalTokenLimit: 1000000,
    maxProjects: 5,
    priorityModels: false,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 30,
    annualPrice: 300,
    monthlyTokenLimit: 500000,
    globalTokenLimit: 5000000,
    maxProjects: 25,
    priorityModels: true,
    entitlementId: 'pro_access',
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 100,
    annualPrice: 1000,
    monthlyTokenLimit: 0, // 0 = unlimited
    globalTokenLimit: 0,  // 0 = unlimited
    maxProjects: 0,       // 0 = unlimited
    priorityModels: true,
    entitlementId: 'enterprise_access',
  },
};

/**
 * Maps RevenueCat product store identifiers to subscription tiers.
 */
export const PRODUCT_MAP: Record<string, SubscriptionTier> = {
  'price_1SYTRkRxElaHK1PFisz0Hctj': 'pro',        // pro monthly
  'price_1Sz69JRxElaHK1PFKIxQv0z9': 'pro',        // pro annual
  'price_1SYTSZRxElaHK1PFn8JSaLVi': 'enterprise',  // enterprise monthly
  'price_1Sz69LRxElaHK1PFtzQFpi82': 'enterprise',  // enterprise annual
};

export class RevenueCatService {
  private static readonly RC_API_BASE = 'https://api.revenuecat.com/v2';

  /**
   * Make an authenticated request to RevenueCat API v2
   */
  private static async rcFetch(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.RC_API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${config.revenuecat.api_key}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('RevenueCat API error', { path, status: response.status, body: errorBody });
      throw new Error(`RevenueCat API error: ${response.status} ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Get active entitlements for a customer
   */
  static async getCustomerEntitlements(customerId: string): Promise<any[]> {
    try {
      const data = await this.rcFetch(
        `/projects/${config.revenuecat.project_id}/customers/${customerId}/active_entitlements`
      );
      return data.items || [];
    } catch (error) {
      logger.error('Failed to get customer entitlements', { customerId, error });
      return [];
    }
  }

  /**
   * Determine highest tier from active entitlements
   */
  static determineTierFromEntitlements(entitlements: any[]): SubscriptionTier {
    const lookupKeys = entitlements.map(e => e.entitlement?.lookup_key || e.lookup_key).filter(Boolean);

    if (lookupKeys.includes('enterprise_access')) return 'enterprise';
    if (lookupKeys.includes('pro_access')) return 'pro';
    return 'starter';
  }

  /**
   * Get token limits for a specific tier
   */
  static getTokenLimitsForTier(tier: SubscriptionTier): { monthlyLimit: number; globalLimit: number } {
    const plan = PLAN_CONFIGS[tier];
    return {
      monthlyLimit: plan.monthlyTokenLimit,
      globalLimit: plan.globalTokenLimit,
    };
  }

  /**
   * Ensure a RevenueCat customer exists for the given user
   */
  static async ensureCustomer(userId: string): Promise<string> {
    try {
      // RevenueCat auto-creates customers on first reference using the app_user_id
      const data = await this.rcFetch(
        `/projects/${config.revenuecat.project_id}/customers/${userId}`
      );
      return data.id || userId;
    } catch (error) {
      // If 404, customer doesn't exist yet — that's fine, RC creates on purchase
      logger.warn('Customer not found in RevenueCat, will be created on purchase', { userId });
      return userId;
    }
  }

  /**
   * Verify webhook authorization header
   */
  static verifyWebhookSignature(authHeader: string | undefined): boolean {
    if (!config.revenuecat.webhook_secret) {
      logger.warn('REVENUECAT_WEBHOOK_SECRET not configured');
      return false;
    }

    if (!authHeader) return false;

    const expectedToken = config.revenuecat.webhook_secret;
    const providedToken = authHeader.replace('Bearer ', '');

    return providedToken === expectedToken;
  }

  /**
   * Get the customer portal management URL
   */
  static async getManagementUrl(customerId: string): Promise<string | null> {
    try {
      const data = await this.rcFetch(
        `/projects/${config.revenuecat.project_id}/customers/${customerId}`
      );
      return data.management_url || null;
    } catch (error) {
      logger.error('Failed to get management URL', { customerId, error });
      return null;
    }
  }
}
