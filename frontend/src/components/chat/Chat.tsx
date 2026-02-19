import { useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project, Agent, ChatFileAttachment } from '@/types'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { TokenLimitBanner } from './TokenLimitBanner'
import { useConversation, useConversationSending } from '@/stores/conversationStore'
import { conversationStore } from '@/stores/conversationStore'
import { useSocket } from '@/hooks/useSocket'
import { useTokenLimits } from '@/hooks/useTokenLimits'
import { cn } from '@/lib/utils'
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
          <div className="text-4xl">🤖</div>
          <h3 className="font-semibold text-foreground">{t('selectAgent.title')}</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {t('selectAgent.description')}
          </p>
        </div>
      </div>
    )
  }

  const conversation = useConversation(project.id, agent.id)
  const isSending = useConversationSending(project.id, agent.id)
  const [includeFiles, setIncludeFiles] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const { sendMessage: sendSocketMessage, isConnected: socketConnected } = useSocket(project.id)
  const { canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded } = useTokenLimits()

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

  const handleSendMessage = useCallback(async (content: string, attachments?: ChatFileAttachment[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isSending) return

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

      // Refresh usage data after sending message
      refreshUsage()

      // Send via socket for real-time updates (optional)
      if (socketConnected) {
        sendSocketMessage({
          type: 'chat',
          data: { content, agent_id: agent.id },
          projectId: project.id
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)

      // Refresh usage data after error to update token limit banner
      refreshUsage()

      // Get the formatted error message from the conversation store
      const conversationError = conversationStore.getState().error
      if (conversationError) {
        // Show the specific error message (e.g., token limit exceeded)
        toast.error(conversationError)
      } else {
        // Fallback to generic error if no specific error available
        toast.error(t('errors.sendFailed'))
      }
    }
  }, [project.id, agent.id, includeFiles, streaming, isSending, socketConnected, sendSocketMessage, canSendMessage, getLimitStatusMessage, refreshUsage, isGlobalLimitExceeded, isMonthlyLimitExceeded])

  const handleClearConversation = useCallback(async () => {
    if (confirm(t('clearConfirm'))) {
      try {
        await conversationStore.getState().clearConversation(project.id, agent.id)
      } catch (error) {
        console.error('Failed to clear conversation:', error)
      }
    }
  }, [project.id, agent.id, t])

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
      
      <ChatMessages
        messages={(conversation?.messages || []).filter(Boolean)}
        agent={agent}
        isLoading={isSending}
        className="flex-1"
      />
      
      <TokenLimitBanner className="mx-4 mb-2" />
      
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isSending || !canSendMessage}
        placeholder={
          !canSendMessage
            ? (getLimitStatusMessage() || t('errors.tokenLimitExceeded'))
            : t('placeholder', { agentName: agent.name })
        }
      />
    </div>
  )
}

export { Chat }
