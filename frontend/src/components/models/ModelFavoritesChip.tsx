interface ModelFavoritesChipProps {
  modelId: string
  modelName: string
  isSelected: boolean
  onClick: () => void
  onRemove?: () => void
  type: 'favorite' | 'recent'
}

export function ModelFavoritesChip({
  modelId,
  modelName,
  isSelected,
  onClick,
  onRemove,
  type
}: ModelFavoritesChipProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-foreground'
      }`}
      title={`${modelName} (${modelId})`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <span className="text-xs">{type === 'favorite' ? '❤️' : '🕒'}</span>
      <span className="truncate max-w-[120px]">{modelName}</span>
      {type === 'favorite' && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 rounded"
          title="Remove from favorites"
          aria-label={`Remove ${modelName} from favorites`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
