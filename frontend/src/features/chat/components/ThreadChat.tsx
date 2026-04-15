import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import type { Project } from '@/features/projects/types'
import type { Agent } from '@/features/agents/types'
import { ChatHeader } from './ChatHeader'
import { TokenLimitBanner } from './TokenLimitBanner'
import { TokenMetaBadge } from './TokenMetaBadge'
import { ThreadList } from './ThreadList'
import { threadMessageToKitMessage } from '../utils/adapters'
import { useFileAttachments } from '../hooks/useFileAttachments'
import { Drawer } from '@/shared/components/ui/Drawer'
import { MessageList } from '@/features/chat/components/message-list'
import { MessageInput } from '@/features/chat/components/message-input'
import { PromptSuggestions } from '@/features/chat/components/prompt-suggestions'
import { CopyButton } from '@/features/chat/components/copy-button'
import type { Message } from '@/features/chat/components/chat-message'
import { MessageIcon } from '@/shared/components/icons'
import { threadStore, useActiveThread, useThreadMessages, useThreadSending, useMessagesLoading } from '@/features/chat/stores/threadStore'
import { useTokenLimits } from '@/features/chat/hooks/useTokenLimits'
import { cn } from '@/shared/lib/utils'
import { useConfirm } from '@/shared/components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

interface ThreadChatProps {
  project: Project
  agent: Agent
  className?: string
}

export function ThreadChat({ project, agent, className }: ThreadChatProps) {
  const confirm = useConfirm()
  const [includeFiles, setIncludeFiles] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [showThreadList, setShowThreadList] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeThread = useActiveThread(project.id)
  const messages = useThreadMessages(activeThread?.id || '')
  const isSending = useThreadSending(activeThread?.id || '')
  const isLoadingMessages = useMessagesLoading(activeThread?.id || '')

  const { files, setFiles, clearFiles, fileError } = useFileAttachments()
  const { canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded } = useTokenLimits()

  // Convert ThreadMessage[] to kit Message[] with streaming cursor
  const kitMessages: Message[] = useMemo(() => {
    return messages.map((msg) => {
      const kitMsg = threadMessageToKitMessage(msg)
      // Append blinking cursor for streaming messages
      if (msg.isLoading && msg.content) {
        kitMsg.content = msg.content + ' \u258C' // Unicode block cursor
      }
      return kitMsg
    })
  }, [messages])

  // Track which messages are loading (for typing indicator)
  const isTyping = messages.some((m) => m.isLoading && !m.content)

  // Build metadata map for TokenMetaBadge
  const metadataByMessageId = useMemo(() => {
    const map = new Map<string, Record<string, any>>()
    for (const msg of messages) {
      if (msg.role !== 'user' && msg.metadata && Object.keys(msg.metadata).length > 0) {
        map.set(msg.id, msg.metadata)
      }
    }
    return map
  }, [messages])

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
      } catch {
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
    } catch {
      refreshUsage()
      const storeError = threadStore.getState().error
      toast.error(storeError || 'Failed to send message. Please try again.')
    }
  }, [project.id, agent.id, activeThread?.id, includeFiles, streaming, isSending, canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded])

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      handleSendMessage(inputValue.trim())
      setInputValue('')
      clearFiles()
    }
  }, [inputValue, handleSendMessage, clearFiles])

  const handleClearConversation = useCallback(async () => {
    if (!activeThread) return

    const confirmed = await confirm({
      title: 'Delete conversation',
      description: 'Are you sure you want to delete this conversation? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (confirmed) {
      try {
        await threadStore.getState().deleteThread(activeThread.id, project.id)
      } catch {
        toast.error('Failed to delete conversation')
      }
    }
  }, [activeThread, project.id, confirm])

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
      {/* Thread List Drawer */}
      <Drawer open={showThreadList} onClose={() => setShowThreadList(false)}>
        <ThreadList
          projectId={project.id}
          onThreadSelect={() => setShowThreadList(false)}
        />
      </Drawer>

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
          extraActions={
            <button
              onClick={() => setShowThreadList(!showThreadList)}
              className={cn(
                'p-2 rounded-md transition-colors',
                showThreadList ? 'bg-accent' : 'hover:bg-accent'
              )}
              title={showThreadList ? 'Hide conversations' : 'Show conversations'}
            >
              <MessageIcon size={16} />
            </button>
          }
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {!activeThread ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <PromptSuggestions
                label={`Start a conversation with ${agent.name}`}
                append={({ content }) => handleSendMessage(content)}
                suggestions={[
                  "What can you help me with?",
                  "Summarize this project",
                  "Help me write code",
                ]}
              />
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <PromptSuggestions
                label={`New conversation with ${agent.name}`}
                append={({ content }) => handleSendMessage(content)}
                suggestions={[
                  "What can you help me with?",
                  "Explain your capabilities",
                  "Help me get started",
                ]}
              />
            </div>
          ) : (
            <>
              <MessageList
                messages={kitMessages}
                showTimeStamps={true}
                isTyping={isTyping}
                messageOptions={(message) => ({
                  animation: "fade" as const,
                  actions: message.role === 'assistant' ? (
                    <div className="flex items-center gap-1">
                      <CopyButton content={message.content} copyMessage="Message copied" />
                      <TokenMetaBadge metadata={metadataByMessageId.get(message.id) || undefined} />
                    </div>
                  ) : undefined,
                })}
              />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <TokenLimitBanner className="mx-4 mb-2" />

        {/* File error */}
        {fileError && (
          <div className="mx-4 mb-2 text-sm text-destructive">{fileError}</div>
        )}

        {/* Message Input */}
        <div className="p-4 pt-0">
          <form onSubmit={handleFormSubmit}>
            <MessageInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              isGenerating={isSending}
              allowAttachments={true}
              files={files}
              setFiles={setFiles}
              disabled={!canSendMessage}
              placeholder={
                !canSendMessage
                  ? (getLimitStatusMessage() || 'Token limit exceeded')
                  : `Message ${agent.name}...`
              }
            />
          </form>
        </div>
      </div>
    </div>
  )
}
