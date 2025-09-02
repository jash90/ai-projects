import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  AlertTriangle,
  Edit,
  Save,
  X,
  BarChart3,
  Clock,
  Target
} from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { adminApi } from '@/lib/api';
import { AdminStats, UserManagement, TokenLimitUpdate } from '@/types';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'limits'>('dashboard');

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  // Fetch admin stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30000,
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
  });

  // Fetch global token limits
  const { data: limitsData, isLoading: limitsLoading, refetch: refetchLimits } = useQuery({
    queryKey: ['admin', 'token-limits'],
    queryFn: () => adminApi.getGlobalTokenLimits(),
  });

  const stats = statsData?.data;
  const users = usersData?.data?.users || [];
  const globalLimits = limitsData?.data;

  const handleRefreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchLimits();
    toast.success('Data refreshed successfully');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader
        title="Admin Panel"
        subtitle="Manage users, token limits, and system settings"
        showBackButton={true}
        backTo="/dashboard"
        showRefresh={true}
        onRefresh={handleRefreshAll}
        refreshLabel="Refresh All"
        userMenuProps={{ showAdminLink: false }}
        tabs={[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'limits', label: 'Token Limits', icon: Target },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'dashboard' | 'users' | 'limits')}
      />

      {/* Content */}
      <div className="p-6">
        {activeTab === 'dashboard' && (
          <DashboardTab stats={stats} loading={statsLoading} />
        )}
        
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            loading={usersLoading}
            onRefresh={refetchUsers}
          />
        )}

        {activeTab === 'limits' && (
          <TokenLimitsTab
            globalLimits={globalLimits}
            loading={limitsLoading}
            onRefresh={refetchLimits}
          />
        )}
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, loading }: { stats: AdminStats | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading dashboard statistics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={formatNumber(stats.total_users || 0)}
          subtitle={`${formatNumber(stats.active_users || 0)} active`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Projects"
          value={formatNumber(stats.total_projects || 0)}
          icon={BarChart3}
          color="green"
        />
        <StatCard
          title="Total Tokens Used"
          value={formatNumber(stats.total_tokens_used || 0)}
          subtitle={`${formatNumber(stats.monthly_tokens || 0)} this month`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(stats.total_cost || 0)}
          subtitle={`${formatCurrency(stats.monthly_cost || 0)} this month`}
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Top Users */}
      {stats.top_users && stats.top_users.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-foreground">Top Users by Token Usage</h3>
            <p className="text-sm text-muted-foreground">Users with highest token consumption</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.top_users.slice(0, 10).map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatNumber(user.total_tokens)} tokens</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(user.total_cost)} • {user.project_count} projects
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Users Tab Component
function UsersTab({ 
  users, 
  loading, 
  onRefresh 
}: { 
  users: UserManagement[]; 
  loading: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);
  const [editingLimits, setEditingLimits] = useState<{ [key: string]: boolean }>({});
  const [tempLimits, setTempLimits] = useState<{ [key: string]: { global?: number; monthly?: number } }>({});

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.toggleUserStatus(userId, isActive),
    onSuccess: () => {
      toast.success('User status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onRefresh();
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  // Update user token limits mutation
  const updateLimitsMutation = useMutation({
    mutationFn: ({ userId, limits }: { userId: string; limits: Omit<TokenLimitUpdate, 'user_id'> }) =>
      adminApi.updateUserTokenLimits(userId, limits),
    onSuccess: () => {
      toast.success('Token limits updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onRefresh();
    },
    onError: () => {
      toast.error('Failed to update token limits');
    },
  });

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  const handleEditLimits = (userId: string, user: UserManagement) => {
    setEditingLimits({ ...editingLimits, [userId]: true });
    setTempLimits({
      ...tempLimits,
      [userId]: {
        global: user.token_limit_global || 0,
        monthly: user.token_limit_monthly || 0,
      },
    });
  };

  const handleSaveLimits = (userId: string) => {
    const limits = tempLimits[userId];
    if (limits) {
      updateLimitsMutation.mutate({
        userId,
        limits: {
          global_limit: limits.global,
          monthly_limit: limits.monthly,
        },
      });
      setEditingLimits({ ...editingLimits, [userId]: false });
    }
  };

  const handleCancelEdit = (userId: string) => {
    setEditingLimits({ ...editingLimits, [userId]: false });
    const newTempLimits = { ...tempLimits };
    delete newTempLimits[userId];
    setTempLimits(newTempLimits);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <div className="bg-card rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">User Management</h3>
              <p className="text-sm text-muted-foreground">Manage user accounts and token limits</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {users.length} users total
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Token Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Token Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-foreground">{formatNumber(user.total_tokens_used || 0)} total</p>
                      <p className="text-muted-foreground">{formatNumber(user.monthly_tokens_used || 0)} monthly</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingLimits[user.id] ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-12">Global:</span>
                          <input
                            type="number"
                            min="0"
                            value={tempLimits[user.id]?.global || 0}
                            onChange={(e) => setTempLimits({
                              ...tempLimits,
                              [user.id]: {
                                ...tempLimits[user.id],
                                global: parseInt(e.target.value) || 0,
                              },
                            })}
                            className="w-24 px-2 py-1 text-xs border rounded bg-background"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-12">Monthly:</span>
                          <input
                            type="number"
                            min="0"
                            value={tempLimits[user.id]?.monthly || 0}
                            onChange={(e) => setTempLimits({
                              ...tempLimits,
                              [user.id]: {
                                ...tempLimits[user.id],
                                monthly: parseInt(e.target.value) || 0,
                              },
                            })}
                            className="w-24 px-2 py-1 text-xs border rounded bg-background"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="text-foreground">
                          Global: {formatNumber(user.token_limit_global || 0)}
                        </p>
                        <p className="text-muted-foreground">
                          Monthly: {formatNumber(user.token_limit_monthly || 0)}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {editingLimits[user.id] ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSaveLimits(user.id)}
                            disabled={updateLimitsMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelEdit(user.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditLimits(user.id, user)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            disabled={toggleStatusMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            {user.is_active ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

// Token Limits Tab Component
function TokenLimitsTab({
  globalLimits,
  loading,
  onRefresh,
}: {
  globalLimits: { global: number; monthly: number } | undefined;
  loading: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [tempLimits, setTempLimits] = useState({ global: 0, monthly: 0 });

  // Update global limits mutation
  const updateGlobalLimitsMutation = useMutation({
    mutationFn: (limits: { global_limit: number; monthly_limit: number }) =>
      adminApi.updateGlobalTokenLimits(limits),
    onSuccess: () => {
      toast.success('Global token limits updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'token-limits'] });
      onRefresh();
      setEditing(false);
    },
    onError: () => {
      toast.error('Failed to update global token limits');
    },
  });

  const handleEdit = () => {
    setTempLimits({
      global: globalLimits?.global || 0,
      monthly: globalLimits?.monthly || 0,
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateGlobalLimitsMutation.mutate({
      global_limit: tempLimits.global,
      monthly_limit: tempLimits.monthly,
    });
  };

  const handleCancel = () => {
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading token limits...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Token Limits */}
      <div className="bg-card rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Global Token Limits</h3>
              <p className="text-sm text-muted-foreground">Default limits applied to new users</p>
            </div>
            {!editing && (
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Limits
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          {editing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Global Token Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempLimits.global}
                    onChange={(e) => setTempLimits({
                      ...tempLimits,
                      global: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                    placeholder="Enter global token limit"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total tokens a user can consume across all time
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Monthly Token Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempLimits.monthly}
                    onChange={(e) => setTempLimits({
                      ...tempLimits,
                      monthly: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                    placeholder="Enter monthly token limit"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tokens a user can consume per calendar month
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={updateGlobalLimitsMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateGlobalLimitsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-background rounded-lg border">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">Global Limit</h4>
                    <p className="text-sm text-muted-foreground">Lifetime token allowance</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(globalLimits?.global || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">tokens per user</p>
              </div>

              <div className="p-6 bg-background rounded-lg border">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">Monthly Limit</h4>
                    <p className="text-sm text-muted-foreground">Monthly token allowance</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(globalLimits?.monthly || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">tokens per month</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Token Limit Information
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>• Global limits apply to a user's total token consumption across their entire account lifetime</p>
              <p>• Monthly limits reset at the beginning of each calendar month</p>
              <p>• Individual user limits can be set to override these global defaults</p>
              <p>• Users will receive an error when attempting to exceed their limits</p>
              <p>• These limits help control API costs and prevent abuse</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: React.ElementType; 
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400',
    green: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-400',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-400',
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// User Details Modal Component
function UserDetailsModal({ 
  user, 
  onClose 
}: { 
  user: UserManagement; 
  onClose: () => void;
}) {
  const { data: userStatsData, isLoading } = useQuery({
    queryKey: ['admin', 'user-stats', user.id],
    queryFn: () => adminApi.getUserStats(user.id),
  });

  const userStats = userStatsData?.data;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">User Details</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <p className="text-foreground mt-1">{user.username}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="text-foreground mt-1 capitalize">{user.role}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className={`mt-1 ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-foreground mt-1">{formatDate(user.created_at)}</p>
            </div>
          </div>

          {/* Token Usage Stats */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userStats ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(userStats.total_tokens || 0)}</p>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Tokens</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(userStats.monthly_tokens || 0)}</p>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(userStats.total_cost || 0)}</p>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">Projects</p>
                  <p className="text-xl font-bold text-foreground">{userStats.project_count || 0}</p>
                </div>
              </div>
              
              {/* Token Limits */}
              <div className="mt-6">
                <h4 className="font-semibold text-foreground mb-3">Token Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Global Limit</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatNumber(userStats.token_limit_global || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground">Monthly Limit</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatNumber(userStats.token_limit_monthly || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {userStats.last_active && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Active</label>
                  <p className="text-foreground mt-1">{formatDate(userStats.last_active)}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No usage statistics available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}