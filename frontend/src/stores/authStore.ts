import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, AuthTokens } from '@/types'
import { settingsApi } from '@/lib/api'
import { uiStore } from './uiStore'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setUser: (user: User) => void
  setTokens: (tokens: AuthTokens) => void
  setLoading: (loading: boolean) => void
  login: (user: User, tokens: AuthTokens) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  syncPreferencesFromServer: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

export const authStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user) => {
        set({ user, isAuthenticated: !!user })
      },

      setTokens: (tokens) => {
        set({ tokens })
      },

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      login: (user, tokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      updateUser: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates }
          })
        }
      },

      syncPreferencesFromServer: async () => {
        try {
          const response = await settingsApi.getPreferences()
          if (response.data?.preferences) {
            const { theme } = response.data.preferences
            if (theme) {
              uiStore.getState().setTheme(theme)
            }
          }
        } catch (error) {
          console.error('Failed to sync preferences from server:', error)
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Selectors
export const useAuth = () => authStore()
export const useUser = () => authStore((state) => state.user)
export const useTokens = () => authStore((state) => state.tokens)
export const useIsAuthenticated = () => authStore((state) => state.isAuthenticated)
export const useIsAuthLoading = () => authStore((state) => state.isLoading)