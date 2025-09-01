
import { ConversationMessage, Agent } from '@/types'
import { cn, formatRelativeTime, getInitials, generateColorFromString } from '@/lib/utils'

interface ChatMessageProps {
  message: ConversationMessage
  agent: Agent
}

function ChatMessage({ message, agent }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 p-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
            U
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: generateColorFromString(agent.name) }}
          >
            {getInitials(agent.name)}
          </div>
        )}
      </div>

      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Message Header */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isUser ? 'You' : agent.name}</span>
          <span>•</span>
          <span>{formatRelativeTime(message.created_at)}</span>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm max-w-full',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {/* Error Display */}
        {message.error && (
          <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            Error: {message.error}
          </div>
        )}
      </div>
    </div>
  )
}

export { ChatMessage }
