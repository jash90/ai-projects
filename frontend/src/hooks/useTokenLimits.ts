import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usageApi } from '@/lib/api';
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

  // Fetch user's current usage statistics from optimized endpoint
  const { data: usageData, refetch: refetchUsage, isLoading: queryLoading } = useQuery({
    queryKey: ['user-usage-current'],
    queryFn: async () => {
      const response = await usageApi.getCurrentUsage();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error((response as any).error || 'Failed to fetch usage');
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  useEffect(() => {
    if (!user) {
      setLimits(prev => ({ ...prev, canSendMessage: false }));
      return;
    }

    if (!usageData) {
      // While loading, allow sending (backend will block if needed)
      setLimits(prev => ({ ...prev, canSendMessage: user.is_active }));
      return;
    }

    // Data comes pre-calculated from the backend
    const { totalTokens, monthlyTokens, limits: usageLimits, remaining } = usageData;

    // Check if limits are exceeded (remaining === 0 means exceeded)
    const isGlobalLimitExceeded = usageLimits.globalLimit > 0 && remaining.global === 0;
    const isMonthlyLimitExceeded = usageLimits.monthlyLimit > 0 && remaining.monthly === 0;

    // Can send message if neither limit is exceeded and user is active
    const canSendMessage = user.is_active && !isGlobalLimitExceeded && !isMonthlyLimitExceeded;

    setLimits({
      globalLimit: usageLimits.globalLimit,
      monthlyLimit: usageLimits.monthlyLimit,
      globalUsage: totalTokens,
      monthlyUsage: monthlyTokens,
      isGlobalLimitExceeded,
      isMonthlyLimitExceeded,
      canSendMessage,
      remainingGlobalTokens: remaining.global === -1 ? null : remaining.global,
      remainingMonthlyTokens: remaining.monthly === -1 ? null : remaining.monthly,
    });
  }, [user, usageData]);

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
        return `Approaching global token limit: ${limits.remainingGlobalTokens.toLocaleString()} tokens remaining.`;
      }
    }

    if (limits.monthlyLimit && limits.remainingMonthlyTokens !== null) {
      const monthlyUsagePercent = (limits.monthlyUsage / limits.monthlyLimit) * 100;
      if (monthlyUsagePercent >= 90) {
        return `Approaching monthly token limit: ${limits.remainingMonthlyTokens.toLocaleString()} tokens remaining.`;
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
    isLoading: queryLoading,
  };
}
