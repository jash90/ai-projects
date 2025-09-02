import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Activity, 
  BarChart3,
  Zap
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usageApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface TokenUsageSummary {
  total_tokens: number
  total_cost: number
  by_provider: {
    [provider: string]: {
      tokens: number
      cost: number
      models: {
        [model: string]: {
          tokens: number
          cost: number
          requests: number
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

export function UsageStats({ projectId, agentId, className }: UsageStatsProps) {
  const [summary, setSummary] = useState<TokenUsageSummary | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month')
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

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toFixed(0)
  }

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('text-center p-8', className)}>
        <p className="text-destructive">{error}</p>
        <Button 
          variant="outline" 
          onClick={fetchUsageData}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={cn('text-center p-8', className)}>
        <p className="text-muted-foreground">No usage data available</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Token Usage Statistics
        </h2>
        
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(summary.total_tokens)}
              </p>
            </div>
            <Activity className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCost(summary.total_cost)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Providers</p>
              <p className="text-2xl font-bold text-foreground">
                {Object.keys(summary.by_provider).length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Provider Breakdown */}
      {Object.entries(summary.by_provider).map(([provider, data]) => (
        <Card key={provider} className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground capitalize">
              {provider}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{formatNumber(data.tokens)} tokens</span>
              <span>•</span>
              <span>{formatCost(data.cost)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(data.models).map(([model, modelData]) => (
              <div 
                key={model}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{model}</p>
                  <p className="text-sm text-muted-foreground">
                    {modelData.requests} requests
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {formatNumber(modelData.tokens)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCost(modelData.cost)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Usage Chart Placeholder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Usage Over Time
        </h3>
        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">
            Chart visualization coming soon...
          </p>
        </div>
      </Card>
    </div>
  )
}
