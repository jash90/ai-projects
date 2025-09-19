import React, { useState, useEffect, useCallback, useRef } from 'react'
import Split from 'react-split'
import ErrorBoundary from '../ErrorBoundary'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Eye,
  EyeOff,
  Code,
  FileText,
  Download,
  Upload,
  Save,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  CodeSquare,
  Table,
  Hash,
  Braces,
  GitBranch,
  AlertCircle,
  Book
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { EnhancedMarkdownPreview } from './EnhancedMarkdownPreview'
import { MarkdownToolbar } from './EnhancedMarkdownToolbar'
import { MathEditorDialog } from './MathEditorDialog'
import { DiagramEditorDialog } from './DiagramEditorDialog'
import { TemplateSelector } from './TemplateSelector'
import { useMarkdownStore } from '@/stores/markdownStore'
import apiClient from '@/lib/api'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

interface EnhancedMarkdownEditorProps {
  initialContent?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  fileId?: string
  className?: string
  readOnly?: boolean
}

function EnhancedMarkdownEditorBase({
  initialContent = '',
  onChange,
  onSave,
  fileId,
  className,
  readOnly = false
}: EnhancedMarkdownEditorProps) {
  const { toast } = useToast()
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // State
  const [content, setContent] = useState(initialContent)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 })
  const [wordCount, setWordCount] = useState(0)
  const [readingTime, setReadingTime] = useState(0)
  const [showMathEditor, setShowMathEditor] = useState(false)
  const [showDiagramEditor, setShowDiagramEditor] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Load content from store if fileId provided
  useEffect(() => {
    if (fileId) {
      const storedContent = useMarkdownStore.getState().getContent(fileId)
      if (storedContent) {
        setContent(storedContent)
      }
    }
  }, [fileId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending save operations
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Update word count and reading time with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const words = content.trim().split(/\s+/).filter(w => w.length > 0).length
      setWordCount(words)
      setReadingTime(Math.max(1, Math.ceil(words / 200)))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [content])

  // Debounce save operations
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)

    // Immediate onChange for UI updates
    if (onChange) {
      onChange(newContent)
    }

    // Debounced store update
    if (fileId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        useMarkdownStore.getState().updateContent(fileId, newContent)
      }, 500)
    }
  }, [onChange, fileId])

  // Insert text at cursor position
  const insertAtCursor = useCallback((text: string) => {
    if (!editorRef.current) return

    const start = editorRef.current.selectionStart
    const end = editorRef.current.selectionEnd
    const before = content.substring(0, start)
    const after = content.substring(end)
    const newContent = before + text + after

    handleContentChange(newContent)

    // Reset cursor position after insert
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = start + text.length
        editorRef.current.selectionEnd = start + text.length
        editorRef.current.focus()
      }
    }, 0)
  }, [content, handleContentChange])

  // Wrap selection with markers
  const wrapSelection = useCallback((before: string, after: string = before) => {
    if (!editorRef.current) return

    const start = editorRef.current.selectionStart
    const end = editorRef.current.selectionEnd
    const selectedText = content.substring(start, end)
    const beforeText = content.substring(0, start)
    const afterText = content.substring(end)

    const newContent = beforeText + before + selectedText + after + afterText
    handleContentChange(newContent)

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = start + before.length
        editorRef.current.selectionEnd = start + before.length + selectedText.length
        editorRef.current.focus()
      }
    }, 0)
  }, [content, handleContentChange])

  // Toolbar actions
  const toolbarActions = {
    bold: () => wrapSelection('**'),
    italic: () => wrapSelection('*'),
    strikethrough: () => wrapSelection('~~'),
    code: () => wrapSelection('`'),
    codeBlock: () => insertAtCursor('\n```\n\n```\n'),
    quote: () => insertAtCursor('\n> '),
    link: () => wrapSelection('[', '](url)'),
    image: () => insertAtCursor('![alt text](image-url)'),
    list: () => insertAtCursor('\n- '),
    orderedList: () => insertAtCursor('\n1. '),
    task: () => insertAtCursor('\n- [ ] '),
    table: () => insertAtCursor('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n'),
    heading1: () => insertAtCursor('\n# '),
    heading2: () => insertAtCursor('\n## '),
    heading3: () => insertAtCursor('\n### '),
    horizontalRule: () => insertAtCursor('\n---\n'),
    math: () => setShowMathEditor(true),
    diagram: () => setShowDiagramEditor(true),
    template: () => setShowTemplateSelector(true)
  }

  // Save functionality
  const handleSave = useCallback(async () => {
    if (readOnly || isSaving) return

    setIsSaving(true)
    try {
      if (onSave) {
        await onSave(content)
      }

      if (fileId) {
        useMarkdownStore.getState().saveContent(fileId)
      }

      setHasUnsavedChanges(false)
      toast({
        title: 'Saved',
        description: 'Document saved successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save document',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }, [content, onSave, fileId, readOnly, isSaving, toast])

  // Auto-save
  useEffect(() => {
    if (hasUnsavedChanges && !readOnly) {
      const timer = setTimeout(() => {
        handleSave()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [hasUnsavedChanges, handleSave, readOnly])

  // Validate markdown
  const validateMarkdown = useCallback(async () => {
    try {
      const response = await apiClient.post('/api/markdown/validate', {
        content
      })
      setValidationErrors(response.data.errors || [])
    } catch (error) {
      console.error('Validation error:', error)
    }
  }, [content])

  // Synchronized scrolling
  const handleScroll = useCallback((source: 'editor' | 'preview') => {
    if (!isSyncing && viewMode === 'split') {
      setIsSyncing(true)

      if (source === 'editor' && editorRef.current && previewRef.current) {
        const scrollPercentage = editorRef.current.scrollTop /
          (editorRef.current.scrollHeight - editorRef.current.clientHeight)
        previewRef.current.scrollTop = scrollPercentage *
          (previewRef.current.scrollHeight - previewRef.current.clientHeight)
      } else if (source === 'preview' && previewRef.current && editorRef.current) {
        const scrollPercentage = previewRef.current.scrollTop /
          (previewRef.current.scrollHeight - previewRef.current.clientHeight)
        editorRef.current.scrollTop = scrollPercentage *
          (editorRef.current.scrollHeight - editorRef.current.clientHeight)
      }

      setTimeout(() => setIsSyncing(false), 50)
    }
  }, [viewMode, isSyncing])

  // Export functions
  const exportAsHTML = async () => {
    try {
      const response = await apiClient.post('/api/markdown/export/html', {
        content,
        filename: fileId || 'document'
      }, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${fileId || 'document'}.html`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export as HTML',
        variant: 'destructive'
      })
    }
  }

  const exportAsPDF = async () => {
    try {
      const response = await apiClient.post('/api/markdown/export/pdf', {
        content,
        filename: fileId || 'document'
      }, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${fileId || 'document'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export as PDF',
        variant: 'destructive'
      })
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            handleSave()
            break
          case 'b':
            e.preventDefault()
            toolbarActions.bold()
            break
          case 'i':
            e.preventDefault()
            toolbarActions.italic()
            break
          case 'k':
            e.preventDefault()
            toolbarActions.link()
            break
          case 'e':
            e.preventDefault()
            setViewMode(viewMode === 'edit' ? 'preview' : viewMode === 'preview' ? 'split' : 'edit')
            break
        }
      }

      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, toolbarActions, viewMode, isFullscreen])

  return (
    <div className={cn(
      'enhanced-markdown-editor flex flex-col h-full bg-background',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Toolbar */}
      <MarkdownToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isFullscreen={isFullscreen}
        onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        readOnly={readOnly}
        onExportHTML={exportAsHTML}
        onExportPDF={exportAsPDF}
        toolbarActions={toolbarActions}
        validationErrors={validationErrors}
        onValidate={validateMarkdown}
      />

      {/* Main Editor Area */}
      <div className="flex-1 min-h-0">
        {viewMode === 'edit' && (
          <div className="h-full flex flex-col">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onScroll={() => handleScroll('editor')}
              className="flex-1 w-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none"
              placeholder="Start writing your markdown..."
              readOnly={readOnly}
              spellCheck={false}
              aria-label="Markdown editor"
              aria-describedby="editor-shortcuts"
              aria-multiline="true"
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div
            ref={previewRef}
            className="h-full overflow-auto p-8"
            onScroll={() => handleScroll('preview')}
            role="article"
            aria-label="Markdown preview"
          >
            <EnhancedMarkdownPreview content={content} />
          </div>
        )}

        {viewMode === 'split' && (
          <Split
            className="flex h-full"
            sizes={[50, 50]}
            minSize={200}
            gutterSize={4}
            cursor="col-resize"
          >
            <div className="h-full flex flex-col border-r border-border">
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onScroll={() => handleScroll('editor')}
                className="flex-1 w-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none"
                placeholder="Start writing your markdown..."
                readOnly={readOnly}
                spellCheck={false}
                aria-label="Markdown editor"
                aria-describedby="editor-shortcuts"
                aria-multiline="true"
              />
            </div>
            <div
              ref={previewRef}
              className="h-full overflow-auto p-8"
              onScroll={() => handleScroll('preview')}
              role="article"
              aria-label="Markdown preview"
            >
              <EnhancedMarkdownPreview content={content} />
            </div>
          </Split>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Lines: {content.split('\n').length}</span>
            <span>Words: {wordCount}</span>
            <span>Reading time: ~{readingTime} min</span>
            {hasUnsavedChanges && (
              <span className="text-orange-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Markdown Enhanced</span>
            {validationErrors.length > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors.length} issues
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <MathEditorDialog
        open={showMathEditor}
        onClose={() => setShowMathEditor(false)}
        onInsert={(latex) => {
          insertAtCursor(latex)
          setShowMathEditor(false)
        }}
      />

      <DiagramEditorDialog
        open={showDiagramEditor}
        onClose={() => setShowDiagramEditor(false)}
        onInsert={(code) => {
          insertAtCursor(`\n\`\`\`mermaid\n${code}\n\`\`\`\n`)
          setShowDiagramEditor(false)
        }}
      />

      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={(template) => {
          setContent(template)
          handleContentChange(template)
          setShowTemplateSelector(false)
        }}
      />
    </div>
  )
}

// Export the component wrapped with error boundary
export function EnhancedMarkdownEditor(props: EnhancedMarkdownEditorProps) {
  return (
    <ErrorBoundary componentName="EnhancedMarkdownEditor">
      <EnhancedMarkdownEditorBase {...props} />
    </ErrorBoundary>
  )
}