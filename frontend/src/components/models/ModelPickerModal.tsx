import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Autocomplete, AutocompleteOption, AutocompleteFilters } from '@/components/ui/Autocomplete'
import { ModelDetailPanel } from './ModelDetailPanel'
import { ModelComparisonView } from './ModelComparisonView'
import { ModelFavoritesChip } from './ModelFavoritesChip'
import { useModelPreferences } from '@/hooks/useModelPreferences'

interface ModelPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (modelId: string) => void
  models: AutocompleteOption[]
  selectedModelId?: string
  isLoading?: boolean
  error?: string
  onRetry?: () => void
}

type ViewMode = 'browse' | 'compare'

export function ModelPickerModal({
  open,
  onClose,
  onSelect,
  models,
  selectedModelId,
  isLoading = false,
  error,
  onRetry
}: ModelPickerModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  const [currentModelId, setCurrentModelId] = useState<string>(selectedModelId || '')
  const [selectedDetailModel, setSelectedDetailModel] = useState<AutocompleteOption | null>(null)
  const [comparisonModelIds, setComparisonModelIds] = useState<string[]>([])
  const [modelFilters, setModelFilters] = useState<AutocompleteFilters>({})
  const [showFavoritesBar, setShowFavoritesBar] = useState(true)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    favorites,
    recents,
    toggleFavorite,
    isFavorite,
    addRecent
  } = useModelPreferences()

  // Update selected detail model when currentModelId changes
  useEffect(() => {
    if (currentModelId) {
      const model = models.find(m => m.id === currentModelId)
      setSelectedDetailModel(model || null)
    } else {
      setSelectedDetailModel(null)
    }
  }, [currentModelId, models])

  // Update when selectedModelId prop changes
  useEffect(() => {
    if (selectedModelId) {
      setCurrentModelId(selectedModelId)
    }
  }, [selectedModelId])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      // Ctrl/Cmd + F: Toggle favorites bar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowFavoritesBar(prev => !prev)
      }

      // Ctrl/Cmd + C: Toggle comparison view
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        if (comparisonModelIds.length > 0) {
          setViewMode(prev => prev === 'browse' ? 'compare' : 'browse')
        }
      }

      // Escape: Close modal
      if (e.key === 'Escape' && viewMode === 'compare') {
        e.stopPropagation()
        setViewMode('browse')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, comparisonModelIds.length, viewMode])

  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModelId(modelId)
    const model = models.find(m => m.id === modelId)
    setSelectedDetailModel(model || null)
  }, [models])

  const handleSelect = useCallback(() => {
    if (currentModelId) {
      addRecent(currentModelId)
      onSelect(currentModelId)
      onClose()
    }
  }, [currentModelId, addRecent, onSelect, onClose])

  const handleSelectFromComparison = useCallback((modelId: string) => {
    addRecent(modelId)
    onSelect(modelId)
    onClose()
  }, [addRecent, onSelect, onClose])

  const handleToggleFavorite = useCallback(() => {
    if (selectedDetailModel) {
      toggleFavorite(selectedDetailModel.id)
    }
  }, [selectedDetailModel, toggleFavorite])

  const handleAddToCompare = useCallback(() => {
    if (selectedDetailModel && comparisonModelIds.length < 3) {
      if (!comparisonModelIds.includes(selectedDetailModel.id)) {
        setComparisonModelIds(prev => [...prev, selectedDetailModel.id])
      } else {
        setComparisonModelIds(prev => prev.filter(id => id !== selectedDetailModel.id))
      }
    } else if (selectedDetailModel && comparisonModelIds.includes(selectedDetailModel.id)) {
      setComparisonModelIds(prev => prev.filter(id => id !== selectedDetailModel.id))
    }
  }, [selectedDetailModel, comparisonModelIds])

  const handleRemoveFromCompare = useCallback((modelId: string) => {
    setComparisonModelIds(prev => prev.filter(id => id !== modelId))
  }, [])

  const handleSelectFavoriteOrRecent = useCallback((modelId: string) => {
    setCurrentModelId(modelId)
    const model = models.find(m => m.id === modelId)
    setSelectedDetailModel(model || null)
    setViewMode('browse')
  }, [models])

  // Get models for favorites and recents
  const favoriteModels = models.filter(m => favorites.includes(m.id))
  const recentModels = models.filter(m => recents.includes(m.id))
  const comparisonModels = models.filter(m => comparisonModelIds.includes(m.id))

  const isModelInComparison = selectedDetailModel ? comparisonModelIds.includes(selectedDetailModel.id) : false

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="sm:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[75vw] sm:max-w-[1800px] h-[80vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              Select OpenRouter Model
            </h2>
            {viewMode === 'browse' && comparisonModelIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('compare')}
              >
                📊 Compare ({comparisonModelIds.length})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Ctrl+K: Search • Ctrl+F: Favorites • Ctrl+C: Compare
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Favorites/Recents Bar */}
        {viewMode === 'browse' && showFavoritesBar && (favoriteModels.length > 0 || recentModels.length > 0) && (
          <div className="px-6 py-3 border-b border-border bg-muted/10">
            <div className="flex items-start gap-4">
              {/* Favorites */}
              {favoriteModels.length > 0 && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Favorites</div>
                  <div className="flex flex-wrap gap-2">
                    {favoriteModels.map(model => (
                      <ModelFavoritesChip
                        key={model.id}
                        modelId={model.id}
                        modelName={model.name}
                        isSelected={currentModelId === model.id}
                        onClick={() => handleSelectFavoriteOrRecent(model.id)}
                        onRemove={() => toggleFavorite(model.id)}
                        type="favorite"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recents */}
              {recentModels.length > 0 && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Recently Used</div>
                  <div className="flex flex-wrap gap-2">
                    {recentModels.map(model => (
                      <ModelFavoritesChip
                        key={model.id}
                        modelId={model.id}
                        modelName={model.name}
                        isSelected={currentModelId === model.id}
                        onClick={() => handleSelectFavoriteOrRecent(model.id)}
                        type="recent"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle Button */}
              <button
                onClick={() => setShowFavoritesBar(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Hide favorites/recents"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'browse' ? (
            <>
              {/* Left Panel - Model List */}
              <div className="border-r border-border flex flex-col w-3/5">
                <div className="p-4 w-full">
                  <Autocomplete
                    id="model-picker"
                    placeholder="Search models (e.g., 'gpt', 'claude', 'llama')..."
                    options={models}
                    value={currentModelId}
                    onChange={handleModelChange}
                    showPopularFirst={true}
                    groupByCategory={true}
                    maxHeight="calc(95vh - 250px)"
                    isLoading={isLoading}
                    loadingMessage="Loading OpenRouter models..."
                    error={error}
                    onRetry={onRetry}
                    enableFilters={true}
                    filters={modelFilters}
                    onFiltersChange={setModelFilters}
                    defaultOpen={true}
                    persistentOpen={true}
                    className=""
                  />
                </div>
              </div>

              {/* Right Panel - Model Details */}
              <ModelDetailPanel
                model={selectedDetailModel}
                onSelect={handleSelect}
                onAddToCompare={handleAddToCompare}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={selectedDetailModel ? isFavorite(selectedDetailModel.id) : false}
                isInComparison={isModelInComparison}
                comparisonFull={comparisonModelIds.length >= 3}
              />
            </>
          ) : (
            /* Comparison View */
            <ModelComparisonView
              models={comparisonModels}
              onSelect={handleSelectFromComparison}
              onRemove={handleRemoveFromCompare}
              onBack={() => setViewMode('browse')}
            />
          )}
        </div>

        {/* Footer */}
        {viewMode === 'browse' && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
            <div className="text-sm text-muted-foreground">
              {models.length} models available
              {comparisonModelIds.length > 0 && ` • ${comparisonModelIds.length} in comparison`}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSelect}
                disabled={!currentModelId}
              >
                Select Model
              </Button>
            </div>
          </div>
        )}
    </Dialog>
  )
}
