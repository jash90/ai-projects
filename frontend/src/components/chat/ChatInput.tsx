import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useIsMobile } from '@/components/ui/MobileNavigation'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  className 
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [message, disabled, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    const maxHeight = isMobile ? 100 : 120
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [isMobile])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  // Handle mobile keyboard appearance
  useEffect(() => {
    if (isMobile && isFocused && textareaRef.current) {
      // Scroll into view on mobile when focused
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 300) // Wait for keyboard animation
    }
  }, [isMobile, isFocused])

  return (
    <div className={cn(
      'border-t bg-background transition-all duration-200',
      isMobile ? 'p-3 safe-area-bottom' : 'p-4',
      isMobile && isFocused && 'shadow-lg',
      className
    )}>
      <form onSubmit={handleSubmit} className={cn(
        'flex gap-2',
        isMobile && 'items-end'
      )}>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full resize-none rounded-lg border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              isMobile ? (
                'px-4 py-3 text-base min-h-[48px] max-h-[100px] touch-target'
              ) : (
                'px-3 py-2 text-sm min-h-[40px] max-h-[120px]'
              ),
              isFocused && isMobile && 'ring-2 ring-ring ring-offset-2'
            )}
            rows={1}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="true"
          />
          
          {/* Mobile helper text */}
          {isMobile && isFocused && (
            <div className="absolute -top-8 left-0 right-0 text-center">
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-md border border-border shadow-sm">
                {message.length > 0 ? `${message.length} characters` : 'Start typing...'}
              </span>
            </div>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={disabled || !message.trim()}
          size={isMobile ? 'default' : 'icon'}
          className={cn(
            'flex-shrink-0 self-end transition-all duration-200',
            isMobile ? (
              'px-4 py-3 h-12 min-w-[48px] touch-target'
            ) : (
              'h-10 w-10'
            ),
            disabled || !message.trim() ? 'opacity-50' : 'opacity-100'
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={isMobile ? "20" : "16"}
            height={isMobile ? "20" : "16"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          {isMobile && <span className="ml-2 text-sm font-medium">Send</span>}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      
      {/* Mobile keyboard spacer */}
      {isMobile && isFocused && (
        <div className="h-4" />
      )}
    </div>
  )
}

export { ChatInput }
