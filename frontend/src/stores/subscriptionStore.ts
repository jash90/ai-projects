import { create } from 'zustand'
import { SubscriptionTier, SubscriptionStatus, SubscriptionInfo, PlanConfig } from '@/types'
import { billingApi } from '@/lib/api'

interface SubscriptionState {
  subscription: SubscriptionInfo | null
  offerings: PlanConfig[]
  currentPlan: PlanConfig | null
  isLoading: boolean
  error: string | null

  fetchSubscription: () => Promise<void>
  fetchOfferings: () => Promise<void>
  reset: () => void
}

const TIER_ORDER: Record<SubscriptionTier, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
}

export const subscriptionStore = create<SubscriptionState>((set) => ({
  subscription: null,
  offerings: [],
  currentPlan: null,
  isLoading: false,
  error: null,

  fetchSubscription: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await billingApi.getSubscription()
      if (response.success && response.data) {
        set({
          subscription: response.data.subscription,
          currentPlan: response.data.plan,
          isLoading: false,
        })
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load subscription' })
    }
  },

  fetchOfferings: async () => {
    try {
      const response = await billingApi.getOfferings()
      if (response.success && response.data) {
        set({ offerings: response.data.offerings })
      }
    } catch {
      // Offerings are non-critical, silent fail
    }
  },

  reset: () => set({ subscription: null, offerings: [], currentPlan: null, isLoading: false, error: null }),
}))

// Selector hooks
export const useSubscription = () => subscriptionStore((s) => s.subscription)
export const useSubscriptionTier = (): SubscriptionTier => subscriptionStore((s) => s.subscription?.tier ?? 'starter')
export const useSubscriptionStatus = (): SubscriptionStatus => subscriptionStore((s) => s.subscription?.status ?? 'active')
export const useCurrentPlan = () => subscriptionStore((s) => s.currentPlan)
export const useOfferings = () => subscriptionStore((s) => s.offerings)
export const useIsPro = (): boolean => {
  const tier = subscriptionStore((s) => s.subscription?.tier)
  return tier === 'pro' || tier === 'enterprise'
}
export const useIsEnterprise = (): boolean => subscriptionStore((s) => s.subscription?.tier === 'enterprise')

/**
 * Check if current tier meets the required tier level
 */
export function hasTier(currentTier: SubscriptionTier | undefined, requiredTier: SubscriptionTier): boolean {
  return TIER_ORDER[currentTier ?? 'starter'] >= TIER_ORDER[requiredTier]
}
