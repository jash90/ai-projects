import { useState, useCallback } from 'react'
import type { ChatFileAttachment } from '../types'
import {
  SUPPORTED_CHAT_FILE_TYPES,
  SupportedChatFileType,
  MAX_CHAT_FILE_SIZE,
  MAX_CHAT_FILES_COUNT,
} from '../types'

/**
 * Bridge between our ChatFileAttachment[] type and the kit's File[] | null model.
 * Manages file validation, image preview generation, and conversion back to
 * ChatFileAttachment[] for the API.
 */
export function useFileAttachments() {
  const [files, setFiles] = useState<File[] | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  /**
   * Convert current File[] state to ChatFileAttachment[] for sending via API.
   */
  const getAttachments = useCallback((): ChatFileAttachment[] | undefined => {
    if (!files || files.length === 0) return undefined
    return files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      preview: undefined,
    }))
  }, [files])

  /**
   * Validate files before adding them. Called by the MessageInput's setFiles.
   */
  const validateAndSetFiles: React.Dispatch<React.SetStateAction<File[] | null>> = useCallback(
    (action) => {
      setFiles((prev) => {
        const next = typeof action === 'function' ? action(prev) : action
        if (!next) {
          setFileError(null)
          return null
        }

        // Validate file count
        if (next.length > MAX_CHAT_FILES_COUNT) {
          setFileError(`Maximum ${MAX_CHAT_FILES_COUNT} files allowed`)
          return next.slice(0, MAX_CHAT_FILES_COUNT)
        }

        // Validate each file
        const valid: File[] = []
        for (const file of next) {
          if (!SUPPORTED_CHAT_FILE_TYPES.includes(file.type as SupportedChatFileType)) {
            setFileError(`Unsupported file type: ${file.type}`)
            continue
          }
          if (file.size > MAX_CHAT_FILE_SIZE) {
            setFileError(`${file.name} is too large (max 20MB)`)
            continue
          }
          valid.push(file)
        }

        if (valid.length === 0) return null
        setFileError(null)
        return valid
      })
    },
    []
  )

  const clearFiles = useCallback(() => {
    setFiles(null)
    setFileError(null)
  }, [])

  return {
    files,
    setFiles: validateAndSetFiles,
    getAttachments,
    clearFiles,
    fileError,
  }
}
