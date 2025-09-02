import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi, adminApi } from '@/lib/api';
import { useAuth } from '@/stores/authStore';

interface TokenLimits {
  globalLimit: number | null;
  monthlyLimit: number | null;
  globalUsage: number;
  monthlyUsage: number;
  isGlobalLimitExceeded: boolean;
  isMonthlyLimitExceeded: boolean;
  canSendMessage: boolean;
  remainingGlobalTokens: number | null;
  remainingMonthlyTokens: number | null;
}

export function useTokenLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<TokenLimits>({
    globalLimit: null,
    monthlyLimit: null,
    globalUsage: 0,
    monthlyUsage: 0,
    isGlobalLimitExceeded: false,
    isMonthlyLimitExceeded: false,
    canSendMessage: true,
    remainingGlobalTokens: null,
    remainingMonthlyTokens: null,
  });

  // Fetch user's current usage statistics
  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['user-usage'],
    queryFn: async () => {
      const response = await settingsApi.getUsage();
      if (response.success && response.data) {
        return response.data.stats;
      }
      throw new Error(response.error || 'Failed to fetch usage');
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch global token limits (fallback if user doesn't have individual limits)
  const { data: globalLimitsData } = useQuery({
    queryKey: ['global-token-limits'],
    queryFn: async () => {
      const response = await adminApi.getGlobalTokenLimits();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch global limits');
    },
    enabled: !!user,
    staleTime: 300000, // Global limits change rarely, cache for 5 minutes
  });

  useEffect(() => {
    if (!user || !usageData) {
      setLimits(prev => ({ ...prev, canSendMessage: false }));
      return;
    }

    // Determine effective limits (user-specific or global)
    const effectiveGlobalLimit = user.token_limit_global || globalLimitsData?.global || null;
    const effectiveMonthlyLimit = user.token_limit_monthly || globalLimitsData?.monthly || null;

    // Current usage
    const globalUsage = usageData.total_tokens || 0;
    const monthlyUsage = usageData.monthly_tokens || 0;

    // Check if limits are exceeded
    const isGlobalLimitExceeded = effectiveGlobalLimit !== null && effectiveGlobalLimit > 0 && globalUsage >= effectiveGlobalLimit;
    const isMonthlyLimitExceeded = effectiveMonthlyLimit !== null && effectiveMonthlyLimit > 0 && monthlyUsage >= effectiveMonthlyLimit;

    // Calculate remaining tokens
    const remainingGlobalTokens = effectiveGlobalLimit !== null && effectiveGlobalLimit > 0 
      ? Math.max(0, effectiveGlobalLimit - globalUsage) 
      : null;
    const remainingMonthlyTokens = effectiveMonthlyLimit !== null && effectiveMonthlyLimit > 0 
      ? Math.max(0, effectiveMonthlyLimit - monthlyUsage) 
      : null;

    // Can send message if neither limit is exceeded and user is active
    const canSendMessage = user.is_active && !isGlobalLimitExceeded && !isMonthlyLimitExceeded;

    setLimits({
      globalLimit: effectiveGlobalLimit,
      monthlyLimit: effectiveMonthlyLimit,
      globalUsage,
      monthlyUsage,
      isGlobalLimitExceeded,
      isMonthlyLimitExceeded,
      canSendMessage,
      remainingGlobalTokens,
      remainingMonthlyTokens,
    });
  }, [user, usageData, globalLimitsData]);

  // Function to manually refresh usage data
  const refreshUsage = () => {
    refetchUsage();
  };

  // Function to get limit status message
  const getLimitStatusMessage = (): string | null => {
    if (!user?.is_active) {
      return 'Your account is inactive. Please contact support.';
    }

    if (limits.isGlobalLimitExceeded && limits.isMonthlyLimitExceeded) {
      return 'Both global and monthly token limits have been exceeded.';
    }

    if (limits.isGlobalLimitExceeded) {
      return 'Global token limit has been exceeded.';
    }

    if (limits.isMonthlyLimitExceeded) {
      return 'Monthly token limit has been exceeded.';
    }

    // Warning when approaching limits (90% threshold)
    if (limits.globalLimit && limits.remainingGlobalTokens !== null) {
      const globalUsagePercent = (limits.globalUsage / limits.globalLimit) * 100;
      if (globalUsagePercent >= 90) {
        return `Approaching global token limit: ${limits.remainingGlobalTokens} tokens remaining.`;
      }
    }

    if (limits.monthlyLimit && limits.remainingMonthlyTokens !== null) {
      const monthlyUsagePercent = (limits.monthlyUsage / limits.monthlyLimit) * 100;
      if (monthlyUsagePercent >= 90) {
        return `Approaching monthly token limit: ${limits.remainingMonthlyTokens} tokens remaining.`;
      }
    }

    return null;
  };

  // Function to get progress percentages
  const getProgressPercentages = () => {
    const globalProgress = limits.globalLimit && limits.globalLimit > 0 
      ? Math.min(100, (limits.globalUsage / limits.globalLimit) * 100)
      : 0;
    
    const monthlyProgress = limits.monthlyLimit && limits.monthlyLimit > 0 
      ? Math.min(100, (limits.monthlyUsage / limits.monthlyLimit) * 100)
      : 0;

    return { globalProgress, monthlyProgress };
  };

  return {
    ...limits,
    refreshUsage,
    getLimitStatusMessage,
    getProgressPercentages,
    isLoading: !usageData,
  };
}
