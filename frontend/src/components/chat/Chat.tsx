import { useEffect, useCallback, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project, Agent } from '@/types'
import { ChatHeader } from './ChatHeader'
import { TokenLimitBanner } from './TokenLimitBanner'
import { TokenMetaBadge } from './TokenMetaBadge'
import { conversationMessageToKitMessage } from './adapters'
import { useFileAttachments } from './useFileAttachments'
import { MessageList } from '@/components/ui/message-list'
import { MessageInput } from '@/components/ui/message-input'
import { PromptSuggestions } from '@/components/ui/prompt-suggestions'
import { CopyButton } from '@/components/ui/copy-button'
import type { Message } from '@/components/ui/chat-message'
import { useConversation, useConversationSending } from '@/stores/conversationStore'
import { conversationStore } from '@/stores/conversationStore'
import { useSocket } from '@/hooks/useSocket'
import { useTokenLimits } from '@/hooks/useTokenLimits'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

interface ChatProps {
  project: Project
  agent: Agent
  className?: string
}

function Chat({ project, agent, className }: ChatProps) {
  const { t } = useTranslation('chat')

  // Return early if agent is not available
  if (!agent) {
    return (
      <div className={cn('flex flex-col h-full bg-background items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <h3 className="font-semibold text-foreground">{t('selectAgent.title')}</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {t('selectAgent.description')}
          </p>
        </div>
      </div>
    )
  }

  const confirm = useConfirm()
  const conversation = useConversation(project.id, agent.id)
  const isSending = useConversationSending(project.id, agent.id)
  const [includeFiles, setIncludeFiles] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const { sendMessage: sendSocketMessage, isConnected: socketConnected } = useSocket(project.id)
  const { canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded } = useTokenLimits()
  const { files, setFiles, getAttachments, clearFiles, fileError } = useFileAttachments()

  // Convert conversation messages to kit Message[] with stable fallback IDs
  const kitMessages: Message[] = useMemo(() => {
    const msgs = conversation?.messages || []
    return msgs.filter(Boolean).map((msg, idx) => {
      const fallbackId = `msg-${idx}-${msg.timestamp}`
      return conversationMessageToKitMessage(msg, fallbackId)
    })
  }, [conversation?.messages])

  // Build metadata map
  const metadataByIndex = useMemo(() => {
    const msgs = conversation?.messages || []
    const map = new Map<string, Record<string, any>>()
    msgs.filter(Boolean).forEach((msg, idx) => {
      if (msg.role === 'assistant' && msg.metadata && Object.keys(msg.metadata).length > 0) {
        const id = msg.id || `msg-${idx}-${msg.timestamp}`
        map.set(id, msg.metadata as Record<string, any>)
      }
    })
    return map
  }, [conversation?.messages])

  // Load conversation history on mount
  useEffect(() => {
    let isCancelled = false

    const loadConversation = async () => {
      try {
        await conversationStore.getState().getConversation(project.id, agent.id)
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load conversation:', error)
        }
      }
    }

    loadConversation()

    return () => {
      isCancelled = true
    }
  }, [project.id, agent.id])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() && (!files || files.length === 0)) return
    if (isSending) return

    // Check token limits before sending
    if (!canSendMessage) {
      const limitMessage = getLimitStatusMessage()
      if (limitMessage) {
        toast.error(limitMessage)
      } else if (isGlobalLimitExceeded || isMonthlyLimitExceeded) {
        toast.error(t('errors.tokenLimitExceeded'))
      } else {
        toast.error(t('errors.cannotSend'))
      }
      return
    }

    const attachments = getAttachments()

    try {
      if (streaming) {
        await conversationStore.getState().sendStreamingMessage(
          project.id,
          agent.id,
          content,
          includeFiles,
          attachments
        )
      } else {
        await conversationStore.getState().sendMessage(
          project.id,
          agent.id,
          content,
          includeFiles,
          attachments
        )
      }

      refreshUsage()

      if (socketConnected) {
        sendSocketMessage({
          type: 'chat',
          data: { content, agent_id: agent.id },
          projectId: project.id
        })
      }
    } catch {
      refreshUsage()
      const conversationError = conversationStore.getState().error
      toast.error(conversationError || t('errors.sendFailed'))
    }
  }, [project.id, agent.id, includeFiles, streaming, isSending, socketConnected, sendSocketMessage, canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded, files, getAttachments, t])

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() || (files && files.length > 0)) {
      handleSendMessage(inputValue.trim())
      setInputValue('')
      clearFiles()
    }
  }, [inputValue, files, handleSendMessage, clearFiles])

  const handleClearConversation = useCallback(async () => {
    const confirmed = await confirm({
      title: t('clearTitle', 'Clear conversation'),
      description: t('clearConfirm'),
      confirmLabel: t('clearButton', 'Clear'),
      variant: 'danger',
    })
    if (confirmed) {
      try {
        await conversationStore.getState().clearConversation(project.id, agent.id)
      } catch (error) {
        console.error('Failed to clear conversation:', error)
      }
    }
  }, [project.id, agent.id, t, confirm])

  const hasMessages = kitMessages.length > 0

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <ChatHeader
        project={project}
        agent={agent}
        isConnected={socketConnected}
        includeFiles={includeFiles}
        onToggleFiles={setIncludeFiles}
        streaming={streaming}
        onToggleStreaming={setStreaming}
        onClearConversation={handleClearConversation}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasMessages && !isSending ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <PromptSuggestions
              label={t('emptyState.title')}
              append={({ content }) => handleSendMessage(content)}
              suggestions={[
                t('emptyState.suggestion1', { defaultValue: "What can you help me with?" }),
                t('emptyState.suggestion2', { defaultValue: "Summarize this project" }),
                t('emptyState.suggestion3', { defaultValue: "Help me write code" }),
              ]}
            />
          </div>
        ) : (
          <MessageList
            messages={kitMessages}
            showTimeStamps={true}
            isTyping={isSending}
            messageOptions={(message) => ({
              animation: "fade" as const,
              actions: message.role === 'assistant' ? (
                <div className="flex items-center gap-1">
                  <CopyButton content={message.content} copyMessage="Message copied" />
                  <TokenMetaBadge metadata={metadataByIndex.get(message.id) || undefined} />
                </div>
              ) : undefined,
            })}
          />
        )}
      </div>

      <TokenLimitBanner className="mx-4 mb-2" />

      {fileError && (
        <div className="mx-4 mb-2 text-sm text-destructive">{fileError}</div>
      )}

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
                ? (getLimitStatusMessage() || t('errors.tokenLimitExceeded'))
                : t('placeholder', { agentName: agent.name })
            }
          />
        </form>
      </div>
    </div>
  )
}

export { Chat }
