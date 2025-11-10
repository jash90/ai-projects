import { useState, useEffect, useCallback } from 'react'

const FAVORITES_KEY = 'openrouter_favorite_models'
const RECENTS_KEY = 'openrouter_recent_models'
const MAX_RECENTS = 5

export interface ModelPreferences {
  favorites: string[]
  recents: string[]
  addFavorite: (id: string) => void
  removeFavorite: (id: string) => void
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  addRecent: (id: string) => void
  clearRecents: () => void
}

/**
 * Custom hook for managing model favorites and recent selections
 * Persists data to localStorage
 */
export function useModelPreferences(): ModelPreferences {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY)
      const storedRecents = localStorage.getItem(RECENTS_KEY)

      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites))
      }
      if (storedRecents) {
        setRecents(JSON.parse(storedRecents))
      }
    } catch (error) {
      console.error('Failed to load model preferences:', error)
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    } catch (error) {
      console.error('Failed to save favorites:', error)
    }
  }, [favorites])

  // Save recents to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(recents))
    } catch (error) {
      console.error('Failed to save recents:', error)
    }
  }, [recents])

  const addFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(favId => favId !== id))
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(favId => favId !== id)
      } else {
        return [...prev, id]
      }
    })
  }, [])

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id)
  }, [favorites])

  const addRecent = useCallback((id: string) => {
    setRecents(prev => {
      // Remove if already exists (to move to front)
      const filtered = prev.filter(recentId => recentId !== id)
      // Add to front
      const updated = [id, ...filtered]
      // Keep only MAX_RECENTS items
      return updated.slice(0, MAX_RECENTS)
    })
  }, [])

  const clearRecents = useCallback(() => {
    setRecents([])
  }, [])

  return {
    favorites,
    recents,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    addRecent,
    clearRecents
  }
}
