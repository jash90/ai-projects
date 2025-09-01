import { useEffect, useCallback, useState } from 'react'
import { Project, Agent } from '@/types'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { useConversation, useConversationSending } from '@/stores/conversationStore'
import { conversationStore } from '@/stores/conversationStore'
import { useSocket } from '@/hooks/useSocket'
import { cn } from '@/lib/utils'

interface ChatProps {
  project: Project
  agent: Agent
  className?: string
  onToggleSidebar?: () => void
}

function Chat({ project, agent, className, onToggleSidebar }: ChatProps) {
  const conversation = useConversation(project.id, agent.id)
  const isSending = useConversationSending(project.id, agent.id)
  const [includeFiles, setIncludeFiles] = useState(true)
  const { sendMessage: sendSocketMessage, isConnected: socketConnected } = useSocket(project.id)

  // Load conversation history on mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        await conversationStore.getState().getConversation(project.id, agent.id)
      } catch (error) {
        console.error('Failed to load conversation:', error)
      }
    }

    loadConversation()
  }, [project.id, agent.id])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return

    try {
      await conversationStore.getState().sendMessage(
        project.id, 
        agent.id, 
        content, 
        includeFiles
      )
      
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
    }
  }, [project.id, agent.id, includeFiles, isSending, socketConnected, sendSocketMessage])

  const handleClearConversation = useCallback(async () => {
    if (confirm('Are you sure you want to clear this conversation? This action cannot be undone.')) {
      try {
        await conversationStore.getState().clearConversation(project.id, agent.id)
      } catch (error) {
        console.error('Failed to clear conversation:', error)
      }
    }
  }, [project.id, agent.id])

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <ChatHeader
        project={project}
        agent={agent}
        isConnected={socketConnected}
        includeFiles={includeFiles}
        onToggleFiles={setIncludeFiles}
        onClearConversation={handleClearConversation}
        onToggleSidebar={onToggleSidebar}
      />
      
      <ChatMessages
        messages={conversation?.messages || []}
        agent={agent}
        isLoading={isSending}
        className="flex-1"
      />
      
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isSending}
        placeholder={`Message ${agent.name}...`}
      />
    </div>
  )
}

export { Chat }
