import { useState, useEffect } from "react";
import {
  DollarSign,
  Activity,
  BarChart3,
  Zap,
  TrendingUp,
  RefreshCw,
  Download,
  Calendar,
  Server,
  Cpu,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { usageApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface TokenUsageSummary {
  total_tokens: number
  total_cost: number
  prompt_tokens: number
  completion_tokens: number
  by_provider: {
    [provider: string]: {
      tokens: number
      cost: number
      prompt_tokens: number
      completion_tokens: number
      models: {
        [model: string]: {
          tokens: number
          cost: number
          requests: number
          prompt_tokens: number
          completion_tokens: number
        }
      }
    }
  }
}

interface UsageStatsProps {
  projectId?: string
  agentId?: string
  className?: string
}

// Date range option type
type DateRangeOption = 'today' | 'week' | 'month' | 'all'

// Date range button component
const DateRangeButton: React.FC<{
  range: DateRangeOption
  currentRange: DateRangeOption
  onClick: (range: DateRangeOption) => void
  icon: React.ReactNode
  label: string
}> = ({ range, currentRange, onClick, icon, label }) => (
  <button
    onClick={() => onClick(range)}
    className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
      currentRange === range
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
    )}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
)

// Provider card component
const ProviderCard: React.FC<{
  provider: string
  data: {
    tokens: number
    cost: number
    prompt_tokens: number
    completion_tokens: number
    models: { [model: string]: { tokens: number; cost: number; requests: number; prompt_tokens: number; completion_tokens: number } }
  }
  totalTokens: number
  formatNumber: (num: number) => string
  formatCost: (cost: number) => string
  index: number
}> = ({ provider, data, totalTokens, formatNumber, formatCost, index }) => {
  const percentage = totalTokens > 0 ? (data.tokens / totalTokens) * 100 : 0
  const modelCount = Object.keys(data.models).length

  // Provider colors
  const getProviderColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'openai':
        return 'bg-emerald-500'
      case 'anthropic':
        return 'bg-orange-500'
      default:
        return 'bg-primary'
    }
  }

  return (
    <Card
      variant="elevated"
      className="animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              provider.toLowerCase() === 'openai' ? 'bg-emerald-500/10' : 'bg-orange-500/10'
            )}>
              <Server className={cn(
                'w-5 h-5',
                provider.toLowerCase() === 'openai' ? 'text-emerald-500' : 'text-orange-500'
              )} />
            </div>
            <div>
              <CardTitle className="text-lg capitalize">{provider}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {modelCount} model{modelCount !== 1 ? 's' : ''} active
              </p>
            </div>
          </div>
          <Badge
            variant={percentage > 50 ? 'warning' : 'secondary'}
            size="sm"
          >
            {percentage.toFixed(1)}% of total
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider summary stats */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
            <p className="text-lg font-bold text-foreground">{formatNumber(data.tokens)}</p>
            {(data.prompt_tokens > 0 || data.completion_tokens > 0) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatNumber(data.prompt_tokens)} in / {formatNumber(data.completion_tokens)} out
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="text-lg font-bold text-foreground">{formatCost(data.cost)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getProviderColor(provider))}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Models breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Models</p>
          {Object.entries(data.models).map(([model, modelData], modelIndex) => {
            const modelPercentage = data.tokens > 0 ? (modelData.tokens / data.tokens) * 100 : 0
            return (
              <div
                key={model}
                className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-primary/20 transition-colors animate-fade-in"
                style={{ animationDelay: `${(index * 100) + (modelIndex * 50)}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{model}</p>
                    <p className="text-xs text-muted-foreground">
                      {modelData.requests.toLocaleString()} request{modelData.requests !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground text-sm">
                    {formatNumber(modelData.tokens)}
                  </p>
                  {(modelData.prompt_tokens > 0 || modelData.completion_tokens > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(modelData.prompt_tokens)} in / {formatNumber(modelData.completion_tokens)} out
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatCost(modelData.cost)} ({modelPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Empty state component
const EmptyState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <Card variant="bordered" className="p-12">
    <div className="text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No Usage Data</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Start using AI agents in your projects to see usage statistics here.
      </p>
      <Button onClick={onRefresh} variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>
        Refresh
      </Button>
    </div>
  </Card>
)

// Error state component
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <Card variant="bordered" className="border-destructive/20 bg-destructive/5 p-8">
    <div className="text-center">
      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Data</h3>
      <p className="text-muted-foreground mb-6">{error}</p>
      <Button onClick={onRetry} variant="destructive" leftIcon={<RefreshCw className="w-4 h-4" />}>
        Retry
      </Button>
    </div>
  </Card>
)

export function UsageStats({ projectId, agentId, className }: UsageStatsProps) {
  const [summary, setSummary] = useState<TokenUsageSummary | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeOption>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageData()
  }, [projectId, agentId, dateRange])

  const fetchUsageData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Calculate date range
      let startDate: Date | undefined
      const endDate = new Date()

      switch (dateRange) {
        case 'today':
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'all':
          startDate = undefined
          break
      }

      const response = await usageApi.getSummary(
        projectId,
        agentId,
        startDate?.toISOString(),
        endDate.toISOString()
      )

      if (response.success) {
        setSummary(response.data)
      } else {
        setError(response.error || 'Failed to fetch usage data')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch usage data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number | string): string => {
    const n = Number(num)
    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(2)}M`
    }
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return n.toFixed(0)
  }

  const formatCost = (cost: number | string): string => {
    return `$${Number(cost).toFixed(4)}`
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading usage data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchUsageData} />
  }

  if (!summary) {
    return <EmptyState onRefresh={fetchUsageData} />
  }

  const providerCount = Object.keys(summary.by_provider).length
  const totalRequests = Object.values(summary.by_provider).reduce(
    (acc, provider) => acc + Object.values(provider.models).reduce((sum, model) => sum + model.requests, 0),
    0
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl">
          <DateRangeButton
            range="today"
            currentRange={dateRange}
            onClick={setDateRange}
            icon={<Calendar className="w-4 h-4" />}
            label="Today"
          />
          <DateRangeButton
            range="week"
            currentRange={dateRange}
            onClick={setDateRange}
            icon={<Calendar className="w-4 h-4" />}
            label="Week"
          />
          <DateRangeButton
            range="month"
            currentRange={dateRange}
            onClick={setDateRange}
            icon={<Calendar className="w-4 h-4" />}
            label="Month"
          />
          <DateRangeButton
            range="all"
            currentRange={dateRange}
            onClick={setDateRange}
            icon={<Calendar className="w-4 h-4" />}
            label="All Time"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsageData}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total Tokens"
          value={formatNumber(summary.total_tokens)}
          icon={<Activity className="w-6 h-6" />}
          variant="primary"
          description={summary.prompt_tokens > 0 || summary.completion_tokens > 0
            ? `${formatNumber(summary.prompt_tokens)} in / ${formatNumber(summary.completion_tokens)} out`
            : undefined}
        />

        <StatCard
          title="Total Cost"
          value={formatCost(summary.total_cost)}
          icon={<DollarSign className="w-6 h-6" />}
          variant="success"
        />

        <StatCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          icon={<Zap className="w-6 h-6" />}
          variant="warning"
        />

        <StatCard
          title="Active Providers"
          value={providerCount.toString()}
          icon={<Server className="w-6 h-6" />}
          variant="info"
        />
      </div>

      {/* Cost Breakdown Card */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Cost Analysis
            </CardTitle>
            <Badge variant="secondary" size="sm">
              {dateRange === 'all' ? 'All Time' : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Cost per Request</p>
              <p className="text-2xl font-bold text-foreground">
                {totalRequests > 0
                  ? formatCost(Number(summary.total_cost) / totalRequests)
                  : '$0.0000'
                }
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Tokens per Request</p>
              <p className="text-2xl font-bold text-foreground">
                {totalRequests > 0
                  ? formatNumber(summary.total_tokens / totalRequests)
                  : '0'
                }
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cost per 1K Tokens</p>
              <p className="text-2xl font-bold text-foreground">
                {summary.total_tokens > 0
                  ? formatCost((Number(summary.total_cost) / Number(summary.total_tokens)) * 1000)
                  : '$0.0000'
                }
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Input / Output Ratio</p>
              <p className="text-2xl font-bold text-foreground">
                {summary.completion_tokens > 0
                  ? `${(summary.prompt_tokens / summary.completion_tokens).toFixed(1)}x`
                  : 'N/A'
                }
              </p>
              {(summary.prompt_tokens > 0 || summary.completion_tokens > 0) && (
                <p className="text-xs text-muted-foreground">
                  {formatNumber(summary.prompt_tokens)} in / {formatNumber(summary.completion_tokens)} out
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Provider Breakdown
          </h2>
          <p className="text-sm text-muted-foreground">
            {providerCount} provider{providerCount !== 1 ? 's' : ''} in use
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(summary.by_provider).map(([provider, data], index) => (
            <ProviderCard
              key={provider}
              provider={provider}
              data={data}
              totalTokens={summary.total_tokens}
              formatNumber={formatNumber}
              formatCost={formatCost}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Usage Chart Placeholder */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Usage Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">Chart Visualization</p>
            <p className="text-sm text-muted-foreground/70">Coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
