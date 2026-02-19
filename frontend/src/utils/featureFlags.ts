import { useState, useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * Check if a feature flag is enabled
 *
 * @param flagKey - The feature flag key (e.g., 'new-ui-enabled')
 * @returns boolean indicating if the flag is enabled
 */
export const checkFeatureFlag = (flagKey: string): boolean => {
  if (!posthog.__loaded) {
    console.warn('[Feature Flags] PostHog not loaded yet, returning false for:', flagKey);
    return false;
  }

  const isEnabled = posthog.isFeatureEnabled(flagKey) ?? false;
  console.log(`[Feature Flags] ${flagKey}:`, isEnabled);
  return isEnabled;
};

/**
 * Get the variant of a feature flag
 *
 * @param flagKey - The feature flag key
 * @returns The variant value (string, boolean, or undefined)
 */
export const getFeatureVariant = (flagKey: string): string | boolean | undefined => {
  if (!posthog.__loaded) {
    console.warn('[Feature Flags] PostHog not loaded yet, returning undefined for:', flagKey);
    return undefined;
  }

  return posthog.getFeatureFlag(flagKey);
};

/**
 * React hook for feature flags with automatic updates
 *
 * @param flagKey - The feature flag key
 * @returns boolean indicating if the flag is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isNewUIEnabled = useFeatureFlag('new-ui-enabled');
 *
 *   return (
 *     <div>
 *       {isNewUIEnabled ? <NewUI /> : <OldUI />}
 *     </div>
 *   );
 * }
 * ```
 */
export const useFeatureFlag = (flagKey: string): boolean => {
  const [enabled, setEnabled] = useState<boolean>(() => checkFeatureFlag(flagKey));

  useEffect(() => {
    // Initial check
    const isEnabled = checkFeatureFlag(flagKey);
    setEnabled(isEnabled);

    // Listen for flag changes from PostHog
    const unsubscribe = posthog.onFeatureFlags(() => {
      const newValue = checkFeatureFlag(flagKey);
      console.log(`[Feature Flags] ${flagKey} changed to:`, newValue);
      setEnabled(newValue);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [flagKey]);

  return enabled;
};

/**
 * React hook for feature flag variants with automatic updates
 *
 * @param flagKey - The feature flag key
 * @returns The variant value (string, boolean, or undefined)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const variant = useFeatureVariant('button-color');
 *
 *   return (
 *     <button className={variant === 'blue' ? 'bg-blue-500' : 'bg-gray-500'}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export const useFeatureVariant = (flagKey: string): string | boolean | undefined => {
  const [variant, setVariant] = useState<string | boolean | undefined>(() =>
    getFeatureVariant(flagKey)
  );

  useEffect(() => {
    // Initial check
    const currentVariant = getFeatureVariant(flagKey);
    setVariant(currentVariant);

    // Listen for flag changes from PostHog
    const unsubscribe = posthog.onFeatureFlags(() => {
      const newVariant = getFeatureVariant(flagKey);
      console.log(`[Feature Flags] ${flagKey} variant changed to:`, newVariant);
      setVariant(newVariant);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [flagKey]);

  return variant;
};

/**
 * Force a reload of all feature flags from PostHog
 *
 * Useful when you want to ensure flags are up-to-date,
 * for example after a user logs in or changes context.
 */
export const reloadFeatureFlags = async (): Promise<void> => {
  if (!posthog.__loaded) {
    console.warn('[Feature Flags] PostHog not loaded yet, cannot reload flags');
    return;
  }

  console.log('[Feature Flags] Reloading all feature flags...');
  await posthog.reloadFeatureFlags();
  console.log('[Feature Flags] Feature flags reloaded');
};

/**
 * Get all active feature flags for the current user
 *
 * Note: PostHog SDK doesn't provide a method to get all flags at once.
 * You need to check individual flags using checkFeatureFlag() or getFeatureVariant().
 *
 * @returns Empty object (placeholder)
 */
export const getAllFeatureFlags = (): Record<string, string | boolean> => {
  if (!posthog.__loaded) {
    console.warn('[Feature Flags] PostHog not loaded yet, returning empty object');
    return {};
  }

  console.warn('[Feature Flags] getAllFeatureFlags is not supported by PostHog SDK. Check individual flags using checkFeatureFlag()');
  return {};
};
