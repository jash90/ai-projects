import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, AuthTokens } from '@/types'
import { settingsApi, authApi } from '@/lib/api'
import { uiStore } from './uiStore'
import { setUser as setAnalyticsUser, clearUser as clearAnalyticsUser, events as posthogEvents } from '@/analytics'

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
        // Set analytics user context
        if (user) {
          setAnalyticsUser({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          })
        }
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
        // Set analytics user context and track login
        setAnalyticsUser({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        })
        try { posthogEvents.loginCompleted('credentials') } catch {}
      },

      logout: () => {
        // Track logout before clearing
        try { posthogEvents.logoutCompleted() } catch {}
        // Clear analytics user context
        clearAnalyticsUser()

        // Invalidate refresh token on the server (fire-and-forget)
        authApi.logout().catch(() => {})

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
          const updatedUser = { ...currentUser, ...updates }
          set({ user: updatedUser })
          // Update analytics user context
          setAnalyticsUser({
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            role: updatedUser.role,
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
      // Restore analytics user context on rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.user && state.isAuthenticated) {
          setAnalyticsUser({
            id: state.user.id,
            email: state.user.email,
            username: state.user.username,
            role: state.user.role,
          })
        }
      },
    }
  )
)

// Selectors
export const useAuth = () => authStore()
export const useUser = () => authStore((state) => state.user)
export const useTokens = () => authStore((state) => state.tokens)
export const useIsAuthenticated = () => authStore((state) => state.isAuthenticated)
export const useIsAuthLoading = () => authStore((state) => state.isLoading)