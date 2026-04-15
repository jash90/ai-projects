import React, { useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { ArrowUp, Paperclip, Square } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { useAutosizeTextArea } from "@/shared/hooks/use-autosize-textarea"
import { Button } from "@/shared/components/ui/Button"
import { FilePreview } from "@/features/chat/components/file-preview"

interface MessageInputBaseProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  submitOnEnter?: boolean
  stop?: () => void
  isGenerating: boolean
}

interface MessageInputWithoutAttachmentProps extends MessageInputBaseProps {
  allowAttachments?: false
}

interface MessageInputWithAttachmentsProps extends MessageInputBaseProps {
  allowAttachments: true
  files: File[] | null
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
}

type MessageInputProps =
  | MessageInputWithoutAttachmentProps
  | MessageInputWithAttachmentsProps

export function MessageInput({
  placeholder = "Ask AI...",
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  ...props
}: MessageInputProps) {
  const [isDragging, setIsDragging] = useState(false)

  const addFiles = (files: File[] | null) => {
    if (props.allowAttachments) {
      props.setFiles((currentFiles) => {
        if (currentFiles === null) return files
        if (files === null) return currentFiles
        return [...currentFiles, ...files]
      })
    }
  }

  const onDragOver = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (event: React.DragEvent) => {
    setIsDragging(false)
    if (props.allowAttachments !== true) return
    event.preventDefault()
    const dataTransfer = event.dataTransfer
    if (dataTransfer.files.length) {
      addFiles(Array.from(dataTransfer.files))
    }
  }

  const onPaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    const files = Array.from(items)
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (props.allowAttachments && files.length > 0) {
      addFiles(files)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
    onKeyDownProp?.(event)
  }

  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Separate out attachment-related props before spreading
  const textareaProps = (() => {
    if (props.allowAttachments) {
      const { allowAttachments, files, setFiles, ...rest } = props
      return rest
    }
    const { allowAttachments, ...rest } = props
    return rest
  })()

  const showFileList =
    props.allowAttachments && props.files && props.files.length > 0

  useAutosizeTextArea({
    ref: textAreaRef,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [props.value, showFileList],
  })

  return (
    <div
      className="relative flex w-full"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="relative flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <textarea
            aria-label="Write your prompt here"
            placeholder={placeholder}
            ref={textAreaRef}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            className={cn(
              "z-10 w-full grow resize-none rounded-xl border border-input bg-background p-3 pr-24 text-sm ring-offset-background transition-[border] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              showFileList && "pb-16",
              className
            )}
            {...textareaProps}
          />

          {props.allowAttachments && (
            <div className="absolute inset-x-3 bottom-0 z-20 overflow-x-auto py-3">
              <div className="flex space-x-3">
                <AnimatePresence mode="popLayout">
                  {props.files?.map((file) => (
                    <FilePreview
                      key={file.name + String(file.lastModified)}
                      file={file}
                      onRemove={() => {
                        props.setFiles((files) => {
                          if (!files) return null
                          const filtered = Array.from(files).filter(
                            (f) => f !== file
                          )
                          if (filtered.length === 0) return null
                          return filtered
                        })
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 flex gap-2">
        {props.allowAttachments && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Attach a file"
            onClick={async () => {
              const files = await showFileUploadDialog()
              addFiles(files)
            }}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        )}
        {isGenerating && stop ? (
          <Button
            type="button"
            size="icon"
            className="h-8 w-8"
            aria-label="Stop generating"
            onClick={stop}
          >
            <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 transition-opacity"
            aria-label="Send message"
            disabled={props.value === "" || isGenerating}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>

      {props.allowAttachments && isDragging && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center space-x-2 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground"
          aria-hidden
        >
          <Paperclip className="h-4 w-4" />
          <span>Drop your files here to attach them.</span>
        </div>
      )}
    </div>
  )
}
MessageInput.displayName = "MessageInput"

function showFileUploadDialog() {
  const input = document.createElement("input")
  input.type = "file"
  input.multiple = true
  input.accept = "image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf"
  input.click()

  return new Promise<File[] | null>((resolve) => {
    input.onchange = (e) => {
      const files = (e.currentTarget as HTMLInputElement).files
      if (files) {
        resolve(Array.from(files))
        return
      }
      resolve(null)
    }
  })
}
