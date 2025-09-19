import { ConversationMessage, Agent } from '@/types'
import { ChatMessage } from './ChatMessage'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface ChatMessagesProps {
  messages: ConversationMessage[]
  agent: Agent
  isLoading?: boolean
  className?: string
}

function ChatMessages({ messages, agent, isLoading = false, className }: ChatMessagesProps) {
  // Ensure messages is always an array and agent exists
  const safeMessages = messages || []
  
  // Return early if agent is not available
  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-2xl">⚠️</div>
          <h3 className="font-semibold text-foreground">Agent not found</h3>
          <p className="text-muted-foreground text-sm">
            Please select an agent to start chatting
          </p>
        </div>
      </div>
    )
  }

  if (safeMessages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-2xl">👋</div>
          <h3 className="font-semibold text-foreground">Start a conversation</h3>
          <p className="text-muted-foreground text-sm">
            Send a message to begin chatting with {agent.name}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This agent can access your project files for context
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className={`flex-1 ${className}`}>
      <div className="min-h-full">
        {safeMessages.map((message, index) => (
          <ChatMessage
            key={message.id || `message-${index}`}
            message={message}
            agent={agent}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start p-4">
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <LoadingSpinner className="h-4 w-4" />
              <span className="text-sm">{agent.name} is thinking...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

export { ChatMessages }
