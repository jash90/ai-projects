import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import { MermaidDiagram } from './MermaidDiagram'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

// Math rendering is handled by rehype-katex plugin



export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {

  return (
    <div className={`markdown-preview ${className || ''} prose dark:prose-invert max-w-none`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeSanitize]}
        components={{
          table: ({ children, ...props }) => (
            <div className="table-wrapper my-4">
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
          // Let rehype-katex handle math rendering automatically
          div: ({ children, className, ...props }: any) => (
            <div className={className} {...props}>{children}</div>
          ),
          span: ({ children, className, ...props }: any) => (
            <span className={className} {...props}>{children}</span>
          ),
          // Handle paragraphs to ensure proper spacing
          p: ({ children, ...props }: any) => (
            <p className="my-2" {...props}>
              {children}
            </p>
          ),
          // Handle headers to ensure proper spacing
          h1: ({ children, ...props }: any) => (
            <h1 className="text-3xl font-bold my-4 border-b border-border pb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: any) => (
            <h2 className="text-2xl font-semibold my-3 border-b border-border pb-1" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: any) => (
            <h3 className="text-xl font-semibold my-2" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }: any) => (
            <h4 className="text-lg font-semibold my-2" {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }: any) => (
            <h5 className="text-base font-semibold my-2" {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }: any) => (
            <h6 className="text-sm font-semibold my-2 text-muted-foreground" {...props}>
              {children}
            </h6>
          ),
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const lang = match?.[1]
            const isInline = !match

            // Handle Mermaid diagrams
            if (lang === 'mermaid') {
              return <MermaidDiagram chart={String(children).trim()} />
            }

            // Handle code blocks with syntax highlighting
            return !isInline && match ? (
              <pre className="code-block bg-muted p-4 rounded-lg my-4 whitespace-pre-wrap break-words">
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

// Math components are available in ReactKatex.tsx for direct use
