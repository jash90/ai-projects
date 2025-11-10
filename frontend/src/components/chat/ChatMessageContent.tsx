import { MarkdownPreview } from '@/components/markdown/MarkdownPreview'
import { cn } from '@/lib/utils'

interface ChatMessageContentProps {
  content: string
  isUser: boolean
  className?: string
}

export function ChatMessageContent({ content, isUser, className }: ChatMessageContentProps) {
  // Detect if content contains Markdown
  const hasMarkdown = detectMarkdown(content)
  
  if (hasMarkdown && !isUser) {
    // Render AI messages as Markdown
    return (
      <div className={cn('chat-markdown-content', className)}>
        <MarkdownPreview 
          content={content} 
          className="chat-markdown-preview"
        />
      </div>
    )
  }
  
  // Render user messages and plain text as before
  return (
    <div className="whitespace-pre-wrap break-words">
      {content}
    </div>
  )
}

// Simple Markdown detection
function detectMarkdown(text: string): boolean {
  const markdownPatterns = [
    /#{1,6}\s+/,           // Headers
    /\*\*.*?\*\*/,         // Bold
    /\*.*?\*/,             // Italic
    /`.*?`/,               // Inline code
    /```[\s\S]*?```/,      // Code blocks
    /```mermaid[\s\S]*?```/, // Mermaid diagrams
    /^\s*[-*+]\s+/m,       // Lists
    /^\s*\d+\.\s+/m,       // Numbered lists
    /\[.*?\]\(.*?\)/,      // Links
    /\$\$[\s\S]*?\$\$/,    // Math blocks
    /\$.*?\$/,             // Inline math
    /\|.*\|/,              // Tables
  ]

  return markdownPatterns.some(pattern => pattern.test(text))
}
