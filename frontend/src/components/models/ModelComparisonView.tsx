import { Button } from '@/components/ui/Button'
import { AutocompleteOption } from '@/components/ui/Autocomplete'

interface ModelComparisonViewProps {
  models: AutocompleteOption[]
  onSelect: (modelId: string) => void
  onRemove: (modelId: string) => void
  onBack: () => void
}

export function ModelComparisonView({
  models,
  onSelect,
  onRemove,
  onBack
}: ModelComparisonViewProps) {
  const getCostBadgeColor = (cost?: string) => {
    switch (cost) {
      case 'Free': return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'Very Low': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'Low': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
      case 'Medium': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
      case 'High': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
      case 'Very High': return 'bg-red-500/10 text-red-700 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const formatContextWindow = (tokens?: number) => {
    if (!tokens) return 'Unknown'
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`
    return tokens.toString()
  }

  // Find the best value for each metric to highlight
  const contextWindows = models.map(m => m.metadata?.contextWindow || 0)
  const maxContext = Math.max(...contextWindows)

  const costRanking = ['Free', 'Very Low', 'Low', 'Medium', 'High', 'Very High']
  const costs = models.map(m => costRanking.indexOf(m.metadata?.cost || 'Unknown'))
  const minCostIndex = Math.min(...costs.filter(c => c >= 0))

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            size="sm"
          >
            ← Back to List
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            Comparing {models.length} {models.length === 1 ? 'Model' : 'Models'}
          </h2>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="flex-1 overflow-auto p-4">
        {models.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Models to Compare</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select up to 3 models from the list to compare them side by side
              </p>
              <Button onClick={onBack} variant="outline">
                Browse Models
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))` }}>
            {models.map((model, index) => {
              const isLowestCost = costs[index] === minCostIndex && minCostIndex >= 0
              const isHighestContext = model.metadata?.contextWindow === maxContext && maxContext > 0

              return (
                <div key={model.id} className="border border-border rounded-lg bg-background overflow-hidden">
                  {/* Model Header */}
                  <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          {model.isPopular && <span className="text-xs">⭐</span>}
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {model.name}
                          </h3>
                        </div>
                        {model.metadata?.provider && (
                          <p className="text-xs text-muted-foreground truncate">
                            {model.metadata.provider}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(model.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Remove from comparison"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="p-4 space-y-3">
                    {/* Cost */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Cost Tier</div>
                      <div className={`inline-flex px-2 py-1 text-xs rounded ${getCostBadgeColor(model.metadata?.cost)} ${isLowestCost ? 'ring-2 ring-green-500' : ''}`}>
                        {isLowestCost && '🏆 '}
                        {model.metadata?.cost || 'Unknown'}
                      </div>
                    </div>

                    {/* Context Window */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Context Window</div>
                      <div className={`text-sm font-medium ${isHighestContext ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                        {isHighestContext && '🏆 '}
                        {formatContextWindow(model.metadata?.contextWindow)} tokens
                      </div>
                    </div>

                    {/* Model ID */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Model ID</div>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                        {model.id}
                      </code>
                    </div>

                    {/* Description */}
                    {model.description && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Description</div>
                        <p className="text-xs text-foreground/80 line-clamp-3">
                          {model.description}
                        </p>
                      </div>
                    )}

                    {/* Category */}
                    {model.category && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Category</div>
                        <span className="text-xs px-2 py-1 rounded bg-muted">
                          {model.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="p-3 border-t border-border">
                    <Button
                      onClick={() => onSelect(model.id)}
                      className="w-full text-sm"
                      size="sm"
                    >
                      Select This Model
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      {models.length > 0 && (
        <div className="p-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            🏆 = Best in category • Click on any model card to select it
          </p>
        </div>
      )}
    </div>
  )
}
