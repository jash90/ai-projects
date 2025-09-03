import { } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={`markdown-preview ${className || ''} prose dark:prose-invert max-w-none`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          table: ({ children, ...props }) => (
            <div className="table-wrapper overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-border border border-border" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/50" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border" {...props}>
              {children}
            </th>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="bg-background divide-y divide-border" {...props}>{children}</tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr {...props}>{children}</tr>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside my-4 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside my-4 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => {
            // Handle task list items
            if (props.className?.includes('task-list-item')) {
              return (
                <li className="flex items-start gap-2 my-1" {...props}>
                  {children}
                </li>
              )
            }
            return (
              <li className="my-1" {...props}>
                {children}
              </li>
            )
          },
          input: ({ type, checked, ...props }: any) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mt-1 mr-2 h-4 w-4 text-primary border-border rounded focus:ring-primary"
                  {...props}
                />
              )
            }
            return <input type={type} {...props} />
          },
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            return !isInline && match ? (
              <pre className="code-block bg-muted p-4 rounded-lg overflow-x-auto my-4">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
