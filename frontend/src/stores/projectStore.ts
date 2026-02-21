import { create } from 'zustand'
import { Project } from '@/types'
import { projectsApi } from '@/lib/api'
import { events } from '@/analytics/posthog'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  clearError: () => void
}

export const useProjects = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await projectsApi.getProjects()
      if (response.success) {
        set({ 
          projects: response.data?.items || [], 
          isLoading: false 
        })
      } else {
        set({ error: response.error || 'Failed to fetch projects', isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch projects', 
        isLoading: false 
      })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await projectsApi.getProject(id)
      if (response.success) {
        const project = response.data?.project
        set({
          currentProject: project,
          isLoading: false
        })
        if (project) {
          try { events.projectViewed(project.id, project.name) } catch {}
        }
      } else {
        set({ error: response.error || 'Failed to fetch project', isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch project', 
        isLoading: false 
      })
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project })
    if (project) {
      try { events.projectViewed({ projectId: project.id }); } catch {}
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))
