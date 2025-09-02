import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  User, 
  Lock, 
  Palette, 
  BarChart3, 
  Save, 
  Eye, 
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { settingsApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { UserPreferences } from '@/types'
import { formatNumber, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'usage'>('profile')
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || ''
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
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
    }
  })

  const updatePasswordMutation = useMutation({
    mutationFn: settingsApi.updatePassword,
    onSuccess: () => {
      toast.success('Password updated successfully')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update password')
    }
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: settingsApi.updatePreferences,
    onSuccess: () => {
      toast.success('Preferences updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
    onError: () => {
      toast.error('Failed to update preferences')
    }
  })

  const preferences = preferencesData?.data?.preferences
  const usage = usageData?.data?.stats

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (profileForm.username.trim() && profileForm.email.trim()) {
      updateProfileMutation.mutate({
        username: profileForm.username.trim(),
        email: profileForm.email.trim()
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
      new_password: passwordForm.new_password
    })
  }

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    const updatedPreferences = { ...preferences, [key]: value }
    updatePreferencesMutation.mutate(updatedPreferences)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
  ]

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Profile Information</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setProfileForm({
                      username: user?.username || '',
                      email: user?.email || ''
                    })}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Change Password</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={updatePasswordMutation.isPending || passwordForm.new_password !== passwordForm.confirm_password}
                    className="flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
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
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Theme Settings */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-3">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => handlePreferenceChange('theme', theme)}
                          className={`p-3 border rounded-lg text-center transition-colors ${
                            preferences?.theme === theme
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-sm font-medium capitalize">{theme}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Notifications</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-card-foreground">
                        Push Notifications
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications about project updates and system alerts
                      </p>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('notifications_enabled', !preferences?.notifications_enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences?.notifications_enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences?.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-card-foreground">
                        Email Notifications
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Receive email updates about your account and usage
                      </p>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('email_notifications', !preferences?.email_notifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences?.email_notifications ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences?.email_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Usage Statistics</h2>
              {usage ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-card-foreground mb-2">Token Usage</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Tokens:</span>
                          <span className="text-sm font-medium">{formatNumber(usage.total_tokens)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">This Month:</span>
                          <span className="text-sm font-medium">{formatNumber(usage.monthly_tokens)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-card-foreground mb-2">Cost</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Cost:</span>
                          <span className="text-sm font-medium">{formatCurrency(usage.total_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">This Month:</span>
                          <span className="text-sm font-medium">{formatCurrency(usage.monthly_cost)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-card-foreground mb-2">Limits</h3>
                      <div className="space-y-2">
                        {user?.token_limit_global && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Global Limit:</span>
                            <span className="text-sm font-medium">{formatNumber(user.token_limit_global)}</span>
                          </div>
                        )}
                        {user?.token_limit_monthly && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Monthly Limit:</span>
                            <span className="text-sm font-medium">{formatNumber(user.token_limit_monthly)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-card-foreground mb-2">Account</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Projects:</span>
                          <span className="text-sm font-medium">{usage.project_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Role:</span>
                          <span className={`text-sm font-medium ${user?.role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                            {user?.role === 'admin' ? 'Administrator' : 'User'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading usage statistics...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
