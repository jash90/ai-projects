import { create } from 'zustand'
import { ConversationMessage, ChatMessage, TypingStatus } from '@/types'
import { generateId } from '@/lib/utils'

interface ChatState {
  messages: Record<string, ChatMessage[]> // `${projectId}-${agentId}` -> messages
  typingUsers: Record<string, TypingStatus[]> // projectId -> typing users
  isConnected: boolean
  isLoading: Record<string, boolean> // `${projectId}-${agentId}` -> loading state
}

interface ChatActions {
  addMessage: (projectId: string, agentId: string, message: ConversationMessage) => void
  updateMessage: (projectId: string, agentId: string, messageId: string, updates: Partial<ChatMessage>) => void
  removeMessage: (projectId: string, agentId: string, messageId: string) => void
  setMessages: (projectId: string, agentId: string, messages: ConversationMessage[]) => void
  addOptimisticMessage: (projectId: string, agentId: string, content: string) => string
  clearMessages: (projectId: string, agentId: string) => void
  setTypingUsers: (projectId: string, typingUsers: TypingStatus[]) => void
  addTypingUser: (projectId: string, typing: TypingStatus) => void
  removeTypingUser: (projectId: string, userId: string) => void
  setConnected: (connected: boolean) => void
  setLoading: (projectId: string, agentId: string, loading: boolean) => void
}

type ChatStore = ChatState & ChatActions

export const chatStore = create<ChatStore>()((set) => ({
  // State
  messages: {},
  typingUsers: {},
  isConnected: false,
  isLoading: {},

  // Actions
  addMessage: (projectId, agentId, message) => {
    const key = `${projectId}-${agentId}`
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: [
          ...(state.messages[key] || []),
          { ...message, isLoading: false }
        ].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      }
    }))
  },

  updateMessage: (projectId, agentId, messageId, updates) => {
    const key = `${projectId}-${agentId}`
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: (state.messages[key] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      }
    }))
  },

  removeMessage: (projectId, agentId, messageId) => {
    const key = `${projectId}-${agentId}`
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: (state.messages[key] || []).filter((msg) => msg.id !== messageId)
      }
    }))
  },

  setMessages: (projectId, agentId, messages) => {
    const key = `${projectId}-${agentId}`
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: messages.map(msg => ({ ...msg, isLoading: false }))
      }
    }))
  },

  addOptimisticMessage: (projectId, agentId, content) => {
    const key = `${projectId}-${agentId}`
    const tempId = `temp-${generateId()}`
    const optimisticMessage: ChatMessage = {
      id: tempId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      isLoading: true
    }

    set((state) => ({
      messages: {
        ...state.messages,
        [key]: [
          ...(state.messages[key] || []),
          optimisticMessage
        ]
      }
    }))

    return tempId
  },

  clearMessages: (projectId, agentId) => {
    const key = `${projectId}-${agentId}`
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: []
      }
    }))
  },

  setTypingUsers: (projectId, typingUsers) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [projectId]: typingUsers
      }
    }))
  },

  addTypingUser: (projectId, typing) => {
    set((state) => {
      const currentTyping = state.typingUsers[projectId] || []
      const existingIndex = currentTyping.findIndex(t => t.userId === typing.userId)
      
      let updatedTyping
      if (existingIndex >= 0) {
        updatedTyping = currentTyping.map((t, i) => 
          i === existingIndex ? typing : t
        )
      } else {
        updatedTyping = [...currentTyping, typing]
      }

      return {
        typingUsers: {
          ...state.typingUsers,
          [projectId]: updatedTyping.filter(t => t.isTyping)
        }
      }
    })
  },

  removeTypingUser: (projectId, userId) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [projectId]: (state.typingUsers[projectId] || []).filter(t => t.userId !== userId)
      }
    }))
  },

  setConnected: (connected) => {
    set({ isConnected: connected })
  },

  setLoading: (projectId, agentId, loading) => {
    const key = `${projectId}-${agentId}`
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        [key]: loading
      }
    }))
  },
}))

// Selectors
export const useChat = () => chatStore()
export const useChatMessages = (projectId: string, agentId: string) => {
  const key = `${projectId}-${agentId}`
  return chatStore((state) => state.messages[key] || [])
}
export const useChatTyping = (projectId: string) => 
  chatStore((state) => state.typingUsers[projectId] || [])
export const useChatConnection = () => 
  chatStore((state) => state.isConnected)
export const useChatLoading = (projectId: string, agentId: string) => {
  const key = `${projectId}-${agentId}`
  return chatStore((state) => state.isLoading[key] || false)
}