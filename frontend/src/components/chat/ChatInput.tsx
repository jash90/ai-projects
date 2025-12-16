import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useIsMobile } from '@/components/ui/MobileNavigation'
import { FileIcon, XIcon, PaperclipIcon, SendIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  ChatFileAttachment,
  SUPPORTED_CHAT_FILE_TYPES,
  SupportedChatFileType,
  MAX_CHAT_FILE_SIZE,
  MAX_CHAT_FILES_COUNT
} from '@/types'

// Generate unique ID for attachments to enable immutable state updates
const generateAttachmentId = (file: File): string => {
  return `${file.name}-${file.lastModified}-${file.size}`;
};

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: ChatFileAttachment[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder,
  className
}: ChatInputProps) {
  const { t } = useTranslation('chat')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<ChatFileAttachment[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined)
      setMessage('')
      setAttachments([])
      setFileError(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [message, attachments, disabled, onSendMessage])

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setFileError(null)

    const currentCount = attachments.length
    const availableSlots = MAX_CHAT_FILES_COUNT - currentCount
    const filesToProcess = Array.from(files).slice(0, availableSlots)

    if (files.length > availableSlots) {
      setFileError(t('input.maxFilesError', { count: MAX_CHAT_FILES_COUNT }))
    }

    // Validate and create attachments with IDs (no preview yet)
    const newAttachments: ChatFileAttachment[] = []
    for (const file of filesToProcess) {
      // Check file type
      if (!SUPPORTED_CHAT_FILE_TYPES.includes(file.type as SupportedChatFileType)) {
        setFileError(t('input.unsupportedFileType', { type: file.type }))
        continue
      }

      // Check file size
      if (file.size > MAX_CHAT_FILE_SIZE) {
        setFileError(t('input.fileTooLarge', { name: file.name, maxSize: MAX_CHAT_FILE_SIZE / 1024 / 1024 }))
        continue
      }

      // Create attachment with unique ID (preview will be added immutably)
      newAttachments.push({
        id: generateAttachmentId(file),
        file,
        preview: undefined
      })
    }

    // Add attachments to state first
    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments])
    }

    // Then generate previews asynchronously with IMMUTABLE updates
    for (const { id, file } of newAttachments) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          const preview = readerEvent.target?.result as string
          // IMMUTABLE UPDATE: Replace the attachment with a new object
          setAttachments(prev =>
            prev.map(att =>
              att.id === id
                ? { ...att, preview } // Create NEW object with preview
                : att
            )
          )
        }
        reader.readAsDataURL(file)
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [attachments.length])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
    setFileError(null)
  }, [])

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle mobile keyboard appearance
  useEffect(() => {
    if (isMobile && isFocused && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 300)
    }
  }, [isMobile, isFocused])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className={cn(
      'border-t bg-background transition-all duration-200',
      isMobile ? 'p-3 safe-area-bottom' : 'p-4',
      isMobile && isFocused && 'shadow-lg',
      className
    )}>
      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              className="relative group flex items-center gap-2 bg-muted rounded-lg p-2 pr-8"
            >
              {attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-muted-foreground/20 rounded">
                  <FileIcon size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {attachment.file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File Error */}
      {fileError && (
        <div className="text-sm text-destructive mb-2">
          {fileError}
        </div>
      )}

      <form onSubmit={handleSubmit} className={cn(
        'flex gap-2',
        isMobile && 'items-end'
      )}>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_CHAT_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attach Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleAttachClick}
          disabled={disabled || attachments.length >= MAX_CHAT_FILES_COUNT}
          className={cn(
            'flex-shrink-0 self-end',
            isMobile ? 'h-12 w-12' : 'h-10 w-10'
          )}
          title={t('input.attachFiles')}
        >
          <PaperclipIcon size={isMobile ? 20 : 18} />
          <span className="sr-only">{t('input.attachFile')}</span>
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || t('input.placeholder')}
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
                {message.length > 0 ? t('input.characters', { count: message.length }) : t('input.startTyping')}
              </span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          size={isMobile ? 'default' : 'icon'}
          className={cn(
            'flex-shrink-0 self-end transition-all duration-200',
            isMobile ? (
              'px-4 py-3 h-12 min-w-[48px] touch-target'
            ) : (
              'h-10 w-10'
            ),
            (disabled || (!message.trim() && attachments.length === 0)) ? 'opacity-50' : 'opacity-100'
          )}
        >
          <SendIcon size={isMobile ? 20 : 16} />
          {isMobile && <span className="ml-2 text-sm font-medium">{t('input.send')}</span>}
          <span className="sr-only">{t('input.sendMessage')}</span>
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
