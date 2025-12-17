import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  X,
  Package,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { adminApi } from '@/lib/api';
import { SubscriptionPlan, PlanCreate, PlanUpdate } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';
import toast from 'react-hot-toast';

const AdminSubscriptionsPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);

  // Fetch plans
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['admin', 'subscription-plans'],
    queryFn: async () => {
      const response: any = await adminApi.getSubscriptionPlans(true);
      return (response.data?.data || []) as SubscriptionPlan[];
    },
  });

  const plans = (plansData || []) as SubscriptionPlan[];

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: PlanCreate) => adminApi.createSubscriptionPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      setShowCreateModal(false);
      toast.success(t('subscription.planCreated'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('subscription.createError'));
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: PlanUpdate }) =>
      adminApi.updateSubscriptionPlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      setShowEditModal(false);
      setSelectedPlan(null);
      toast.success(t('subscription.planUpdated'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('subscription.updateError'));
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => adminApi.deleteSubscriptionPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      setShowDeleteModal(false);
      setSelectedPlan(null);
      toast.success(t('subscription.planDeleted'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('subscription.deleteError'));
    },
  });

  // Sync with Stripe mutation
  const syncStripeMutation = useMutation({
    mutationFn: ({ planId }: { planId: string }) => adminApi.syncPlanWithStripe(planId),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      setSyncingPlanId(null);

      const result = response.data?.data;
      if (result?.success) {
        toast.success(t('subscription.syncSuccess'));
      } else {
        toast.error(t('subscription.syncPartial'));
      }
    },
    onError: (error: any) => {
      setSyncingPlanId(null);
      toast.error(error.response?.data?.error || t('subscription.syncError'));
    },
  });

  const handleSync = (planId: string) => {
    setSyncingPlanId(planId);
    syncStripeMutation.mutate({ planId });
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subscription.title', 'Subscription Plans')}
        subtitle={t('subscription.description', 'Manage subscription plans and Stripe integration')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('subscription.createPlan', 'Create Plan')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('subscription.noPlans', 'No subscription plans')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('subscription.noPlansDesc', 'Get started by creating a new subscription plan.')}
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('subscription.createPlan', 'Create Plan')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: SubscriptionPlan) => (
            <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {plan.display_name}
                      {!plan.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          {t('subscription.inactive', 'Inactive')}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {plan.description || t('subscription.noDescription', 'No description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('subscription.monthly', 'Monthly')}
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(plan.price_monthly)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('subscription.yearly', 'Yearly')}
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(plan.price_yearly)}
                    </span>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('subscription.tokensMonth', 'Tokens/Month')}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatNumber(plan.token_limit_monthly)}
                    </span>
                  </div>
                  {plan.max_projects !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('subscription.maxProjects', 'Max Projects')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {plan.max_projects || t('subscription.unlimited', 'Unlimited')}
                      </span>
                    </div>
                  )}
                  {plan.max_agents !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('subscription.maxAgents', 'Max Agents')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {plan.max_agents || t('subscription.unlimited', 'Unlimited')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stripe Status */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    {plan.stripe_price_id_monthly || plan.stripe_price_id_yearly ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('subscription.stripeSynced', 'Synced with Stripe')}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('subscription.notSynced', 'Not synced')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(plan)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(plan.id)}
                    disabled={syncingPlanId === plan.id}
                  >
                    {syncingPlanId === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(plan)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <PlanFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createPlanMutation.mutate(data as PlanCreate)}
          isLoading={createPlanMutation.isPending}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditModal && selectedPlan && (
        <PlanFormModal
          mode="edit"
          plan={selectedPlan}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSubmit={(data) => updatePlanMutation.mutate({ planId: selectedPlan.id, data: data as PlanUpdate })}
          isLoading={updatePlanMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPlan && (
        <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('subscription.deletePlan', 'Delete Plan')}</DialogTitle>
              <DialogDescription>
                {t('subscription.deleteConfirm', 'Are you sure you want to deactivate this plan? This action cannot be undone if there are active subscribers.')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedPlan.display_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedPlan.description}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletePlanMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletePlanMutation.mutate(selectedPlan.id)}
                disabled={deletePlanMutation.isPending}
              >
                {deletePlanMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t('common.delete', 'Delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Plan Form Modal Component
interface PlanFormModalProps {
  mode: 'create' | 'edit';
  plan?: SubscriptionPlan;
  onClose: () => void;
  onSubmit: (data: PlanCreate | PlanUpdate) => void;
  isLoading: boolean;
}

const PlanFormModal: React.FC<PlanFormModalProps> = ({ mode, plan, onClose, onSubmit, isLoading }) => {
  const { t } = useTranslation('admin');

  const [formData, setFormData] = useState<PlanCreate>({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    description: plan?.description || '',
    price_monthly: plan?.price_monthly || 0,
    price_yearly: plan?.price_yearly || 0,
    token_limit_monthly: plan?.token_limit_monthly || 50000,
    token_limit_global: plan?.token_limit_global || undefined,
    max_projects: plan?.max_projects || undefined,
    max_agents: plan?.max_agents || undefined,
    max_file_size_mb: plan?.max_file_size_mb || 20,
    features: plan?.features || [],
    priority_support: plan?.priority_support || false,
    sort_order: plan?.sort_order || 0,
  });

  const [featureInput, setFeatureInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      onSubmit(formData);
    } else {
      // For edit, only send changed fields
      const updates: PlanUpdate = {};
      if (formData.display_name !== plan?.display_name) updates.display_name = formData.display_name;
      if (formData.description !== plan?.description) updates.description = formData.description;
      if (formData.price_monthly !== plan?.price_monthly) updates.price_monthly = formData.price_monthly;
      if (formData.price_yearly !== plan?.price_yearly) updates.price_yearly = formData.price_yearly;
      if (formData.token_limit_monthly !== plan?.token_limit_monthly) updates.token_limit_monthly = formData.token_limit_monthly;
      if (formData.token_limit_global !== plan?.token_limit_global) updates.token_limit_global = formData.token_limit_global;
      if (formData.max_projects !== plan?.max_projects) updates.max_projects = formData.max_projects;
      if (formData.max_agents !== plan?.max_agents) updates.max_agents = formData.max_agents;
      if (formData.max_file_size_mb !== plan?.max_file_size_mb) updates.max_file_size_mb = formData.max_file_size_mb;
      if (JSON.stringify(formData.features) !== JSON.stringify(plan?.features)) updates.features = formData.features;
      if (formData.priority_support !== plan?.priority_support) updates.priority_support = formData.priority_support;
      if (formData.sort_order !== plan?.sort_order) updates.sort_order = formData.sort_order;

      onSubmit(updates);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }));
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('subscription.createPlan', 'Create Plan')
              : t('subscription.editPlan', 'Edit Plan')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('subscription.createDesc', 'Create a new subscription plan. Sync with Stripe after creation.')
              : t('subscription.editDesc', 'Update plan details. Re-sync with Stripe if prices change.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.planName', 'Plan Name')} *
                </label>
                <input
                  type="text"
                  required
                  disabled={mode === 'edit'}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="basic-plan"
                  pattern="[a-z0-9-]+"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('subscription.planNameHint', 'Lowercase alphanumeric with hyphens only')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.displayName', 'Display Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Basic Plan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('subscription.description', 'Description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('subscription.pricing', 'Pricing')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.priceMonthly', 'Monthly Price ($)')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.priceYearly', 'Yearly Price ($)')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('subscription.limits', 'Limits')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.tokenLimitMonthly', 'Monthly Token Limit')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.token_limit_monthly}
                  onChange={(e) => setFormData(prev => ({ ...prev, token_limit_monthly: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.maxProjects', 'Max Projects')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_projects || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_projects: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder={t('subscription.unlimited', 'Unlimited')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.maxAgents', 'Max Agents')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_agents || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_agents: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder={t('subscription.unlimited', 'Unlimited')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('subscription.maxFileSize', 'Max File Size (MB)')} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.max_file_size_mb}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('subscription.features', 'Features')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder={t('subscription.addFeature', 'Add feature...')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              />
              <Button type="button" onClick={addFeature}>
                {t('common.add', 'Add')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.priority_support}
                onChange={(e) => setFormData(prev => ({ ...prev, priority_support: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('subscription.prioritySupport', 'Priority Support')}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                {t('subscription.sortOrder', 'Sort Order')}:
              </label>
              <input
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create'
                ? t('common.create', 'Create')
                : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSubscriptionsPage;
