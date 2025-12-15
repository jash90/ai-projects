import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Thread, ThreadMessage } from '@/types'
import { threadsApi } from '@/lib/api'
import { formatChatErrorMessage } from '@/utils/errorMessages'

interface ThreadState {
  // Threads by project ID
  threadsByProject: Record<string, Thread[]>
  // Current active thread ID per project
  activeThreadId: Record<string, string | null>
  // Messages by thread ID
  messagesByThread: Record<string, ThreadMessage[]>
  // Sending states by thread ID
  sendingStates: Record<string, boolean>
  // Loading states
  loadingThreads: Record<string, boolean>
  loadingMessages: Record<string, boolean>
  // Error state
  error: string | null

  // Actions
  fetchThreads: (projectId: string) => Promise<Thread[]>
  createThread: (projectId: string, title?: string) => Promise<Thread>
  updateThread: (threadId: string, title: string) => Promise<Thread | null>
  deleteThread: (threadId: string, projectId: string) => Promise<boolean>

  setActiveThread: (projectId: string, threadId: string | null) => void
  getActiveThread: (projectId: string) => Thread | null

  fetchMessages: (threadId: string) => Promise<ThreadMessage[]>
  sendMessage: (
    threadId: string,
    agentId: string,
    content: string,
    includeFiles?: boolean
  ) => Promise<void>
  sendStreamingMessage: (
    threadId: string,
    agentId: string,
    content: string,
    includeFiles?: boolean
  ) => Promise<void>

  clearError: () => void
}

export const threadStore = create<ThreadState>()(
  persist(
    (set, get) => ({
      threadsByProject: {},
      activeThreadId: {},
      messagesByThread: {},
      sendingStates: {},
      loadingThreads: {},
      loadingMessages: {},
      error: null,

      fetchThreads: async (projectId: string) => {
        set(state => ({
          loadingThreads: { ...state.loadingThreads, [projectId]: true },
          error: null
        }))

        try {
          const response = await threadsApi.getThreads(projectId)
          if (response.success && response.data) {
            const threads = response.data.threads
            set(state => ({
              threadsByProject: {
                ...state.threadsByProject,
                [projectId]: threads
              },
              loadingThreads: { ...state.loadingThreads, [projectId]: false }
            }))
            return threads
          } else {
            throw new Error(response.error || 'Failed to fetch threads')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threads'
          set(state => ({
            error: errorMessage,
            loadingThreads: { ...state.loadingThreads, [projectId]: false }
          }))
          throw error
        }
      },

      createThread: async (projectId: string, title?: string) => {
        set({ error: null })

        try {
          const response = await threadsApi.createThread(projectId, title)
          if (response.success && response.data) {
            const thread = response.data.thread
            set(state => ({
              threadsByProject: {
                ...state.threadsByProject,
                [projectId]: [thread, ...(state.threadsByProject[projectId] || [])]
              },
              activeThreadId: {
                ...state.activeThreadId,
                [projectId]: thread.id
              }
            }))
            return thread
          } else {
            throw new Error(response.error || 'Failed to create thread')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create thread'
          set({ error: errorMessage })
          throw error
        }
      },

      updateThread: async (threadId: string, title: string) => {
        set({ error: null })

        try {
          const response = await threadsApi.updateThread(threadId, title)
          if (response.success && response.data) {
            const updatedThread = response.data.thread
            set(state => {
              const newThreadsByProject = { ...state.threadsByProject }
              for (const projectId in newThreadsByProject) {
                newThreadsByProject[projectId] = newThreadsByProject[projectId].map(t =>
                  t.id === threadId ? updatedThread : t
                )
              }
              return { threadsByProject: newThreadsByProject }
            })
            return updatedThread
          } else {
            throw new Error(response.error || 'Failed to update thread')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update thread'
          set({ error: errorMessage })
          throw error
        }
      },

      deleteThread: async (threadId: string, projectId: string) => {
        set({ error: null })

        try {
          const response = await threadsApi.deleteThread(threadId)
          if (response.success) {
            set(state => {
              const threads = state.threadsByProject[projectId]?.filter(t => t.id !== threadId) || []
              const newActiveId = state.activeThreadId[projectId] === threadId
                ? (threads[0]?.id || null)
                : state.activeThreadId[projectId]

              // Remove messages for deleted thread
              const newMessagesByThread = { ...state.messagesByThread }
              delete newMessagesByThread[threadId]

              return {
                threadsByProject: {
                  ...state.threadsByProject,
                  [projectId]: threads
                },
                activeThreadId: {
                  ...state.activeThreadId,
                  [projectId]: newActiveId
                },
                messagesByThread: newMessagesByThread
              }
            })
            return true
          } else {
            throw new Error(response.error || 'Failed to delete thread')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete thread'
          set({ error: errorMessage })
          throw error
        }
      },

      setActiveThread: (projectId: string, threadId: string | null) => {
        set(state => ({
          activeThreadId: {
            ...state.activeThreadId,
            [projectId]: threadId
          }
        }))
      },

      getActiveThread: (projectId: string) => {
        const state = get()
        const activeId = state.activeThreadId[projectId]
        if (!activeId) return null
        return state.threadsByProject[projectId]?.find(t => t.id === activeId) || null
      },

      fetchMessages: async (threadId: string) => {
        set(state => ({
          loadingMessages: { ...state.loadingMessages, [threadId]: true },
          error: null
        }))

        try {
          const response = await threadsApi.getMessages(threadId)
          if (response.success && response.data) {
            const messages = response.data.messages
            set(state => ({
              messagesByThread: {
                ...state.messagesByThread,
                [threadId]: messages
              },
              loadingMessages: { ...state.loadingMessages, [threadId]: false }
            }))
            return messages
          } else {
            throw new Error(response.error || 'Failed to fetch messages')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages'
          set(state => ({
            error: errorMessage,
            loadingMessages: { ...state.loadingMessages, [threadId]: false }
          }))
          throw error
        }
      },

      sendMessage: async (
        threadId: string,
        agentId: string,
        content: string,
        includeFiles = true
      ) => {
        set(state => ({
          sendingStates: { ...state.sendingStates, [threadId]: true },
          error: null
        }))

        // Add optimistic user message
        const tempUserMessage: ThreadMessage = {
          id: `temp-user-${Date.now()}`,
          thread_id: threadId,
          agent_id: null,
          role: 'user',
          content,
          metadata: {},
          created_at: new Date().toISOString()
        }

        set(state => ({
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: [...(state.messagesByThread[threadId] || []), tempUserMessage]
          }
        }))

        try {
          const response = await threadsApi.sendMessage(threadId, agentId, {
            message: content,
            includeFiles
          })

          if (response.success && response.data) {
            // Replace with actual messages from server
            set(state => ({
              messagesByThread: {
                ...state.messagesByThread,
                [threadId]: response.data!.messages
              }
            }))

            // Update thread in list (for last_message, updated_at)
            set(state => {
              const newThreadsByProject = { ...state.threadsByProject }
              for (const projectId in newThreadsByProject) {
                newThreadsByProject[projectId] = newThreadsByProject[projectId].map(t => {
                  if (t.id === threadId) {
                    return {
                      ...t,
                      updated_at: new Date().toISOString(),
                      message_count: response.data!.messages.length,
                      last_message: response.data!.messages[response.data!.messages.length - 1]?.content
                    }
                  }
                  return t
                })
              }
              return { threadsByProject: newThreadsByProject }
            })
          } else {
            throw new Error(response.error || 'Failed to send message')
          }
        } catch (error) {
          const errorMessage = formatChatErrorMessage(
            error instanceof Error ? error.message : 'Failed to send message'
          )

          // Update optimistic message with error
          set(state => ({
            messagesByThread: {
              ...state.messagesByThread,
              [threadId]: state.messagesByThread[threadId]?.map(m =>
                m.id === tempUserMessage.id ? { ...m, error: errorMessage } : m
              ) || []
            },
            error: errorMessage
          }))
          throw error
        } finally {
          set(state => ({
            sendingStates: { ...state.sendingStates, [threadId]: false }
          }))
        }
      },

      sendStreamingMessage: async (
        threadId: string,
        agentId: string,
        content: string,
        includeFiles = true
      ) => {
        set(state => ({
          sendingStates: { ...state.sendingStates, [threadId]: true },
          error: null
        }))

        // Add optimistic user message
        const tempUserMessage: ThreadMessage = {
          id: `temp-user-${Date.now()}`,
          thread_id: threadId,
          agent_id: null,
          role: 'user',
          content,
          metadata: {},
          created_at: new Date().toISOString()
        }

        // Add temporary AI message for streaming
        const tempAiMessage: ThreadMessage = {
          id: `temp-ai-${Date.now()}`,
          thread_id: threadId,
          agent_id: agentId,
          role: 'assistant',
          content: '',
          metadata: {},
          created_at: new Date().toISOString(),
          isLoading: true
        }

        set(state => ({
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: [
              ...(state.messagesByThread[threadId] || []),
              tempUserMessage,
              tempAiMessage
            ]
          }
        }))

        try {
          await threadsApi.sendStreamingMessage(
            threadId,
            agentId,
            { message: content, includeFiles },
            // onChunk
            (chunk: string) => {
              set(state => ({
                messagesByThread: {
                  ...state.messagesByThread,
                  [threadId]: state.messagesByThread[threadId]?.map(m =>
                    m.id === tempAiMessage.id
                      ? { ...m, content: m.content + chunk }
                      : m
                  ) || []
                }
              }))
            },
            // onComplete
            (response: any) => {
              // Validate response.messages exists and is an array
              const messages: ThreadMessage[] = Array.isArray(response?.messages) ? response.messages : []

              // Ensure isLoading is false on all messages
              const messagesWithLoadingReset = messages.map((msg: ThreadMessage) => ({
                ...msg,
                isLoading: false
              }))

              set(state => ({
                messagesByThread: {
                  ...state.messagesByThread,
                  [threadId]: messagesWithLoadingReset
                }
              }))

              // Update thread metadata with defensive access
              const messageCount = messages.length
              const lastMessage = messageCount > 0
                ? messages[messageCount - 1]?.content ?? ''
                : ''

              // Update thread in list
              set(state => {
                const newThreadsByProject = { ...state.threadsByProject }
                for (const projectId in newThreadsByProject) {
                  newThreadsByProject[projectId] = newThreadsByProject[projectId].map(t => {
                    if (t.id === threadId) {
                      return {
                        ...t,
                        updated_at: new Date().toISOString(),
                        message_count: messageCount,
                        last_message: lastMessage
                      }
                    }
                    return t
                  })
                }
                return { threadsByProject: newThreadsByProject }
              })
            },
            // onError
            (error: string | any) => {
              const errorMessage = formatChatErrorMessage(error)
              set(state => ({
                messagesByThread: {
                  ...state.messagesByThread,
                  [threadId]: state.messagesByThread[threadId]?.map(m =>
                    m.id === tempAiMessage.id
                      ? { ...m, error: errorMessage, isLoading: false }
                      : m
                  ) || []
                },
                error: errorMessage
              }))
            }
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
          set({ error: errorMessage })
          throw error
        } finally {
          set(state => ({
            sendingStates: { ...state.sendingStates, [threadId]: false }
          }))
        }
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'thread-store',
      partialize: (state) => ({
        activeThreadId: state.activeThreadId
      })
    }
  )
)

// Convenience hooks
export const useThreads = (projectId: string) =>
  threadStore(state => state.threadsByProject[projectId] || [])

export const useActiveThread = (projectId: string) =>
  threadStore(state => {
    const activeId = state.activeThreadId[projectId]
    if (!activeId) return null
    return state.threadsByProject[projectId]?.find(t => t.id === activeId) || null
  })

export const useThreadMessages = (threadId: string) =>
  threadStore(state => state.messagesByThread[threadId] || [])

export const useThreadSending = (threadId: string) =>
  threadStore(state => state.sendingStates[threadId] || false)

export const useThreadsLoading = (projectId: string) =>
  threadStore(state => state.loadingThreads[projectId] || false)

export const useMessagesLoading = (threadId: string) =>
  threadStore(state => state.loadingMessages[threadId] || false)
