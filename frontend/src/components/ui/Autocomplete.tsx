import React, { useState, useRef, useEffect } from 'react'
import { Input } from './Input'
import { Label } from './Label'

export interface AutocompleteOption {
  id: string
  name: string
  description?: string
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
  className = ''
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Get the display value from the selected option
  const selectedOption = options.find(opt => opt.id === value)
  const displayValue = selectedOption ? selectedOption.name : ''

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
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
    setSearchQuery('')
  }

  const handleOptionSelect = (optionId: string) => {
    onChange(optionId)
    setIsOpen(false)
    setSearchQuery('')
    inputRef.current?.blur()
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
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex].id)
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative mt-1">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={error ? 'border-destructive' : ''}
          autoComplete="off"
        />
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              <ul ref={listRef} className="py-1">
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      index === highlightedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    } ${
                      option.id === value
                        ? 'bg-accent/30'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{option.name}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No results found
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
