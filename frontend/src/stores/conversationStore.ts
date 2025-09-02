import { create } from 'zustand'
import { Conversation, ConversationMessage } from '@/types'
import { conversationsApi, chatApi } from '@/lib/api'
import { formatChatErrorMessage } from '@/utils/errorMessages'

interface ConversationState {
  // Conversations by project-agent key (projectId-agentId)
  conversations: Record<string, Conversation>
  // Sending states by project-agent key
  sendingStates: Record<string, boolean>
  error: string | null
  
  // Actions
  getConversation: (projectId: string, agentId: string) => Promise<Conversation>
  sendMessage: (projectId: string, agentId: string, content: string, includeFiles?: boolean) => Promise<void>
  sendStreamingMessage: (projectId: string, agentId: string, content: string, includeFiles?: boolean) => Promise<void>
  clearConversation: (projectId: string, agentId: string) => Promise<void>
  clearError: () => void
}

const getConversationKey = (projectId: string, agentId: string) => `${projectId}-${agentId}`

export const conversationStore = create<ConversationState>((set, get) => ({
  conversations: {},
  sendingStates: {},
  error: null,

  getConversation: async (projectId: string, agentId: string) => {
    const key = getConversationKey(projectId, agentId)
    const existing = get().conversations[key]
    
    // Return existing if we have it
    if (existing) {
      return existing
    }

    set({ error: null })
    try {
      const response = await conversationsApi.getConversation(projectId, agentId)
      if (response.success) {
        const conversation = response.data.conversation
        set(state => ({
          conversations: {
            ...state.conversations,
            [key]: conversation
          }
        }))
        return conversation
      } else {
        const error = response.error || 'Failed to fetch conversation'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversation'
      set({ error: errorMessage })
      throw error
    }
  },

  sendMessage: async (projectId: string, agentId: string, content: string, includeFiles = true, stream = false) => {
    const key = getConversationKey(projectId, agentId)
    
    set(state => ({
      sendingStates: { ...state.sendingStates, [key]: true },
      error: null
    }))

    try {
      // Add optimistic user message
      const tempMessage: ConversationMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      set(state => {
        const conversation = state.conversations[key]
        if (conversation) {
          return {
            conversations: {
              ...state.conversations,
              [key]: {
                ...conversation,
                messages: [...conversation.messages, tempMessage]
              }
            }
          }
        }
        return state
      })

      // Send message to backend
      const response = await chatApi.sendMessage(projectId, agentId, {
        message: content,
        includeFiles: includeFiles
      })

      if (response.success) {
        const { conversation } = response.data
        
        // Replace optimistic message with updated conversation
        set(state => ({
          conversations: {
            ...state.conversations,
            [key]: conversation
          }
        }))
      } else {
        // Update optimistic message with error
        set(state => {
          const conversation = state.conversations[key]
          if (conversation) {
            return {
              conversations: {
                ...state.conversations,
                [key]: {
                  ...conversation,
                  messages: conversation.messages.map(m => 
                    m.id === tempMessage.id 
                      ? { ...m, error: response.error || 'Failed to send message' }
                      : m
                  )
                }
              }
            }
          }
          return state
        })
        
        const error = response.error || 'Failed to send message'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      let errorMessage = 'Failed to send message'
      
      // Extract and format error messages for better UX
      if (error instanceof Error) {
        // Check if this is a structured API error
        const errorData = (error as any).errorData;
        if (errorData) {
          errorMessage = formatChatErrorMessage(errorData);
        } else {
          errorMessage = formatChatErrorMessage(error.message);
        }
      }
      
      // Update optimistic message with specific error
      set(state => {
        const conversation = state.conversations[key]
        if (conversation) {
          return {
            conversations: {
              ...state.conversations,
              [key]: {
                ...conversation,
                messages: conversation.messages.map(m => 
                  m.id === tempMessage.id 
                    ? { ...m, error: errorMessage }
                    : m
                )
              }
            }
          }
        }
        return state
      })
      
      set({ error: errorMessage })
      throw error
    } finally {
      set(state => ({
        sendingStates: { ...state.sendingStates, [key]: false }
      }))
    }
  },

  sendStreamingMessage: async (projectId: string, agentId: string, content: string, includeFiles = true) => {
    const key = getConversationKey(projectId, agentId)
    
    set(state => ({
      sendingStates: { ...state.sendingStates, [key]: true },
      error: null
    }))

    try {
      // Add optimistic user message
      const tempMessage: ConversationMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      set(state => {
        const conversation = state.conversations[key]
        if (conversation) {
          return {
            conversations: {
              ...state.conversations,
              [key]: {
                ...conversation,
                messages: [...conversation.messages, tempMessage]
              }
            }
          }
        }
        return state
      })

      // Add temporary AI message for streaming
      const aiTempMessage: ConversationMessage = {
        id: `ai-temp-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      set(state => {
        const conversation = state.conversations[key]
        if (conversation) {
          return {
            conversations: {
              ...state.conversations,
              [key]: {
                ...conversation,
                messages: [...conversation.messages, aiTempMessage]
              }
            }
          }
        }
        return state
      })

      // Start streaming
      await chatApi.sendStreamingMessage(
        projectId,
        agentId,
        { message: content, includeFiles },
        (chunk: string) => {
          // Update streaming message content
          set(state => {
            const conversation = state.conversations[key]
            if (conversation) {
              return {
                conversations: {
                  ...state.conversations,
                  [key]: {
                    ...conversation,
                    messages: conversation.messages.map(m => 
                      m.id === aiTempMessage.id 
                        ? { ...m, content: m.content + chunk }
                        : m
                    )
                  }
                }
              }
            }
            return state
          })
        },
        (response: any) => {
          // Replace with final conversation
          set(state => ({
            conversations: {
              ...state.conversations,
              [key]: response.conversation
            }
          }))
        },
        (error: string | any) => {
          // Handle streaming error with better error messages
          const errorMessage = formatChatErrorMessage(error)
          
          set(state => {
            const conversation = state.conversations[key]
            if (conversation) {
              return {
                conversations: {
                  ...state.conversations,
                  [key]: {
                    ...conversation,
                    messages: conversation.messages.map(m => 
                      m.id === aiTempMessage.id 
                        ? { ...m, error: errorMessage }
                        : m
                    )
                  }
                }
              }
            }
            return state
          })
        }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      set({ error: errorMessage })
      throw error
    } finally {
      set(state => ({
        sendingStates: { ...state.sendingStates, [key]: false }
      }))
    }
  },

  clearConversation: async (projectId: string, agentId: string) => {
    const key = getConversationKey(projectId, agentId)
    
    set({ error: null })
    try {
      const response = await conversationsApi.clearConversation(projectId, agentId)
      if (response.success) {
        // Clear conversation in state
        set(state => {
          const newConversations = { ...state.conversations }
          delete newConversations[key]
          return { conversations: newConversations }
        })
      } else {
        const error = response.error || 'Failed to clear conversation'
        set({ error })
        throw new Error(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear conversation'
      set({ error: errorMessage })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

// Hooks for easier component usage
export const useConversation = (projectId: string, agentId: string) => {
  const key = getConversationKey(projectId, agentId)
  return conversationStore(state => state.conversations[key])
}

export const useConversationSending = (projectId: string, agentId: string) => {
  const key = getConversationKey(projectId, agentId)
  return conversationStore(state => state.sendingStates[key] || false)
}