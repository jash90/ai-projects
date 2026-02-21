import { create } from 'zustand'
import { TextFile, FileCreate } from '@/types'
import { projectFilesApi } from '@/lib/api'
import { events } from '@/analytics/posthog'

interface FileState {
  // Files by project ID
  filesByProject: Record<string, TextFile[]>
  // Current file being edited
  currentFile: TextFile | null
  // Files being saved (by file ID)
  savingFiles: Set<string>
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchProjectFiles: (projectId: string) => Promise<void>
  getProjectFiles: (projectId: string) => TextFile[]
  getFileById: (fileId: string) => TextFile | null
  createFile: (projectId: string, data: FileCreate) => Promise<TextFile>
  updateFileContent: (fileId: string, content: string) => void
  saveFileContent: (fileId: string) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
  setCurrentFile: (file: TextFile | null) => void
  isSaving: (fileId: string) => boolean
  clearError: () => void
}

export const useFiles = create<FileState>((set, get) => ({
  filesByProject: {},
  currentFile: null,
  savingFiles: new Set(),
  isLoading: false,
  error: null,

  fetchProjectFiles: async (projectId: string) => {
    const state = get()
    
    // Prevent multiple simultaneous requests
    if (state.isLoading || state.filesByProject[projectId]) {
      console.log('🚫 Skipping fetchProjectFiles - already loading or cached:', projectId)
      return
    }
    
    console.log('🚀 Starting fetchProjectFiles for project:', projectId)
    const startTime = performance.now()
    
    set({ isLoading: true, error: null })
    try {
      // Fetch text files from the database
      const apiStartTime = performance.now()
      const response = await projectFilesApi.getFiles(projectId)
      const apiEndTime = performance.now()
      
      console.log(`📡 API call took: ${(apiEndTime - apiStartTime).toFixed(2)}ms`)
      
      const files = response.success ? (response.data?.files || []) : []
      console.log(`📁 Fetched ${files.length} files for project ${projectId}`)

      const renderStartTime = performance.now()
      set(state => ({
        filesByProject: {
          ...state.filesByProject,
          [projectId]: files
        },
        isLoading: false
      }))
      const renderEndTime = performance.now()
      
      const totalTime = performance.now() - startTime
      console.log(`⚡ Total fetchProjectFiles time: ${totalTime.toFixed(2)}ms (API: ${(apiEndTime - apiStartTime).toFixed(2)}ms, Render: ${(renderEndTime - renderStartTime).toFixed(2)}ms)`)
    } catch (error) {
      console.error('❌ Error in fetchProjectFiles:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch files', 
        isLoading: false 
      })
    }
  },

  getProjectFiles: (projectId: string) => {
    return get().filesByProject[projectId] || []
  },

  getFileById: (fileId: string) => {
    const { filesByProject } = get()
    for (const files of Object.values(filesByProject)) {
      const file = files.find(f => f.id === fileId)
      if (file) return file
    }
    return null
  },

  createFile: async (projectId: string, data: FileCreate) => {
    set({ error: null })
    try {
      const response = await projectFilesApi.createFile(projectId, data)
      if (response.success) {
        const newFile = response.data?.file
        set(state => ({
          filesByProject: {
            ...state.filesByProject,
            [projectId]: [...(state.filesByProject[projectId] || []), newFile]
          },
          currentFile: newFile
        }))
        try { events.fileCreated({ projectId, name: newFile?.name }); } catch {}
        return newFile
      } else {
        const error = response.error || 'Failed to create file'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create file'
      set({ error: errorMessage })
      throw error
    }
  },

  updateFileContent: (fileId: string, content: string) => {
    set(state => {
      const newFilesByProject = { ...state.filesByProject }
      let updatedCurrentFile = state.currentFile
      
      // Update in project files
      for (const [projectId, files] of Object.entries(newFilesByProject)) {
        const fileIndex = files.findIndex(f => f.id === fileId)
        if (fileIndex !== -1) {
          const updatedFiles = [...files]
          updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], content }
          newFilesByProject[projectId] = updatedFiles
          
          // Update current file if it's the same
          if (state.currentFile?.id === fileId) {
            updatedCurrentFile = { ...state.currentFile, content }
          }
          break
        }
      }
      
      return {
        filesByProject: newFilesByProject,
        currentFile: updatedCurrentFile
      }
    })
  },

  saveFileContent: async (fileId: string) => {
    const file = get().getFileById(fileId)
    if (!file) return

    set(state => ({
      savingFiles: new Set([...state.savingFiles, fileId]),
      error: null
    }))

    try {
      const response = await projectFilesApi.updateFile(fileId, {
        content: file.content
      })
      
      if (response.success) {
        const updatedFile = response.data?.file
        set(state => {
          const newFilesByProject = { ...state.filesByProject }
          let updatedCurrentFile = state.currentFile
          
          // Update in project files
          for (const [projectId, files] of Object.entries(newFilesByProject)) {
            const fileIndex = files.findIndex(f => f.id === fileId)
            if (fileIndex !== -1) {
              const updatedFiles = [...files]
              updatedFiles[fileIndex] = updatedFile
              newFilesByProject[projectId] = updatedFiles
              
              // Update current file if it's the same
              if (state.currentFile?.id === fileId) {
                updatedCurrentFile = updatedFile
              }
              break
            }
          }
          
          return {
            filesByProject: newFilesByProject,
            currentFile: updatedCurrentFile
          }
        })
      } else {
        const error = response.error || 'Failed to save file'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file'
      set({ error: errorMessage })
      throw error
    } finally {
      set(state => {
        const newSavingFiles = new Set(state.savingFiles)
        newSavingFiles.delete(fileId)
        return { savingFiles: newSavingFiles }
      })
    }
  },

  deleteFile: async (fileId: string) => {
    set({ error: null })
    try {
      const response = await projectFilesApi.deleteFile(fileId)
      if (response.success) {
        set(state => {
          const newFilesByProject = { ...state.filesByProject }
          let updatedCurrentFile = state.currentFile
          
          // Remove from project files
          for (const [projectId, files] of Object.entries(newFilesByProject)) {
            const filteredFiles = files.filter(f => f.id !== fileId)
            if (filteredFiles.length !== files.length) {
              newFilesByProject[projectId] = filteredFiles
              
              // Clear current file if it was deleted
              if (state.currentFile?.id === fileId) {
                updatedCurrentFile = null
              }
              break
            }
          }
          
          return {
            filesByProject: newFilesByProject,
            currentFile: updatedCurrentFile
          }
        })
        try { events.fileDeleted(); } catch {}
      } else {
        const error = response.error || 'Failed to delete file'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file'
      set({ error: errorMessage })
      throw error
    }
  },

  setCurrentFile: (file: TextFile | null) => {
    set({ currentFile: file })
  },

  isSaving: (fileId: string) => {
    return get().savingFiles.has(fileId)
  },

  clearError: () => {
    set({ error: null })
  }
}))