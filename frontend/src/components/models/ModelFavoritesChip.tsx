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
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-foreground'
      }`}
      title={`${modelName} (${modelId})`}
    >
      <span className="text-xs">{type === 'favorite' ? '❤️' : '🕒'}</span>
      <span className="truncate max-w-[120px]">{modelName}</span>
      {type === 'favorite' && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:text-destructive transition-colors"
          title="Remove from favorites"
        >
          ✕
        </button>
      )}
    </button>
  )
}
