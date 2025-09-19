import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MarkdownContent {
  id: string
  content: string
  lastModified: Date
}

interface MarkdownStoreState {
  contents: Map<string, MarkdownContent>
  currentFileId: string | null

  // Actions
  getContent: (fileId: string) => string | undefined
  updateContent: (fileId: string, content: string) => void
  setCurrentFile: (fileId: string | null) => void
  clearContent: (fileId: string) => void
  clearAll: () => void
}

export const useMarkdownStore = create<MarkdownStoreState>()(
  persist(
    (set, get) => ({
      contents: new Map(),
      currentFileId: null,

      getContent: (fileId: string) => {
        const content = get().contents.get(fileId)
        return content?.content
      },

      updateContent: (fileId: string, content: string) => {
        set((state) => {
          const newContents = new Map(state.contents)
          newContents.set(fileId, {
            id: fileId,
            content,
            lastModified: new Date()
          })
          return { contents: newContents }
        })
      },

      setCurrentFile: (fileId: string | null) => {
        set({ currentFileId: fileId })
      },

      clearContent: (fileId: string) => {
        set((state) => {
          const newContents = new Map(state.contents)
          newContents.delete(fileId)
          return { contents: newContents }
        })
      },

      clearAll: () => {
        set({ contents: new Map(), currentFileId: null })
      }
    }),
    {
      name: 'markdown-store',
      // Custom serialization for Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const { state } = JSON.parse(str)
          return {
            state: {
              ...state,
              contents: new Map(state.contents)
            }
          }
        },
        setItem: (name, value) => {
          const { state } = value as any
          localStorage.setItem(name, JSON.stringify({
            state: {
              ...state,
              contents: Array.from(state.contents.entries())
            }
          }))
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
)