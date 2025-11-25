import { Streamdown } from 'streamdown'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={`markdown-preview ${className || ''} prose dark:prose-invert max-w-none`}>
      <Streamdown>{content}</Streamdown>
    </div>
  )
}
