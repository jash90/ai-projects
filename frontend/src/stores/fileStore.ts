import { create } from 'zustand'
import { File, FileCreate, FileUpdate } from '@/types'
import { projectFilesApi } from '@/lib/api'

interface FileState {
  // Files by project ID
  filesByProject: Record<string, File[]>
  // Current file being edited
  currentFile: File | null
  // Files being saved (by file ID)
  savingFiles: Set<string>
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchProjectFiles: (projectId: string) => Promise<void>
  getProjectFiles: (projectId: string) => File[]
  getFileById: (fileId: string) => File | null
  createFile: (projectId: string, data: FileCreate) => Promise<File>
  updateFileContent: (fileId: string, content: string) => void
  saveFileContent: (fileId: string) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
  setCurrentFile: (file: File | null) => void
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
    set({ isLoading: true, error: null })
    try {
      // Fetch text files from the database
      const response = await projectFilesApi.getFiles(projectId)
      
      const files = response.success ? (response.data?.files || []) : []

      set(state => ({
        filesByProject: {
          ...state.filesByProject,
          [projectId]: files
        },
        isLoading: false
      }))
    } catch (error) {
      console.error('Error in fetchProjectFiles:', error)
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
        const newFile = response.data.file
        set(state => ({
          filesByProject: {
            ...state.filesByProject,
            [projectId]: [...(state.filesByProject[projectId] || []), newFile]
          },
          currentFile: newFile
        }))
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
        const updatedFile = response.data.file
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

  setCurrentFile: (file: File | null) => {
    set({ currentFile: file })
  },

  isSaving: (fileId: string) => {
    return get().savingFiles.has(fileId)
  },

  clearError: () => {
    set({ error: null })
  }
}))