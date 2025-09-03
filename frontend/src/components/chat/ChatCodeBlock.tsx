import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ChatCodeBlockProps {
  code: string
  language?: string
}

export function ChatCodeBlock({ code, language }: ChatCodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
        <code className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  )
}
