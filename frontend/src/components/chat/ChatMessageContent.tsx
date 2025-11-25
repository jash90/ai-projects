import { Streamdown } from 'streamdown'
import { cn } from '@/lib/utils'

interface ChatMessageContentProps {
  content: string
  isUser: boolean
  className?: string
}

export function ChatMessageContent({ content, isUser, className }: ChatMessageContentProps) {
  // User messages are rendered as plain text
  // AI messages use Streamdown for markdown rendering with streaming support
  if (!isUser) {
    return (
      <div className={cn('chat-markdown-content', className)}>
        <div className="chat-markdown-preview prose dark:prose-invert max-w-none">
          <Streamdown>{content}</Streamdown>
        </div>
      </div>
    )
  }

  // Render user messages as plain text
  return (
    <div className="whitespace-pre-wrap break-words">
      {content}
    </div>
  )
}
