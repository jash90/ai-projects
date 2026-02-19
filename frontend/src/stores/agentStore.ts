import { create } from 'zustand'
import { Agent, AgentCreate, AgentUpdate } from '@/types'
import { agentsApi } from '@/lib/api'
import { events } from '@/analytics/posthog'

interface AgentState {
  agents: Agent[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchAgents: () => Promise<void>
  createAgent: (data: AgentCreate) => Promise<Agent>
  updateAgent: (id: string, data: AgentUpdate) => Promise<Agent>
  deleteAgent: (id: string) => Promise<void>
  clearError: () => void
}

export const useAgents = create<AgentState>((set) => ({
  agents: [],
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await agentsApi.getAgents()
      if (response.success) {
        set({ agents: response.data?.agents || [], isLoading: false })
      } else {
        set({ error: response.error || 'Failed to fetch agents', isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch agents', 
        isLoading: false 
      })
    }
  },

  createAgent: async (data: AgentCreate) => {
    set({ error: null })
    try {
      const response = await agentsApi.createAgent(data)
      if (response.success) {
        const newAgent = response.data?.agent
        set(state => ({
          agents: [...state.agents, newAgent]
        }))
        try { events.agentCreated(newAgent.id, '', newAgent.provider, newAgent.model) } catch {}
        return newAgent
      } else {
        const error = response.error || 'Failed to create agent'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agent'
      set({ error: errorMessage })
      throw error
    }
  },

  updateAgent: async (id: string, data: AgentUpdate) => {
    set({ error: null })
    try {
      const response = await agentsApi.updateAgent(id, data)
      if (response.success) {
        const updatedAgent = response.data?.agent
        set(state => ({
          agents: state.agents.map(agent =>
            agent.id === id ? updatedAgent : agent
          )
        }))
        try { events.agentUpdated(id, data as Record<string, unknown>) } catch {}
        return updatedAgent
      } else {
        const error = response.error || 'Failed to update agent'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update agent'
      set({ error: errorMessage })
      throw error
    }
  },

  deleteAgent: async (id: string) => {
    set({ error: null })
    try {
      const response = await agentsApi.deleteAgent(id)
      if (response.success) {
        // Only remove from state after successful API confirmation
        set(state => ({
          agents: state.agents.filter(agent => agent.id !== id)
        }))
        try { events.agentDeleted(id) } catch {}
      } else {
        const error = response.error || 'Failed to delete agent'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete agent'
      set({ error: errorMessage })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))