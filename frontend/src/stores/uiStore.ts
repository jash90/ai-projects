import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Theme } from '@/types'
import { setTheme } from '@/lib/utils'
import { events } from '@/analytics/posthog'

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  rightPanelCollapsed: boolean
  activeProject: string | null
  searchQuery: string
  isCommandPaletteOpen: boolean
}

interface UIActions {
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleRightPanel: () => void
  setRightPanelCollapsed: (collapsed: boolean) => void
  setActiveProject: (projectId: string | null) => void
  setSearchQuery: (query: string) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void
}

type UIStore = UIState & UIActions

export const uiStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      theme: 'system',
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
      activeProject: null,
      searchQuery: '',
      isCommandPaletteOpen: false,

      // Actions
      setTheme: (theme) => {
        set({ theme })
        setTheme(theme)
        try { events.themeChanged(theme); } catch {}
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
      },

      toggleRightPanel: () => {
        set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed }))
      },

      setRightPanelCollapsed: (collapsed) => {
        set({ rightPanelCollapsed: collapsed })
      },

      setActiveProject: (projectId) => {
        set({ activeProject: projectId })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      openCommandPalette: () => {
        set({ isCommandPaletteOpen: true })
      },

      closeCommandPalette: () => {
        set({ isCommandPaletteOpen: false })
      },

      toggleCommandPalette: () => {
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }))
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelCollapsed: state.rightPanelCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          setTheme(state.theme)
        }
      },
    }
  )
)

// Selectors
export const useUI = () => uiStore()
export const useTheme = () => uiStore((state) => state.theme)
export const useSidebarCollapsed = () => uiStore((state) => state.sidebarCollapsed)
export const useRightPanelCollapsed = () => uiStore((state) => state.rightPanelCollapsed)
export const useActiveProject = () => uiStore((state) => state.activeProject)
export const useSearchQuery = () => uiStore((state) => state.searchQuery)
export const useCommandPalette = () => uiStore((state) => ({
  isOpen: state.isCommandPaletteOpen,
  open: state.openCommandPalette,
  close: state.closeCommandPalette,
  toggle: state.toggleCommandPalette,
}))