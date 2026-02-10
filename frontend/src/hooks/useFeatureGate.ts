import { useSubscriptionTier } from '@/stores/subscriptionStore'
import { SubscriptionTier } from '@/types'
import { hasTier } from '@/stores/subscriptionStore'

type Feature = 'priority_models' | 'unlimited_projects' | 'custom_agents'

const FEATURE_REQUIREMENTS: Record<Feature, SubscriptionTier> = {
  priority_models: 'pro',
  unlimited_projects: 'enterprise',
  custom_agents: 'pro',
}

export function useFeatureGate() {
  const currentTier = useSubscriptionTier()

  return {
    currentTier,

    /**
     * Check if the current tier meets the required tier
     */
    hasTier: (required: SubscriptionTier) => hasTier(currentTier, required),

    /**
     * Check if a specific feature is accessible
     */
    canAccessFeature: (feature: Feature) => {
      const requiredTier = FEATURE_REQUIREMENTS[feature]
      return hasTier(currentTier, requiredTier)
    },

    /**
     * Get the required tier for a feature
     */
    getRequiredTier: (feature: Feature) => FEATURE_REQUIREMENTS[feature],
  }
}
