import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Lock,
  Palette,
  BarChart3,
  Save,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Bell,
  Mail,
  Shield,
  Coins,
  FolderOpen,
  Check,
  Globe,
  CreditCard,
  ExternalLink,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { settingsApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { uiStore } from '@/stores/uiStore'
import { useSubscription } from '@/stores/subscriptionStore'
import { UserPreferences } from '@/types'
import { formatNumber, formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings')
  const { t: tSub } = useTranslation('subscription')
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'subscription' | 'usage'>('profile')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Subscription store
  const {
    subscription,
    planName,
    isPaid,
    history,
    isLoading: isLoadingSubscription,
    fetchCurrentSubscription,
    fetchHistory,
    openPortal,
    cancelSubscription,
    resumeSubscription,
    error: subscriptionError,
    clearError: clearSubscriptionError,
  } = useSubscription()

  // Fetch subscription data when subscription tab is active
  useEffect(() => {
    if (activeTab === 'subscription') {
      fetchCurrentSubscription()
      fetchHistory()
    }
  }, [activeTab])

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Queries
  const { data: preferencesData } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: () => settingsApi.getPreferences(),
  })

  const { data: usageData } = useQuery({
    queryKey: ['user-usage'],
    queryFn: () => settingsApi.getUsage(),
  })

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: (response) => {
      if (response.data?.user) {
        updateUser(response.data.user)
        toast.success(t('profile.updateSuccess'))
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('profile.updateError'))
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: settingsApi.updatePassword,
    onSuccess: () => {
      toast.success(t('security.updateSuccess'))
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('security.updateError'))
    },
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: settingsApi.updatePreferences,
    onSuccess: () => {
      toast.success(t('preferences.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
    onError: () => {
      toast.error(t('preferences.updateError'))
    },
  })

  const preferences = preferencesData?.data?.preferences
  const usage = usageData?.data?.stats

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (profileForm.username.trim() && profileForm.email.trim()) {
      updateProfileMutation.mutate({
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      })
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(t('security.passwordMismatch'))
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error(t('security.passwordTooShort'))
      return
    }
    updatePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    })
  }

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    const updatedPreferences = { ...preferences, [key]: value }
    updatePreferencesMutation.mutate(updatedPreferences)

    // Natychmiast zaaplikuj theme do UI
    if (key === 'theme') {
      uiStore.getState().setTheme(value)
    }
  }

  const tabs = [
    { id: 'profile', label: t('tabs.profile'), icon: User },
    { id: 'security', label: t('tabs.security'), icon: Lock },
    { id: 'preferences', label: t('tabs.preferences'), icon: Palette },
    { id: 'subscription', label: t('tabs.subscription'), icon: CreditCard },
    { id: 'usage', label: t('tabs.usage'), icon: BarChart3 },
  ]

  // Calculate usage percentage
  const monthlyUsagePercent = usage?.monthly_tokens && user?.token_limit_monthly
    ? Math.min((usage.monthly_tokens / user.token_limit_monthly) * 100, 100)
    : 0
  const globalUsagePercent = usage?.total_tokens && user?.token_limit_global
    ? Math.min((usage.total_tokens / user.token_limit_global) * 100, 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        showBackButton={true}
        backTo="/dashboard"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'profile' | 'security' | 'preferences' | 'subscription' | 'usage')}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t('profile.title')}</CardTitle>
                    <CardDescription>{t('profile.description')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  {/* Avatar placeholder */}
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user?.username}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} size="sm" className="mt-1">
                        {user?.role === 'admin' ? t('profile.role.admin') : t('profile.role.user')}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('profile.username')}</label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg text-sm bg-background border border-input transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary hover:border-muted-foreground/30"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('profile.email')}</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg text-sm bg-background border border-input transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary hover:border-muted-foreground/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <Button
                      type="submit"
                      variant="gradient"
                      isLoading={updateProfileMutation.isPending}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      {t('profile.saveChanges')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setProfileForm({
                          username: user?.username || '',
                          email: user?.email || '',
                        })
                      }
                    >
                      {t('profile.reset')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle>{t('security.title')}</CardTitle>
                    <CardDescription>{t('security.description')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <PasswordField
                    label={t('security.currentPassword')}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    show={showPasswords.current}
                    onToggle={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  />

                  <PasswordField
                    label={t('security.newPassword')}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    show={showPasswords.new}
                    onToggle={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    minLength={6}
                  />

                  <PasswordField
                    label={t('security.confirmPassword')}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    show={showPasswords.confirm}
                    onToggle={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    minLength={6}
                    error={
                      passwordForm.new_password &&
                      passwordForm.confirm_password &&
                      passwordForm.new_password !== passwordForm.confirm_password
                        ? t('security.passwordsDoNotMatch')
                        : undefined
                    }
                  />

                  <div className="flex items-center gap-3 pt-4">
                    <Button
                      type="submit"
                      variant="warning"
                      disabled={
                        updatePasswordMutation.isPending ||
                        passwordForm.new_password !== passwordForm.confirm_password
                      }
                      isLoading={updatePasswordMutation.isPending}
                      leftIcon={<Lock className="w-4 h-4" />}
                    >
                      {t('security.updatePassword')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                        setShowPasswords({ current: false, new: false, confirm: false })
                      }}
                    >
                      {t('security.clear')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Theme Settings */}
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                      <Palette className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle>{t('preferences.appearance.title')}</CardTitle>
                      <CardDescription>{t('preferences.appearance.description')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-foreground">{t('preferences.appearance.theme')}</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', label: t('preferences.appearance.light'), icon: Sun },
                        { id: 'dark', label: t('preferences.appearance.dark'), icon: Moon },
                        { id: 'system', label: t('preferences.appearance.system'), icon: Monitor },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handlePreferenceChange('theme', theme.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 border rounded-xl transition-all duration-200',
                            preferences?.theme === theme.id
                              ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/30 hover:bg-muted/50'
                          )}
                        >
                          <theme.icon className="w-5 h-5" />
                          <span className="text-sm font-medium">{theme.label}</span>
                          {preferences?.theme === theme.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language Settings */}
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('preferences.language.title')}</CardTitle>
                      <CardDescription>{t('preferences.language.description')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <LanguageSelector variant="grid" />
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <CardTitle>{t('preferences.notifications.title')}</CardTitle>
                      <CardDescription>{t('preferences.notifications.description')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleSetting
                    icon={<Bell className="w-4 h-4" />}
                    title={t('preferences.notifications.push.title')}
                    description={t('preferences.notifications.push.description')}
                    enabled={preferences?.notifications_enabled}
                    onChange={() =>
                      handlePreferenceChange('notifications_enabled', !preferences?.notifications_enabled)
                    }
                  />

                  <ToggleSetting
                    icon={<Mail className="w-4 h-4" />}
                    title={t('preferences.notifications.email.title')}
                    description={t('preferences.notifications.email.description')}
                    enabled={preferences?.email_notifications}
                    onChange={() =>
                      handlePreferenceChange('email_notifications', !preferences?.email_notifications)
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              {/* Error Message */}
              {subscriptionError && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
                  <span>{subscriptionError}</span>
                  <button onClick={clearSubscriptionError} className="text-destructive hover:opacity-70">
                    &times;
                  </button>
                </div>
              )}

              {/* Current Plan Card */}
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{tSub('settings.title')}</CardTitle>
                      <CardDescription>{tSub('settings.description')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSubscription ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-6 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-10 bg-muted rounded w-40" />
                    </div>
                  ) : isPaid && subscription ? (
                    <div className="space-y-6">
                      {/* Plan Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs">{tSub('settings.planName')}</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground capitalize">{planName}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs">{tSub('settings.status')}</span>
                          </div>
                          <Badge
                            variant={
                              subscription.status === 'active'
                                ? 'success'
                                : subscription.status === 'canceled'
                                ? 'destructive'
                                : subscription.status === 'past_due'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {tSub(`status.${subscription.status}`)}
                          </Badge>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">{tSub('settings.billingCycle')}</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">
                            {tSub(`cycle.${subscription.billing_cycle}`)}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs">
                              {subscription.cancel_at_period_end
                                ? tSub('settings.cancelAt')
                                : tSub('settings.nextBilling')}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">
                            {subscription.current_period_end
                              ? new Date(subscription.current_period_end).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={() => openPortal()}
                          leftIcon={<ExternalLink className="w-4 h-4" />}
                        >
                          {tSub('settings.manageBilling')}
                        </Button>
                        {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                          <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setShowCancelModal(true)}
                            data-testid="cancel-subscription-button"
                          >
                            {tSub('settings.cancelSubscription')}
                          </Button>
                        )}
                        {subscription.cancel_at_period_end && (
                          <Button
                            variant="secondary"
                            onClick={() => resumeSubscription()}
                          >
                            {tSub('settings.resumeSubscription')}
                          </Button>
                        )}
                        <Button
                          variant="gradient"
                          onClick={() => navigate('/pricing')}
                          leftIcon={<Sparkles className="w-4 h-4" />}
                        >
                          {tSub('settings.viewPlans')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Free Plan */
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {tSub('settings.freePlan')}
                        </h3>
                        <p className="text-muted-foreground mt-1">
                          {tSub('settings.freePlanDescription')}
                        </p>
                      </div>
                      <Button
                        variant="gradient"
                        onClick={() => navigate('/pricing')}
                        leftIcon={<Sparkles className="w-4 h-4" />}
                      >
                        {tSub('settings.upgradeNow')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscription History Card */}
              {history.length > 0 && (
                <Card variant="bordered">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle>{tSub('settings.history')}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {history.slice(0, 5).map((event, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-sm text-foreground">
                              {event.event_type === 'created' && tSub('history.subscribed', { plan: event.to_plan_name || planName })}
                              {event.event_type === 'upgraded' && tSub('history.upgraded', { plan: event.to_plan_name || planName })}
                              {event.event_type === 'downgraded' && tSub('history.downgraded', { plan: event.to_plan_name || planName })}
                              {event.event_type === 'canceled' && tSub('history.canceled')}
                              {event.event_type === 'reactivated' && tSub('history.resumed')}
                              {event.event_type === 'renewed' && tSub('history.renewed')}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* Token Usage Card */}
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <CardTitle>{t('usage.stats.title')}</CardTitle>
                      <CardDescription>{t('usage.stats.description')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {usage ? (
                    <div className="space-y-6">
                      {/* Progress Bars */}
                      <div className="space-y-4">
                        {user?.token_limit_monthly && (
                          <UsageProgressBar
                            label={t('usage.stats.monthlyUsage')}
                            current={usage.monthly_tokens}
                            limit={user.token_limit_monthly}
                            percent={monthlyUsagePercent}
                            percentUsedLabel={t('usage.stats.percentUsed', { percent: monthlyUsagePercent.toFixed(1) })}
                          />
                        )}
                        {user?.token_limit_global && (
                          <UsageProgressBar
                            label={t('usage.stats.totalUsage')}
                            current={usage.total_tokens}
                            limit={user.token_limit_global}
                            percent={globalUsagePercent}
                            percentUsedLabel={t('usage.stats.percentUsed', { percent: globalUsagePercent.toFixed(1) })}
                          />
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatItem
                          icon={<BarChart3 className="w-4 h-4" />}
                          label={t('usage.stats.totalTokens')}
                          value={formatNumber(usage.total_tokens)}
                        />
                        <StatItem
                          icon={<Coins className="w-4 h-4" />}
                          label={t('usage.stats.totalCost')}
                          value={formatCurrency(usage.total_cost)}
                        />
                        <StatItem
                          icon={<BarChart3 className="w-4 h-4" />}
                          label={t('usage.stats.thisMonth')}
                          value={formatNumber(usage.monthly_tokens)}
                        />
                        <StatItem
                          icon={<Coins className="w-4 h-4" />}
                          label={t('usage.stats.monthlyCost')}
                          value={formatCurrency(usage.monthly_cost)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">{t('usage.stats.loading')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Account Info Card */}
              <Card variant="bordered">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('usage.account.title')}</CardTitle>
                      <CardDescription>{t('usage.account.description')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <StatItem
                      icon={<FolderOpen className="w-4 h-4" />}
                      label={t('usage.account.projects')}
                      value={usage?.project_count?.toString() || '0'}
                    />
                    <StatItem
                      icon={<Shield className="w-4 h-4" />}
                      label={t('usage.account.role')}
                      value={user?.role === 'admin' ? t('profile.role.admin') : t('profile.role.user')}
                      highlight={user?.role === 'admin'}
                    />
                    {user?.token_limit_global && (
                      <StatItem
                        icon={<BarChart3 className="w-4 h-4" />}
                        label={t('usage.account.globalLimit')}
                        value={formatNumber(user.token_limit_global)}
                      />
                    )}
                    {user?.token_limit_monthly && (
                      <StatItem
                        icon={<BarChart3 className="w-4 h-4" />}
                        label={t('usage.account.monthlyLimit')}
                        value={formatNumber(user.token_limit_monthly)}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      <Dialog
        open={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {tSub('settings.cancelSubscription')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {tSub('settings.cancelConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
            >
              {tSub('settings.keepSubscription')}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                setIsCancelling(true)
                try {
                  await cancelSubscription(false)
                  setShowCancelModal(false)
                } finally {
                  setIsCancelling(false)
                }
              }}
              disabled={isCancelling}
            >
              {tSub('settings.cancelAtPeriodEnd')}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsCancelling(true)
                try {
                  await cancelSubscription(true)
                  setShowCancelModal(false)
                } finally {
                  setIsCancelling(false)
                }
              }}
              disabled={isCancelling}
              data-testid="cancel-modal"
            >
              {tSub('settings.cancelImmediate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Password Field Component
interface PasswordFieldProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean
  onToggle: () => void
  minLength?: number
  error?: string
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChange,
  show,
  onToggle,
  minLength,
  error,
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className={cn(
          'w-full h-10 px-3 pr-10 rounded-lg text-sm bg-background border transition-all duration-200',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20',
          error
            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
            : 'border-input focus:border-primary hover:border-muted-foreground/30'
        )}
        minLength={minLength}
        required
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    {error && (
      <p className="text-xs text-destructive flex items-center gap-1">
        <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
        {error}
      </p>
    )}
  </div>
)

// Toggle Setting Component
interface ToggleSettingProps {
  icon: React.ReactNode
  title: string
  description: string
  enabled?: boolean
  onChange: () => void
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ icon, title, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <button
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        enabled ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  </div>
)

// Usage Progress Bar Component
interface UsageProgressBarProps {
  label: string
  current: number
  limit: number
  percent: number
  percentUsedLabel?: string
}

const UsageProgressBar: React.FC<UsageProgressBarProps> = ({ label, current, limit, percent, percentUsedLabel }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {formatNumber(current)} / {formatNumber(limit)}
      </span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          percent >= 90 ? 'bg-destructive' : percent >= 70 ? 'bg-warning' : 'bg-success'
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
    <p className="text-xs text-muted-foreground">{percentUsedLabel || `${percent.toFixed(1)}% used`}</p>
  </div>
)

// Stat Item Component
interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, highlight }) => (
  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className={cn('text-lg font-semibold', highlight ? 'text-primary' : 'text-foreground')}>{value}</p>
  </div>
)

export default SettingsPage
