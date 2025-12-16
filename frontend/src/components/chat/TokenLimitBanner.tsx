import { useTranslation } from 'react-i18next'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useTokenLimits } from '@/hooks/useTokenLimits';
import { cn } from '@/lib/utils';

interface TokenLimitBannerProps {
  className?: string;
}

export function TokenLimitBanner({ className }: TokenLimitBannerProps) {
  const { t } = useTranslation('chat')
  const {
    canSendMessage, 
    getLimitStatusMessage, 
    getProgressPercentages,
    isGlobalLimitExceeded,
    isMonthlyLimitExceeded,
    globalLimit,
    monthlyLimit,
    remainingGlobalTokens,
    remainingMonthlyTokens
  } = useTokenLimits();

  const statusMessage = getLimitStatusMessage();
  const { globalProgress, monthlyProgress } = getProgressPercentages();

  // Don't show banner if no limits are set or no issues
  if (!statusMessage && canSendMessage && globalProgress < 80 && monthlyProgress < 80) {
    return null;
  }

  const isError = isGlobalLimitExceeded || isMonthlyLimitExceeded;
  const isWarning = !isError && (globalProgress >= 90 || monthlyProgress >= 90);

  const getIcon = () => {
    if (isError) return AlertCircle;
    if (isWarning) return AlertTriangle;
    return Info;
  };

  const Icon = getIcon();

  const getBannerStyles = () => {
    if (isError) {
      return 'bg-destructive/10 border-destructive/20 text-destructive';
    }
    if (isWarning) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-200';
    }
    return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-200';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border text-sm',
      getBannerStyles(),
      className
    )}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        {statusMessage && (
          <p className="font-medium">{statusMessage}</p>
        )}
        
        {/* Progress indicators */}
        {(globalLimit || monthlyLimit) && (
          <div className="space-y-2">
            {globalLimit && globalLimit > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{t('limits.global')}</span>
                  <span>{remainingGlobalTokens !== null ? t('limits.remaining', { count: remainingGlobalTokens, formatted: formatNumber(remainingGlobalTokens) }) : ''}</span>
                </div>
                <div className="w-full bg-current/10 rounded-full h-1.5">
                  <div 
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      isGlobalLimitExceeded ? 'bg-current' : 'bg-current/60'
                    )}
                    style={{ width: `${Math.min(100, globalProgress)}%` }}
                  />
                </div>
              </div>
            )}
            
            {monthlyLimit && monthlyLimit > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{t('limits.monthly')}</span>
                  <span>{remainingMonthlyTokens !== null ? t('limits.remaining', { count: remainingMonthlyTokens, formatted: formatNumber(remainingMonthlyTokens) }) : ''}</span>
                </div>
                <div className="w-full bg-current/10 rounded-full h-1.5">
                  <div 
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      isMonthlyLimitExceeded ? 'bg-current' : 'bg-current/60'
                    )}
                    style={{ width: `${Math.min(100, monthlyProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
