import React, { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { settingsApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { uiStore } from '@/stores/uiStore'
import { UserPreferences } from '@/types'
import { formatNumber, formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'usage'>('profile')

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
        toast.success('Profile updated successfully')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: settingsApi.updatePassword,
    onSuccess: () => {
      toast.success('Password updated successfully')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update password')
    },
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: settingsApi.updatePreferences,
    onSuccess: () => {
      toast.success('Preferences updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
    onError: () => {
      toast.error('Failed to update preferences')
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
      toast.error('New passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters')
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
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
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
        title="Settings"
        subtitle="Manage your account preferences and application settings"
        showBackButton={true}
        backTo="/dashboard"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'profile' | 'security' | 'preferences' | 'usage')}
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
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details and email address</CardDescription>
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
                        {user?.role === 'admin' ? 'Administrator' : 'User'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Username</label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg text-sm bg-background border border-input transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary hover:border-muted-foreground/30"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Email</label>
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
                      Save Changes
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
                      Reset
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
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your password to keep your account secure</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <PasswordField
                    label="Current Password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    show={showPasswords.current}
                    onToggle={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  />

                  <PasswordField
                    label="New Password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    show={showPasswords.new}
                    onToggle={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    minLength={6}
                  />

                  <PasswordField
                    label="Confirm New Password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    show={showPasswords.confirm}
                    onToggle={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    minLength={6}
                    error={
                      passwordForm.new_password &&
                      passwordForm.confirm_password &&
                      passwordForm.new_password !== passwordForm.confirm_password
                        ? 'Passwords do not match'
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
                      Update Password
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                        setShowPasswords({ current: false, new: false, confirm: false })
                      }}
                    >
                      Clear
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
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize how AI Projects looks on your device</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-foreground">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
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

              {/* Notification Settings */}
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Choose what notifications you want to receive</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleSetting
                    icon={<Bell className="w-4 h-4" />}
                    title="Push Notifications"
                    description="Receive notifications about project updates and system alerts"
                    enabled={preferences?.notifications_enabled}
                    onChange={() =>
                      handlePreferenceChange('notifications_enabled', !preferences?.notifications_enabled)
                    }
                  />

                  <ToggleSetting
                    icon={<Mail className="w-4 h-4" />}
                    title="Email Notifications"
                    description="Receive email updates about your account and usage"
                    enabled={preferences?.email_notifications}
                    onChange={() =>
                      handlePreferenceChange('email_notifications', !preferences?.email_notifications)
                    }
                  />
                </CardContent>
              </Card>
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
                      <CardTitle>Usage Statistics</CardTitle>
                      <CardDescription>Monitor your token usage and costs</CardDescription>
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
                            label="Monthly Usage"
                            current={usage.monthly_tokens}
                            limit={user.token_limit_monthly}
                            percent={monthlyUsagePercent}
                          />
                        )}
                        {user?.token_limit_global && (
                          <UsageProgressBar
                            label="Total Usage"
                            current={usage.total_tokens}
                            limit={user.token_limit_global}
                            percent={globalUsagePercent}
                          />
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatItem
                          icon={<BarChart3 className="w-4 h-4" />}
                          label="Total Tokens"
                          value={formatNumber(usage.total_tokens)}
                        />
                        <StatItem
                          icon={<Coins className="w-4 h-4" />}
                          label="Total Cost"
                          value={formatCurrency(usage.total_cost)}
                        />
                        <StatItem
                          icon={<BarChart3 className="w-4 h-4" />}
                          label="This Month"
                          value={formatNumber(usage.monthly_tokens)}
                        />
                        <StatItem
                          icon={<Coins className="w-4 h-4" />}
                          label="Monthly Cost"
                          value={formatCurrency(usage.monthly_cost)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading usage statistics...</p>
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
                      <CardTitle>Account Information</CardTitle>
                      <CardDescription>Your account details and limits</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <StatItem
                      icon={<FolderOpen className="w-4 h-4" />}
                      label="Projects"
                      value={usage?.project_count?.toString() || '0'}
                    />
                    <StatItem
                      icon={<Shield className="w-4 h-4" />}
                      label="Role"
                      value={user?.role === 'admin' ? 'Administrator' : 'User'}
                      highlight={user?.role === 'admin'}
                    />
                    {user?.token_limit_global && (
                      <StatItem
                        icon={<BarChart3 className="w-4 h-4" />}
                        label="Global Limit"
                        value={formatNumber(user.token_limit_global)}
                      />
                    )}
                    {user?.token_limit_monthly && (
                      <StatItem
                        icon={<BarChart3 className="w-4 h-4" />}
                        label="Monthly Limit"
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
}

const UsageProgressBar: React.FC<UsageProgressBarProps> = ({ label, current, limit, percent }) => (
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
    <p className="text-xs text-muted-foreground">{percent.toFixed(1)}% used</p>
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
