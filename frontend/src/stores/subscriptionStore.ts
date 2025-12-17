import { create } from 'zustand';
import { subscriptionApi } from '@/lib/api';
import {
  SubscriptionPlan,
  UserSubscription,
  UserLimits,
  BillingCycle,
  SubscriptionHistoryEvent,
  LimitCheck,
} from '@/types';

interface SubscriptionState {
  // Data
  plans: SubscriptionPlan[];
  subscription: UserSubscription | null;
  limits: UserLimits | null;
  planName: string;
  isPaid: boolean;
  history: SubscriptionHistoryEvent[];
  usage: {
    projects: LimitCheck | null;
    agents: LimitCheck | null;
  };
  stripePublicKey: string | null;
  stripeConfigured: boolean;

  // UI State
  isLoading: boolean;
  isLoadingPlans: boolean;
  isLoadingHistory: boolean;
  isProcessingCheckout: boolean;
  error: string | null;
}

interface SubscriptionActions {
  // Fetch methods
  fetchPlans: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchLimits: () => Promise<void>;

  // Actions
  createCheckout: (planId: string, billingCycle: BillingCycle) => Promise<string | null>;
  openPortal: () => Promise<void>;
  cancelSubscription: (immediately?: boolean) => Promise<boolean>;
  resumeSubscription: () => Promise<boolean>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

const initialState: SubscriptionState = {
  plans: [],
  subscription: null,
  limits: null,
  planName: 'free',
  isPaid: false,
  history: [],
  usage: {
    projects: null,
    agents: null,
  },
  stripePublicKey: null,
  stripeConfigured: false,
  isLoading: false,
  isLoadingPlans: false,
  isLoadingHistory: false,
  isProcessingCheckout: false,
  error: null,
};

export const subscriptionStore = create<SubscriptionState & SubscriptionActions>((set, get) => ({
  ...initialState,

  fetchPlans: async () => {
    set({ isLoadingPlans: true, error: null });
    try {
      const response = await subscriptionApi.getPlans();
      if (response.success && response.data) {
        set({
          plans: response.data.plans,
          stripePublicKey: response.data.stripe_public_key || null,
          stripeConfigured: response.data.stripe_configured,
          isLoadingPlans: false,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch plans');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch plans';
      set({ error: message, isLoadingPlans: false });
    }
  },

  fetchCurrentSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await subscriptionApi.getCurrent();
      if (response.success && response.data) {
        set({
          subscription: response.data.subscription,
          limits: response.data.limits,
          planName: response.data.plan_name,
          isPaid: response.data.is_paid,
          isLoading: false,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch subscription');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
      set({ error: message, isLoading: false });
    }
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true, error: null });
    try {
      const response = await subscriptionApi.getHistory();
      if (response.success && response.data) {
        set({
          history: response.data.history,
          isLoadingHistory: false,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch subscription history');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subscription history';
      set({ error: message, isLoadingHistory: false });
    }
  },

  fetchLimits: async () => {
    try {
      const response = await subscriptionApi.getLimits();
      if (response.success && response.data) {
        set({
          limits: response.data.limits,
          usage: response.data.usage,
        });
      }
    } catch (error) {
      // Silently fail - limits are optional
    }
  },

  createCheckout: async (planId: string, billingCycle: BillingCycle) => {
    set({ isProcessingCheckout: true, error: null });
    try {
      const response = await subscriptionApi.createCheckout({
        plan_id: planId,
        billing_cycle: billingCycle,
      });

      if (response.success && response.data) {
        set({ isProcessingCheckout: false });
        return response.data.url;
      } else {
        throw new Error(response.error || 'Failed to create checkout session');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create checkout';
      set({ error: message, isProcessingCheckout: false });
      return null;
    }
  },

  openPortal: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await subscriptionApi.createPortal();
      if (response.success && response.data) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to open billing portal');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open billing portal';
      set({ error: message, isLoading: false });
    }
  },

  cancelSubscription: async (immediately = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await subscriptionApi.cancel(immediately);
      if (response.success) {
        await get().fetchCurrentSubscription();
        return true;
      } else {
        throw new Error(response.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  resumeSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await subscriptionApi.resume();
      if (response.success) {
        await get().fetchCurrentSubscription();
        return true;
      } else {
        throw new Error(response.error || 'Failed to resume subscription');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resume subscription';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));

// Hook for components
export const useSubscription = () => subscriptionStore();
