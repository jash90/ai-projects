import { useEffect, useCallback, useState, useRef } from 'react'
import { Project, Agent, ThreadMessage } from '@/types'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { TokenLimitBanner } from './TokenLimitBanner'
import { ThreadList } from './ThreadList'
import { threadStore, useActiveThread, useThreadMessages, useThreadSending, useMessagesLoading } from '@/stores/threadStore'
import { useTokenLimits } from '@/hooks/useTokenLimits'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ThreadChatProps {
  project: Project
  agent: Agent
  className?: string
  onToggleSidebar?: () => void
}

function ThreadChatMessage({ message, agent }: { message: ThreadMessage; agent?: Agent }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser ? 'bg-background' : 'bg-muted/30'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
      )}>
        {isUser ? 'U' : (message.agent_name?.[0] || 'A')}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? 'You' : (message.agent_name || agent?.name || 'Assistant')}
          </span>
          {!isUser && message.agent_name && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {message.agent_name}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>

        {/* Message content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse">Thinking...</div>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : message.error ? (
            <div className="text-destructive">
              <p className="font-medium">Error:</p>
              <p>{message.error}</p>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Metadata */}
        {message.metadata && Object.keys(message.metadata).length > 0 && !isUser && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {message.metadata.model && (
              <span className="bg-muted px-1.5 py-0.5 rounded">{message.metadata.model}</span>
            )}
            {message.metadata.prompt_tokens && (
              <span>{message.metadata.prompt_tokens} prompt tokens</span>
            )}
            {message.metadata.completion_tokens && (
              <span>{message.metadata.completion_tokens} completion tokens</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ThreadChat({ project, agent, className, onToggleSidebar }: ThreadChatProps) {
  const [includeFiles, setIncludeFiles] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [showThreadList, setShowThreadList] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeThread = useActiveThread(project.id)
  const messages = useThreadMessages(activeThread?.id || '')
  const isSending = useThreadSending(activeThread?.id || '')
  const isLoadingMessages = useMessagesLoading(activeThread?.id || '')

  const { canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded } = useTokenLimits()

  // Load threads on mount
  useEffect(() => {
    if (project.id) {
      threadStore.getState().fetchThreads(project.id).catch(console.error)
    }
  }, [project.id])

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThread?.id) {
      threadStore.getState().fetchMessages(activeThread.id).catch(console.error)
    }
  }, [activeThread?.id])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return

    // Create thread if none exists
    let threadId = activeThread?.id
    if (!threadId) {
      try {
        const newThread = await threadStore.getState().createThread(project.id)
        threadId = newThread.id
      } catch (error) {
        console.error('Failed to create thread:', error)
        toast.error('Failed to create conversation')
        return
      }
    }

    // Check token limits
    if (!canSendMessage) {
      const limitMessage = getLimitStatusMessage()
      if (limitMessage) {
        toast.error(limitMessage)
      } else if (isGlobalLimitExceeded || isMonthlyLimitExceeded) {
        toast.error('Token limit exceeded. Cannot send message.')
      } else {
        toast.error('Cannot send message. Please check your account status.')
      }
      return
    }

    try {
      if (streaming) {
        await threadStore.getState().sendStreamingMessage(
          threadId,
          agent.id,
          content,
          includeFiles
        )
      } else {
        await threadStore.getState().sendMessage(
          threadId,
          agent.id,
          content,
          includeFiles
        )
      }

      refreshUsage()
    } catch (error) {
      console.error('Failed to send message:', error)
      refreshUsage()

      const storeError = threadStore.getState().error
      if (storeError) {
        toast.error(storeError)
      } else {
        toast.error('Failed to send message. Please try again.')
      }
    }
  }, [project.id, agent.id, activeThread?.id, includeFiles, streaming, isSending, canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded])

  const handleClearConversation = useCallback(async () => {
    if (!activeThread) return

    if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await threadStore.getState().deleteThread(activeThread.id, project.id)
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        toast.error('Failed to delete conversation')
      }
    }
  }, [activeThread, project.id])

  // Return early if no agent selected
  if (!agent) {
    return (
      <div className={cn('flex flex-col h-full bg-background items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <div className="text-4xl">Select an Agent</div>
          <p className="text-muted-foreground text-sm max-w-md">
            Choose an AI agent from the sidebar to start a conversation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Thread List Sidebar */}
      {showThreadList && (
        <div className="w-64 border-r border-border flex-shrink-0">
          <ThreadList
            projectId={project.id}
            onThreadSelect={() => {}}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          project={project}
          agent={agent}
          isConnected={true}
          includeFiles={includeFiles}
          onToggleFiles={setIncludeFiles}
          streaming={streaming}
          onToggleStreaming={setStreaming}
          onClearConversation={handleClearConversation}
          onToggleSidebar={onToggleSidebar}
          extraActions={
            <button
              onClick={() => setShowThreadList(!showThreadList)}
              className={cn(
                'p-2 rounded-md transition-colors',
                showThreadList ? 'bg-accent' : 'hover:bg-accent'
              )}
              title={showThreadList ? 'Hide conversations' : 'Show conversations'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          }
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!activeThread ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-4xl mb-4">Start a conversation</div>
              <p className="text-muted-foreground text-sm max-w-md mb-4">
                Select a conversation from the list or start a new one by sending a message.
              </p>
              <p className="text-muted-foreground text-xs">
                Current agent: <span className="font-medium">{agent.name}</span>
              </p>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-4xl mb-4">New conversation</div>
              <p className="text-muted-foreground text-sm max-w-md">
                Send a message to start chatting with {agent.name}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((message, index) => (
                <ThreadChatMessage
                  key={message.id || index}
                  message={message}
                  agent={agent}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <TokenLimitBanner className="mx-4 mb-2" />

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isSending || !canSendMessage}
          placeholder={
            !canSendMessage
              ? (getLimitStatusMessage() || 'Token limit exceeded')
              : `Message ${agent.name}...`
          }
        />
      </div>
    </div>
  )
}
