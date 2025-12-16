import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { AutocompleteOption } from '@/components/ui/Autocomplete'

interface ModelDetailPanelProps {
  model: AutocompleteOption | null
  onSelect: () => void
  onAddToCompare: () => void
  onToggleFavorite: () => void
  isFavorite: boolean
  isInComparison: boolean
  comparisonFull: boolean
}

export function ModelDetailPanel({
  model,
  onSelect,
  onAddToCompare,
  onToggleFavorite,
  isFavorite,
  isInComparison,
  comparisonFull
}: ModelDetailPanelProps) {
  const { t } = useTranslation('agents')

  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center text-center w-2/5">
        <div>
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('models.detail.noSelection.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('models.detail.noSelection.description')}
          </p>
        </div>
      </div>
    )
  }

  const getCostBadgeColor = (cost?: string) => {
    switch (cost) {
      case 'Free': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
      case 'Very Low': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      case 'Low': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20'
      case 'Medium': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
      case 'High': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
      case 'Very High': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatContextWindow = (tokens?: number) => {
    if (!tokens) return 'Unknown'
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`
    return tokens.toString()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-l border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {model.isPopular && (
                <span className="text-yellow-500" title={t('models.detail.popularModel')}>⭐</span>
              )}
              <h2 className="text-xl font-semibold text-foreground truncate">
                {model.name}
              </h2>
            </div>
            {model.metadata?.provider && (
              <p className="text-sm text-muted-foreground">
                {t('models.detail.by', { provider: model.metadata.provider })}
              </p>
            )}
          </div>
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-md transition-colors ${
              isFavorite
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            title={isFavorite ? t('models.detail.removeFromFavorites') : t('models.detail.addToFavorites')}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-2">
          {model.metadata?.cost && (
            <span className={`px-2 py-1 text-xs rounded border ${getCostBadgeColor(model.metadata.cost)}`}>
              {t('models.detail.cost', { cost: model.metadata.cost })}
            </span>
          )}
          {model.metadata?.contextWindow && (
            <span className="px-2 py-1 text-xs rounded border bg-muted text-foreground border-border">
              {formatContextWindow(model.metadata.contextWindow)} {t('models.detail.tokens')}
            </span>
          )}
          {model.category && (
            <span className="px-2 py-1 text-xs rounded border bg-muted text-foreground border-border">
              {model.category}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        {model.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{t('models.detail.description')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {model.description}
            </p>
          </div>
        )}

        {/* Model ID */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('models.detail.modelId')}</h3>
          <code className="text-xs bg-muted px-2 py-1 rounded border border-border">
            {model.id}
          </code>
        </div>

        {/* Specifications */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('models.detail.specifications')}</h3>
          <div className="space-y-2">
            {model.metadata?.provider && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('models.detail.provider')}</span>
                <span className="font-medium text-foreground">{model.metadata.provider}</span>
              </div>
            )}
            {model.metadata?.contextWindow && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('models.detail.contextWindow')}</span>
                <span className="font-medium text-foreground">
                  {model.metadata.contextWindow.toLocaleString()} {t('models.detail.tokens')}
                </span>
              </div>
            )}
            {model.metadata?.cost && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('models.detail.costTier')}</span>
                <span className={`font-medium px-2 py-0.5 rounded text-xs ${getCostBadgeColor(model.metadata.cost)}`}>
                  {model.metadata.cost}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Capabilities (placeholder for future enhancement) */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('models.detail.capabilities')}</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs rounded bg-muted text-foreground border border-border">
              {t('models.detail.chat')}
            </span>
            <span className="px-2 py-1 text-xs rounded bg-muted text-foreground border border-border">
              {t('models.detail.streaming')}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          onClick={onSelect}
          className="w-full"
        >
          {t('models.detail.selectThisModel')}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onAddToCompare}
            variant="outline"
            disabled={comparisonFull && !isInComparison}
            className="text-xs"
          >
            {isInComparison ? t('models.detail.inComparison') : t('models.detail.addToCompare')}
          </Button>
          <Button
            onClick={onToggleFavorite}
            variant="outline"
            className="text-xs"
          >
            {isFavorite ? t('models.detail.favorited') : t('models.detail.favorite')}
          </Button>
        </div>
        {comparisonFull && !isInComparison && (
          <p className="text-xs text-center text-muted-foreground">
            {t('models.detail.comparisonFull')}
          </p>
        )}
      </div>
    </div>
  )
}
