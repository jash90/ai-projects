import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  DollarSign,
  Shield,
  Eye,
  AlertTriangle,
  Edit,
  Save,
  X,
  BarChart3,
  Clock,
  Target,
  Activity,
  UserCheck,
  UserX,
  Crown,
  Info,
  Settings,
  Sparkles,
  Hash,
  Bot,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { adminApi, agentsApi } from '@/lib/api';
import { AdminStats, UserManagement, TokenLimitUpdate, Agent, AgentCreate, AgentUpdate } from '@/types';
import { AgentDialog } from '@/components/agents/AgentDialog';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'limits' | 'agents'>('dashboard');

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
    enabled: user?.role === 'admin',
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
    enabled: user?.role === 'admin',
  });

  // Fetch global token limits
  const { data: limitsData, isLoading: limitsLoading, refetch: refetchLimits } = useQuery({
    queryKey: ['admin', 'token-limits'],
    queryFn: () => adminApi.getGlobalTokenLimits(),
    enabled: user?.role === 'admin',
  });

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['admin', 'agents'],
    queryFn: () => agentsApi.getAgents(),
    enabled: user?.role === 'admin',
  });

  const stats = statsData?.data;
  const users = usersData?.data?.users || [];
  const globalLimits = limitsData?.data;
  const agents = agentsData?.data?.agents || [];

  const handleRefreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchLimits();
    refetchAgents();
    toast.success('Data refreshed successfully');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card variant="bordered" className="max-w-md mx-auto border-destructive/20 bg-destructive/5">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access the admin panel.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => (window.location.href = '/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with admin-specific violet gradient */}
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
          { id: 'agents', label: 'Agents', icon: Bot },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'dashboard' | 'users' | 'limits' | 'agents')}
        variant="gradient"
        className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10"
      />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
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

        {activeTab === 'agents' && (
          <AgentsTab
            agents={agents}
            loading={agentsLoading}
            onRefresh={refetchAgents}
          />
        )}
      </main>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, loading }: { stats: AdminStats | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card variant="bordered" className="p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Statistics Available</h3>
          <p className="text-muted-foreground">Dashboard statistics will appear here once data is available.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total Users"
          value={formatNumber(stats.total_users || 0)}
          icon={<Users className="w-6 h-6" />}
          variant="primary"
          trend={stats.active_users ? { value: Math.round((stats.active_users / (stats.total_users || 1)) * 100), isPositive: true } : undefined}
        />

        <StatCard
          title="Active Users"
          value={formatNumber(stats.active_users || 0)}
          icon={<UserCheck className="w-6 h-6" />}
          variant="success"
        />

        <StatCard
          title="Total Tokens"
          value={formatNumber(stats.total_tokens_used || 0)}
          icon={<Activity className="w-6 h-6" />}
          variant="info"
        />

        <StatCard
          title="Total Cost"
          value={formatCurrency(stats.total_cost || 0)}
          icon={<DollarSign className="w-6 h-6" />}
          variant="warning"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(stats.total_projects || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Tokens</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(stats.monthly_tokens || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.monthly_cost || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      {stats.top_users && stats.top_users.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-warning" />
                Top Users by Token Usage
              </CardTitle>
              <Badge variant="secondary" size="sm">
                {stats.top_users.length} users
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_users.slice(0, 10).map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm',
                      index === 0 ? 'bg-warning/20 text-warning' :
                      index === 1 ? 'bg-muted text-muted-foreground' :
                      index === 2 ? 'bg-orange-500/20 text-orange-500' :
                      'bg-muted/50 text-muted-foreground'
                    )}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatNumber(user.total_tokens)} tokens</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatCurrency(user.total_cost)}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{user.project_count} projects</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Users Tab Component
function UsersTab({
  users,
  loading,
  onRefresh,
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
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                User Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user accounts and token limits
              </p>
            </div>
            <Badge variant="secondary" size="sm">
              {users.length} users
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-y border-border">
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
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        size="sm"
                        className={user.role === 'admin' ? 'bg-accent text-accent-foreground' : ''}
                      >
                        {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground">{formatNumber(user.total_tokens_used || 0)} total</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{formatNumber(user.monthly_tokens_used || 0)} monthly</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingLimits[user.id] ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-14">Global:</span>
                            <input
                              type="number"
                              min="0"
                              value={tempLimits[user.id]?.global || 0}
                              onChange={(e) =>
                                setTempLimits({
                                  ...tempLimits,
                                  [user.id]: {
                                    ...tempLimits[user.id],
                                    global: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-24 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-14">Monthly:</span>
                            <input
                              type="number"
                              min="0"
                              value={tempLimits[user.id]?.monthly || 0}
                              onChange={(e) =>
                                setTempLimits({
                                  ...tempLimits,
                                  [user.id]: {
                                    ...tempLimits[user.id],
                                    monthly: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-24 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p className="text-foreground">
                            Global: <span className="font-medium">{formatNumber(user.token_limit_global || 0)}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Monthly: <span className="font-medium">{formatNumber(user.token_limit_monthly || 0)}</span>
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.is_active ? 'success' : 'destructive'}
                        size="sm"
                        dot
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {editingLimits[user.id] ? (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleSaveLimits(user.id)}
                              disabled={updateLimitsMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelEdit(user.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditLimits(user.id, user)}
                              className="h-8 w-8 p-0"
                              title="Edit limits"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                              disabled={toggleStatusMutation.isPending}
                              className={cn(
                                'h-8 w-8 p-0',
                                user.is_active ? 'hover:text-destructive' : 'hover:text-success'
                              )}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.is_active ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedUser(user)}
                              className="h-8 w-8 p-0"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
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
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
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
      global: globalLimits?.global_limit || 0,
      monthly: globalLimits?.monthly_limit || 0,
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
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading token limits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Token Limits */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Global Token Limits
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Default limits applied to new users
              </p>
            </div>
            {!editing && (
              <Button onClick={handleEdit} variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                Edit Limits
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
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
                    className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                    className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Enter monthly token limit"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tokens a user can consume per calendar month
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleSave}
                  disabled={updateGlobalLimitsMutation.isPending}
                  variant="gradient"
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {updateGlobalLimitsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Global Limit</h4>
                    <p className="text-sm text-muted-foreground">Lifetime token allowance</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {formatNumber(globalLimits?.global_limit || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">tokens per user</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border border-accent/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Monthly Limit</h4>
                    <p className="text-sm text-muted-foreground">Monthly token allowance</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {formatNumber(globalLimits?.monthly_limit || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">tokens per month</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card variant="bordered" className="bg-info/5 border-info/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-5 w-5 text-info" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">
                Token Limit Information
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Global limits apply to a user's total token consumption across their entire account lifetime
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Monthly limits reset at the beginning of each calendar month
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Individual user limits can be set to override these global defaults
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Users will receive an error when attempting to exceed their limits
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  These limits help control API costs and prevent abuse
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <Card variant="elevated" className="max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle className="text-lg">{user.username}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</p>
              <div className="mt-2">
                <Badge
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                  className={user.role === 'admin' ? 'bg-accent text-accent-foreground' : ''}
                >
                  {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                  {user.role}
                </Badge>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="mt-2">
                <Badge variant={user.is_active ? 'success' : 'destructive'} dot>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</p>
              <p className="text-foreground mt-2 font-medium">{formatDate(user.created_at)}</p>
            </div>
          </div>

          {/* Token Usage Stats */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner className="mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading usage statistics...</p>
              </div>
            </div>
          ) : userStats ? (
            <div className="space-y-6">
              {/* Usage Statistics */}
              <div>
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Usage Statistics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(userStats.total_tokens || 0)}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-accent/5 to-transparent rounded-xl border border-accent/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-accent-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Monthly Tokens</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(userStats.monthly_tokens || 0)}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-success/5 to-transparent rounded-xl border border-success/10">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-success" />
                      <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(userStats.total_cost || 0)}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-info/5 to-transparent rounded-xl border border-info/10">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-info" />
                      <p className="text-sm font-medium text-muted-foreground">Projects</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{userStats.project_count || 0}</p>
                  </div>
                </div>
              </div>

              {/* Token Limits */}
              <div>
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Token Limits
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Global Limit</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatNumber(userStats.token_limit_global || 0)}
                    </p>
                    {userStats.total_tokens && userStats.token_limit_global && (
                      <div className="mt-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              (userStats.total_tokens / userStats.token_limit_global) > 0.9
                                ? 'bg-destructive'
                                : (userStats.total_tokens / userStats.token_limit_global) > 0.7
                                  ? 'bg-warning'
                                  : 'bg-primary'
                            )}
                            style={{ width: `${Math.min((userStats.total_tokens / userStats.token_limit_global) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {((userStats.total_tokens / userStats.token_limit_global) * 100).toFixed(1)}% used
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Monthly Limit</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatNumber(userStats.token_limit_monthly || 0)}
                    </p>
                    {userStats.monthly_tokens && userStats.token_limit_monthly && (
                      <div className="mt-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              (userStats.monthly_tokens / userStats.token_limit_monthly) > 0.9
                                ? 'bg-destructive'
                                : (userStats.monthly_tokens / userStats.token_limit_monthly) > 0.7
                                  ? 'bg-warning'
                                  : 'bg-accent-foreground'
                            )}
                            style={{ width: `${Math.min((userStats.monthly_tokens / userStats.token_limit_monthly) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {((userStats.monthly_tokens / userStats.token_limit_monthly) * 100).toFixed(1)}% used
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {userStats.last_active && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>Last active: <span className="text-foreground font-medium">{formatDate(userStats.last_active)}</span></span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No usage statistics available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Agents Tab Component
function AgentsTab({
  agents,
  loading,
  onRefresh,
}: {
  agents: Agent[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Create agent mutation
  const createMutation = useMutation({
    mutationFn: (data: AgentCreate) => agentsApi.createAgent(data),
    onSuccess: () => {
      toast.success('Agent created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      onRefresh();
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create agent');
    },
  });

  // Update agent mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentUpdate }) => agentsApi.updateAgent(id, data),
    onSuccess: () => {
      toast.success('Agent updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      onRefresh();
      setEditingAgent(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update agent');
    },
  });

  // Delete agent mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.deleteAgent(id),
    onSuccess: () => {
      toast.success('Agent deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      onRefresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete agent');
    },
  });

  const handleCreateAgent = async (data: AgentCreate | AgentUpdate) => {
    await createMutation.mutateAsync(data as AgentCreate);
  };

  const handleUpdateAgent = async (data: AgentCreate | AgentUpdate) => {
    if (!editingAgent) return;
    await updateMutation.mutateAsync({ id: editingAgent.id, data: data as AgentUpdate });
  };

  const handleDeleteAgent = (agent: Agent) => {
    if (confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(agent.id);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'anthropic':
        return '🧠';
      default:
        return '⚡';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'anthropic':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agents Table */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Agent Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage AI agents for conversations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" size="sm">
                {agents.length} agents
              </Badge>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="gradient"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New Agent
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {agents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Agents Yet</h3>
              <p className="text-muted-foreground mb-6">Create your first AI agent to get started</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="gradient"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Agent
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-y border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Settings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agents.map((agent, index) => (
                    <tr
                      key={agent.id}
                      className="hover:bg-muted/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{agent.name}</p>
                            {agent.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                                {agent.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          size="sm"
                          className={getProviderColor(agent.provider)}
                        >
                          {getProviderIcon(agent.provider)} {agent.provider}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground font-mono">{agent.model}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">
                            Temp: <span className="text-foreground font-medium">{agent.temperature}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Tokens: <span className="text-foreground font-medium">{formatNumber(agent.max_tokens)}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">{formatDate(agent.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingAgent(agent)}
                            className="h-8 w-8 p-0"
                            title="Edit agent"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAgent(agent)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 p-0 hover:text-destructive"
                            title="Delete agent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card variant="bordered" className="bg-info/5 border-info/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-5 w-5 text-info" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">
                Agent Management Information
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Agents are AI assistants that users can select for conversations in their projects
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Each agent has a unique system prompt that defines its personality and capabilities
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Only administrators can create, edit, or delete agents
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  Agents that are being used in conversations cannot be deleted
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Agent Dialog */}
      <AgentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAgent}
        title="Create New Agent"
      />

      {/* Edit Agent Dialog */}
      <AgentDialog
        open={!!editingAgent}
        onClose={() => setEditingAgent(null)}
        onSubmit={handleUpdateAgent}
        title="Edit Agent"
        agent={editingAgent}
      />
    </div>
  );
}