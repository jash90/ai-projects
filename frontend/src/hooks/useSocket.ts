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
        ;(socketRef.current as any)._cleanupListeners?.()
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
    const onConnect = () => {
      console.log('Socket connected:', socket.id)
      setConnected(true)
    }

    const onDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason)
      setConnected(false)

      if (reason === 'io server disconnect') {
        setTimeout(() => {
          socket.connect()
        }, 2000)
      }
    }

    const onConnectError = (error: Error) => {
      console.error('Socket connection error:', error)
      setConnected(false)
    }

    const onNewMessage = (data: { projectId: string; agentId: string; message: ConversationMessage; sender: any }) => {
      addMessage(data.projectId, data.agentId, data.message)
    }

    const onMessageHistory = (data: { projectId: string; agentId: string; messages: ConversationMessage[] }) => {
      chatStore.getState().setMessages(data.projectId, data.agentId, data.messages)
    }

    const onTypingUpdate = (data: {
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
    }

    const onError = (error: any) => {
      console.error('Socket error:', {
        message: error?.message || 'Unknown error',
        type: error?.type || error?.constructor?.name || 'Unknown type',
        description: error?.description || error,
        timestamp: new Date().toISOString()
      })
    }

    const onProjectJoined = (data: { projectId: string; project: any }) => {
      console.log('Joined project:', data.projectId)
    }

    const onProjectLeft = (data: { projectId: string }) => {
      console.log('Left project:', data.projectId)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('new-message', onNewMessage)
    socket.on('message-history', onMessageHistory)
    socket.on('typing-update', onTypingUpdate)
    socket.on('error', onError)
    socket.on('project-joined', onProjectJoined)
    socket.on('project-left', onProjectLeft)

    // Store cleanup function on the socket for use in disconnect/effect cleanup
    ;(socket as any)._cleanupListeners = () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('new-message', onNewMessage)
      socket.off('message-history', onMessageHistory)
      socket.off('typing-update', onTypingUpdate)
      socket.off('error', onError)
      socket.off('project-joined', onProjectJoined)
      socket.off('project-left', onProjectLeft)
    }
  }

  const disconnect = () => {
    if (socketRef.current) {
      ;(socketRef.current as any)._cleanupListeners?.()
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