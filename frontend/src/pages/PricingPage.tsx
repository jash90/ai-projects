import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/stores/subscriptionStore';
import { useAuth } from '@/stores/authStore';
import { BillingCycle, SubscriptionPlan } from '@/types';
import { CheckIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const PricingPage = () => {
  const { t } = useTranslation('subscription');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    plans,
    planName,
    isLoadingPlans,
    isProcessingCheckout,
    stripeConfigured,
    error,
    fetchPlans,
    fetchCurrentSubscription,
    createCheckout,
    clearError,
  } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    fetchPlans();
    if (isAuthenticated) {
      fetchCurrentSubscription();
    }
  }, [isAuthenticated]);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/pricing', planId: plan.id } });
      return;
    }

    if (plan.name === 'free') {
      navigate('/settings?tab=subscription');
      return;
    }

    if (plan.name === planName) {
      return;
    }

    const checkoutUrl = await createCheckout(plan.id, billingCycle);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    return billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  };

  const getMonthlyEquivalent = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      return (plan.price_yearly / 12).toFixed(2);
    }
    return plan.price_monthly.toFixed(2);
  };

  const getSavingsPercent = (plan: SubscriptionPlan) => {
    if (plan.price_monthly === 0) return 0;
    const yearlyMonthly = plan.price_yearly / 12;
    return Math.round((1 - yearlyMonthly / plan.price_monthly) * 100);
  };

  // Calculate maximum savings percentage across all paid plans
  const maxSavingsPercent = useMemo(() => {
    const paidPlans = plans.filter((p) => p.price_monthly > 0);
    if (paidPlans.length === 0) return 0;
    return Math.max(...paidPlans.map(getSavingsPercent));
  }, [plans]);

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    return isAuthenticated && plan.name === planName;
  };

  const canUpgrade = (plan: SubscriptionPlan) => {
    const levels = { free: 0, pro: 1, enterprise: 2 };
    const currentLevel = levels[planName as keyof typeof levels] ?? 0;
    const targetLevel = levels[plan.name as keyof typeof levels] ?? 0;
    return targetLevel > currentLevel;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('pricing.title', 'Choose Your Plan')}
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
            {t('pricing.subtitle', 'Select the perfect plan for your needs')}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-8 flex justify-center">
          <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('pricing.monthly', 'Monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('pricing.yearly', 'Yearly')}
              <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">
                {t('pricing.savePercent', 'Save up to {{percent}}%', { percent: maxSavingsPercent })}
              </span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-500 hover:text-red-700">
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {isLoadingPlans ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan);
              const isPopular = plan.name === 'pro';

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg ${
                    isPopular
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                      : 'border border-gray-200 dark:border-gray-700'
                  } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-blue-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                        <SparklesIcon className="w-4 h-4" />
                        {t('pricing.popular', 'Most Popular')}
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan Name */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {plan.display_name}
                    </h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mt-6">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ${getMonthlyEquivalent(plan)}
                        </span>
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          /{t('pricing.perMonth', 'month')}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && plan.price_monthly > 0 && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          ${getPrice(plan).toFixed(2)} {t('pricing.billedYearly', 'billed yearly')}
                          <span className="ml-2 text-green-600 dark:text-green-400">
                            ({t('pricing.save', 'Save')} {getSavingsPercent(plan)}%)
                          </span>
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div className="mt-6">
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isCurrent || isProcessingCheckout || !stripeConfigured}
                        variant={isCurrent ? 'outline' : isPopular ? 'gradient' : 'secondary'}
                        className="w-full"
                        isLoading={isProcessingCheckout}
                      >
                        {isCurrent
                          ? t('pricing.currentPlan', 'Current Plan')
                          : plan.name === 'free'
                          ? t('pricing.getStarted', 'Get Started Free')
                          : canUpgrade(plan)
                          ? t('pricing.upgrade', 'Upgrade')
                          : t('pricing.downgrade', 'Downgrade')}
                      </Button>
                    </div>

                    {/* Features */}
                    <ul className="mt-8 space-y-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stripe not configured warning */}
        {!isLoadingPlans && !stripeConfigured && (
          <div className="mt-8 text-center">
            <p className="text-amber-600 dark:text-amber-400">
              {t('pricing.stripeNotConfigured', 'Payment system is not configured yet. Please contact support.')}
            </p>
          </div>
        )}

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t('pricing.questions', 'Have questions?')}{' '}
            <a href="mailto:support@example.com" className="text-blue-500 hover:text-blue-600">
              {t('pricing.contactUs', 'Contact us')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
