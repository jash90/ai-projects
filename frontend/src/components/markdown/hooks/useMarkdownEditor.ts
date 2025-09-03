import { useState, useCallback, useEffect } from 'react'
import { debounce } from '@/lib/utils'

interface UseMarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
}

export function useMarkdownEditor({ content, onChange, onSave }: UseMarkdownEditorProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState(content)

  useEffect(() => {
    if (content !== lastSavedContent) {
      setHasUnsavedChanges(true)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [content, lastSavedContent])

  const handleContentChange = useCallback((newContent: string | undefined) => {
    onChange(newContent || '')
  }, [onChange])

  const saveCurrentContent = useCallback(async () => {
    if (onSave && hasUnsavedChanges) {
      setIsSaving(true)
      try {
        await onSave()
        setLastSavedContent(content)
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error('Failed to save Markdown content:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }, [onSave, hasUnsavedChanges, content])

  const debouncedSave = useCallback(debounce(saveCurrentContent, 2000), [saveCurrentContent])

  useEffect(() => {
    if (hasUnsavedChanges) {
      debouncedSave()
    }
  }, [hasUnsavedChanges, debouncedSave])

  return {
    handleContentChange,
    handleSave: saveCurrentContent,
    isSaving,
    hasUnsavedChanges,
  }
}
