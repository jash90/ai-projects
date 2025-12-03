import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/stores/authStore'
import { chatStore } from '@/stores/chatStore'
import { ConversationMessage, SocketMessage } from '@/types'

interface UseSocketOptions {
  autoConnect?: boolean
}

export function useSocket(projectId?: string, options: UseSocketOptions = {}) {
  const { autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const { tokens, isAuthenticated } = useAuth()
  const { addMessage, setConnected, addTypingUser, removeTypingUser } = chatStore()

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
      return
    }

    if (autoConnect && !socketRef.current) {
      connect()
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
    }
  }, [isAuthenticated, tokens?.access_token, autoConnect])

  const connect = () => {
    if (socketRef.current || !tokens?.access_token) return

    // Use same origin (Vite proxy) in development, or configured URL in production
    // Empty VITE_WS_URL means use current origin (works with Vite proxy)
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin

    socketRef.current = io(wsUrl, {
      path: '/socket.io',
      auth: {
        token: tokens.access_token,
      },
      transports: ['websocket', 'polling'],
      forceNew: true,
      timeout: 60000, // 60 seconds connection timeout
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
    })

    const socket = socketRef.current

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        setTimeout(() => {
          socket.connect()
        }, 2000)
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setConnected(false)
    })

    // Message events
            socket.on('new-message', (data: { projectId: string; agentId: string; message: ConversationMessage; sender: any }) => {
      addMessage(data.projectId, data.agentId, data.message)
    })

    socket.on('message-history', (data: { projectId: string; agentId: string; messages: ConversationMessage[] }) => {
      chatStore.getState().setMessages(data.projectId, data.agentId, data.messages)
    })

    // Typing events
    socket.on('typing-update', (data: { 
      projectId: string; 
      userId: string; 
      isTyping: boolean;
      typingUsers: string[];
    }) => {
      if (data.isTyping) {
        addTypingUser(data.projectId, {
          userId: data.userId,
          projectId: data.projectId,
          isTyping: true,
        })
      } else {
        removeTypingUser(data.projectId, data.userId)
      }
    })

    // Error handling
    socket.on('error', (error: any) => {
      console.error('Socket error:', {
        message: error?.message || 'Unknown error',
        type: error?.type || error?.constructor?.name || 'Unknown type',
        description: error?.description || error,
        timestamp: new Date().toISOString()
      })
    })

    // Project events
    socket.on('project-joined', (data: { projectId: string; project: any }) => {
      console.log('Joined project:', data.projectId)
    })

    socket.on('project-left', (data: { projectId: string }) => {
      console.log('Left project:', data.projectId)
    })
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }

  const joinProject = (projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-project', { projectId })
    }
  }

  const leaveProject = (projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-project', { projectId })
    }
  }

  const sendMessage = (message: SocketMessage) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', message)
    }
  }

  const startTyping = (projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', { projectId })
    }
  }

  const stopTyping = (projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', { projectId })
    }
  }

  const isConnected = socketRef.current?.connected || false

  // Auto-join project when connected and projectId is provided
  useEffect(() => {
    if (isConnected && projectId) {
      joinProject(projectId)
    }
    return () => {
      if (isConnected && projectId) {
        leaveProject(projectId)
      }
    }
  }, [isConnected, projectId])

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    joinProject,
    leaveProject,
    sendMessage,
    startTyping,
    stopTyping,
    isConnected,
  }
}