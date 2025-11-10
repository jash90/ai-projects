import React, { useState, useRef, useEffect, useId } from 'react'
import { Input } from './Input'
import { Label } from './Label'
import { useDebounce } from '@/hooks/useDebounce'

export interface AutocompleteOption {
  id: string
  name: string
  description?: string
  category?: string
  isPopular?: boolean
  metadata?: {
    provider?: string
    cost?: string
    contextWindow?: number
  }
}

export interface AutocompleteFilters {
  costTiers?: string[]      // Filter by cost tiers (e.g., ['Free', 'Low'])
  minContextWindow?: number  // Minimum context window size
  maxContextWindow?: number  // Maximum context window size
  providers?: string[]       // Filter by provider names
}

interface AutocompleteProps {
  id?: string
  label?: string
  placeholder?: string
  options: AutocompleteOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  helperText?: string
  className?: string
  showPopularFirst?: boolean
  groupByCategory?: boolean
  maxHeight?: string
  isLoading?: boolean
  loadingMessage?: string
  onRetry?: () => void
  enableFilters?: boolean      // Enable advanced filtering UI
  filters?: AutocompleteFilters // Current filter values
  onFiltersChange?: (filters: AutocompleteFilters) => void // Filter change callback
  defaultOpen?: boolean        // Show dropdown open by default
  persistentOpen?: boolean     // Keep dropdown open after selection
  inputRef?: React.RefObject<HTMLInputElement> // Optional ref to the input element
}

export function Autocomplete({
  id,
  label,
  placeholder = 'Search...',
  options,
  value,
  onChange,
  disabled = false,
  error,
  helperText,
  className = '',
  showPopularFirst = false,
  groupByCategory = false,
  maxHeight = '400px',
  isLoading = false,
  loadingMessage = 'Loading...',
  onRetry,
  enableFilters = false,
  filters = {},
  onFiltersChange,
  defaultOpen = false,
  persistentOpen = false,
  inputRef: externalInputRef
}: AutocompleteProps) {
  // Generate stable unique ID for ARIA attributes when id prop is not provided
  const generatedId = useId()
  const baseId = id ?? generatedId

  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const internalInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Use external ref if provided, otherwise use internal ref
  const inputRef = externalInputRef || internalInputRef

  // Debounce search query to improve performance with large datasets (340+ models)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Get the display value from the selected option
  const selectedOption = options.find(opt => opt.id === value)
  const displayValue = selectedOption ? selectedOption.name : ''

  // Apply filters to options
  const applyFilters = (option: AutocompleteOption): boolean => {
    if (!enableFilters) return true

    // Cost tier filter
    if (filters.costTiers && filters.costTiers.length > 0) {
      const optionCost = option.metadata?.cost
      if (!optionCost || !filters.costTiers.includes(optionCost)) {
        return false
      }
    }

    // Context window filter
    const contextWindow = option.metadata?.contextWindow
    if (contextWindow !== undefined) {
      if (filters.minContextWindow !== undefined && contextWindow < filters.minContextWindow) {
        return false
      }
      if (filters.maxContextWindow !== undefined && contextWindow > filters.maxContextWindow) {
        return false
      }
    }

    // Provider filter
    if (filters.providers && filters.providers.length > 0) {
      const optionProvider = option.metadata?.provider || option.category
      if (!optionProvider || !filters.providers.includes(optionProvider)) {
        return false
      }
    }

    return true
  }

  // Check if any filters are active
  const hasActiveFilters = enableFilters && (
    (filters.costTiers && filters.costTiers.length > 0) ||
    filters.minContextWindow !== undefined ||
    filters.maxContextWindow !== undefined ||
    (filters.providers && filters.providers.length > 0)
  )

  // Enhanced search with ranking
  const rankOption = (option: AutocompleteOption, query: string): number => {
    if (!query) return 0

    const lowerQuery = query.toLowerCase()
    const lowerName = option.name.toLowerCase()
    const lowerId = option.id.toLowerCase()

    // Exact match gets highest priority
    if (lowerName === lowerQuery || lowerId === lowerQuery) return 1000

    // Starts with query gets high priority
    if (lowerName.startsWith(lowerQuery) || lowerId.startsWith(lowerQuery)) return 500

    // Contains query in name
    if (lowerName.includes(lowerQuery)) return 300

    // Contains query in ID
    if (lowerId.includes(lowerQuery)) return 200

    // Check category and description
    if (option.category?.toLowerCase().includes(lowerQuery)) return 100
    if (option.description?.toLowerCase().includes(lowerQuery)) return 50

    return 0
  }

  // Filter and sort options based on debounced search query and filters for better performance
  const filteredOptions = React.useMemo(() => {
    // Step 1: Apply advanced filters first
    let filtered = enableFilters ? options.filter(applyFilters) : options

    // Step 2: Apply search filter using debounced query
    if (debouncedSearchQuery) {
      filtered = filtered
        .map(option => ({ option, rank: rankOption(option, debouncedSearchQuery) }))
        .filter(({ rank }) => rank > 0)
        .sort((a, b) => {
          // Sort by rank first
          if (b.rank !== a.rank) return b.rank - a.rank
          // Then by popularity
          if (a.option.isPopular !== b.option.isPopular) {
            return a.option.isPopular ? -1 : 1
          }
          // Finally alphabetically
          return a.option.name.localeCompare(b.option.name)
        })
        .map(({ option }) => option)
    } else {
      // No search query - show all filtered options with optional popular first
      if (showPopularFirst) {
        // Create a shallow copy to avoid mutating the original props array
        filtered = [...filtered].sort((a, b) => {
          if (a.isPopular !== b.isPopular) {
            return a.isPopular ? -1 : 1
          }
          if (groupByCategory && a.category !== b.category) {
            return (a.category || '').localeCompare(b.category || '')
          }
          return a.name.localeCompare(b.name)
        })
      }
    }

    return filtered
  }, [options, debouncedSearchQuery, showPopularFirst, groupByCategory, enableFilters, filters])

  // Group options by category if enabled
  const groupedOptions = React.useMemo(() => {
    // Disable grouping when searching for better UX
    if (!groupByCategory || debouncedSearchQuery) {
      return [{ category: null, options: filteredOptions }]
    }

    const groups = new Map<string, AutocompleteOption[]>()

    filteredOptions.forEach(option => {
      const category = option.category || 'Other'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(option)
    })

    return Array.from(groups.entries()).map(([category, options]) => ({
      category,
      options
    }))
  }, [filteredOptions, groupByCategory, debouncedSearchQuery])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Only close if NOT in persistent mode
        if (!persistentOpen) {
          setIsOpen(false)
          setSearchQuery('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [persistentOpen])

  // Get flat list of all options for keyboard navigation
  const flatOptions = React.useMemo(() =>
    groupedOptions.flatMap(group => group.options),
    [groupedOptions]
  )

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [flatOptions.length])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const allItems = listRef.current.querySelectorAll('[data-option-index]')
      const highlightedElement = allItems[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    // Don't clear search query immediately - it will be cleared when user starts typing
    // This provides better UX as the selected value remains visible until typing starts
    if (!searchQuery && displayValue) {
      setSearchQuery(displayValue)
    }
    // Select the text so it's ready to be replaced
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleOptionSelect = (optionId: string) => {
    onChange(optionId)

    // Only close dropdown if NOT in persistent mode
    if (!persistentOpen) {
      setIsOpen(false)
      setSearchQuery('')
      inputRef.current?.blur()
    } else {
      // In persistent mode: clear search to show full list with selection
      setSearchQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < flatOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : flatOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (flatOptions[highlightedIndex]) {
          handleOptionSelect(flatOptions[highlightedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery('')
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        setSearchQuery('')
        break
    }
  }

  // Extract unique values for filter options
  const availableCostTiers = React.useMemo(() => {
    const tiers = new Set<string>()
    options.forEach(opt => {
      if (opt.metadata?.cost) tiers.add(opt.metadata.cost)
    })
    return Array.from(tiers).sort()
  }, [options])

  const availableProviders = React.useMemo(() => {
    const providers = new Set<string>()
    options.forEach(opt => {
      const provider = opt.metadata?.provider || opt.category
      if (provider) providers.add(provider)
    })
    return Array.from(providers).sort()
  }, [options])

  const toggleFilter = (filterType: 'cost' | 'provider', value: string) => {
    if (!onFiltersChange) return

    const newFilters = { ...filters }

    if (filterType === 'cost') {
      const current = newFilters.costTiers || []
      newFilters.costTiers = current.includes(value)
        ? current.filter(t => t !== value)
        : [...current, value]
    } else if (filterType === 'provider') {
      const current = newFilters.providers || []
      newFilters.providers = current.includes(value)
        ? current.filter(p => p !== value)
        : [...current, value]
    }

    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({})
    }
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const expandAllCategories = () => {
    setCollapsedCategories(new Set())
  }

  const collapseAllCategories = () => {
    const allCategories = new Set(groupedOptions.map(g => g.category).filter(Boolean) as string[])
    setCollapsedCategories(allCategories)
  }

  // Generate unique IDs for ARIA relationships
  const listboxId = `${baseId}-listbox`
  const activeDescendantId = flatOptions[highlightedIndex] ? `${baseId}-option-${highlightedIndex}` : undefined

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <Label htmlFor={baseId}>{label}</Label>}
      <div className="relative mt-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              id={baseId}
              type="text"
              value={isOpen ? searchQuery : displayValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={isOpen ? activeDescendantId : undefined}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-label={label || placeholder}
            />
            {/* Screen reader announcements */}
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {isOpen && flatOptions.length > 0 && (
                `${flatOptions.length} ${flatOptions.length === 1 ? 'option' : 'options'} available`
              )}
              {isOpen && flatOptions.length === 0 && !isLoading && (
                'No options available'
              )}
              {isLoading && 'Loading options...'}
            </div>
          </div>
          {enableFilters && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors ${
                hasActiveFilters ? 'bg-primary text-primary-foreground' : 'bg-background'
              }`}
              title="Toggle filters"
            >
              🔍 {hasActiveFilters && `(${
                (filters.costTiers?.length || 0) +
                (filters.providers?.length || 0) +
                (filters.minContextWindow ? 1 : 0) +
                (filters.maxContextWindow ? 1 : 0)
              })`}
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {enableFilters && showFilters && (
          <div className="mt-2 p-3 bg-muted/50 border border-border rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Cost Tier Filter */}
            {availableCostTiers.length > 0 && (
              <div>
                <Label className="text-xs">Cost Tier</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableCostTiers.map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => toggleFilter('cost', tier)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        filters.costTiers?.includes(tier)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Filter */}
            {availableProviders.length > 0 && (
              <div>
                <Label className="text-xs">Provider</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableProviders.map(provider => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => toggleFilter('provider', provider)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        filters.providers?.includes(provider)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary'
                      }`}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context Window Filter */}
            <div>
              <Label className="text-xs">Context Window (tokens)</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minContextWindow || ''}
                    onChange={(e) => onFiltersChange?.({ ...filters, minContextWindow: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                  />
                </div>
                <span className="text-xs text-muted-foreground self-center">to</span>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxContextWindow || ''}
                    onChange={(e) => onFiltersChange?.({ ...filters, maxContextWindow: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isOpen && (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={`${label || placeholder} options`}
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg overflow-auto"
            style={{ maxHeight }}
          >
            {/* Loading State */}
            {isLoading ? (
              <div className="px-3 py-8 text-sm text-center text-muted-foreground">
                <div className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-3"></div>
                <div>{loadingMessage}</div>
              </div>
            ) : error ? (
              /* Error State */
              <div className="px-3 py-8 text-sm text-center">
                <div className="text-2xl mb-2">⚠️</div>
                <div className="text-destructive font-medium mb-2">Failed to load options</div>
                <div className="text-muted-foreground text-xs mb-3">{error}</div>
                {onRetry && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRetry()
                    }}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            ) : flatOptions.length > 0 ? (
              /* Options List */
              <div className="py-1">
                {/* Model count indicator */}
                {!debouncedSearchQuery && options.length > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/30 flex items-center justify-between">
                    <span>
                      {options.length} {options.length === 1 ? 'model' : 'models'} available
                      {showPopularFirst && ' • ⭐ Popular models first'}
                    </span>
                    {groupByCategory && groupedOptions.length > 1 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={expandAllCategories}
                          className="text-primary hover:underline"
                          title="Expand all categories"
                        >
                          Expand all
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button
                          type="button"
                          onClick={collapseAllCategories}
                          className="text-primary hover:underline"
                          title="Collapse all categories"
                        >
                          Collapse all
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {debouncedSearchQuery && flatOptions.length > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/30">
                    {flatOptions.length} {flatOptions.length === 1 ? 'result' : 'results'} for "{debouncedSearchQuery}"
                  </div>
                )}
                {groupedOptions.map((group, groupIndex) => {
                  let currentIndex = groupedOptions
                    .slice(0, groupIndex)
                    .reduce((sum, g) => sum + g.options.length, 0)

                  const isCollapsed = group.category && collapsedCategories.has(group.category)

                  return (
                    <div key={group.category || 'default'}>
                      {group.category && (
                        <button
                          type="button"
                          onClick={() => toggleCategory(group.category!)}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 sticky top-0 hover:bg-muted transition-colors flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <span className="transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                              ▼
                            </span>
                            <span>{group.category}</span>
                            <span className="text-xs font-normal normal-case opacity-60">
                              ({group.options.length})
                            </span>
                          </span>
                          <span className="text-xs font-normal normal-case opacity-0 group-hover:opacity-100 transition-opacity">
                            {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                          </span>
                        </button>
                      )}
                      {!isCollapsed && group.options.map((option, optionIndex) => {
                        const globalIndex = currentIndex + optionIndex
                        const isHighlighted = globalIndex === highlightedIndex
                        const isSelected = option.id === value
                        const optionId = `${baseId}-option-${globalIndex}`

                        return (
                          <div
                            key={option.id}
                            id={optionId}
                            role="option"
                            aria-selected={isSelected}
                            aria-label={`${option.name}${option.metadata?.provider ? `, Provider: ${option.metadata.provider}` : ''}${option.metadata?.cost ? `, Cost: ${option.metadata.cost}` : ''}`}
                            data-option-index={globalIndex}
                            onClick={() => handleOptionSelect(option.id)}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            className={`px-3 py-2 cursor-pointer transition-colors ${
                              isHighlighted
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50'
                            } ${
                              isSelected
                                ? 'bg-accent/30'
                                : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {option.isPopular && (
                                    <span className="text-yellow-500 text-xs" title="Popular">⭐</span>
                                  )}
                                  <span className="text-sm font-medium truncate">{option.name}</span>
                                </div>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {option.description}
                                  </p>
                                )}
                                {option.metadata && (
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {option.metadata.provider && (
                                      <span className="flex items-center gap-1">
                                        <span className="opacity-70">Provider:</span>
                                        <span className="font-medium">{option.metadata.provider}</span>
                                      </span>
                                    )}
                                    {option.metadata.contextWindow && (
                                      <span className="flex items-center gap-1">
                                        <span className="opacity-70">Context:</span>
                                        <span className="font-medium">{(option.metadata.contextWindow / 1000).toFixed(0)}K</span>
                                      </span>
                                    )}
                                    {option.metadata.cost && (
                                      <span className="flex items-center gap-1">
                                        <span className="opacity-70">Cost:</span>
                                        <span className="font-medium">{option.metadata.cost}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-accent-foreground text-sm">✓</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-3 py-8 text-sm text-center text-muted-foreground">
                <div className="text-2xl mb-2">🔍</div>
                <div>No models found</div>
                <div className="text-xs mt-1">Try a different search term</div>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
