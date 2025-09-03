import { useState, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownToolbar } from './MarkdownToolbar'
import { useMarkdownEditor } from './hooks/useMarkdownEditor'
import { cn } from '@/lib/utils'
import './markdown.css'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  readOnly?: boolean

  className?: string
  onExport?: () => void
}

export function MarkdownEditor({
  content,
  onChange,
  onSave,
  readOnly = false,

  className,
  onExport
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const {
    handleContentChange,
    handleSave,
    isSaving,
    hasUnsavedChanges
  } = useMarkdownEditor({ content, onChange, onSave })

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && onSave) {
      const timer = setTimeout(() => {
        handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timer)
    }
  }, [content, hasUnsavedChanges, handleSave, onSave])

  return (
    <div className={cn(
      'markdown-editor flex flex-col h-full bg-background',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      <MarkdownToolbar
        mode={mode}
        onModeChange={setMode}
        onSave={handleSave}
        onFullscreen={() => setIsFullscreen(!isFullscreen)}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        readOnly={readOnly}
        onExport={onExport}
      />
      
      <div className="editor-content flex-1 flex flex-col min-h-0">
        {mode === 'edit' && (
          <div className="flex-1 min-h-0">
            <MDEditor
              value={content}
              onChange={handleContentChange}
              data-color-mode="dark"
              height="100%"
              enableScroll={true}
              visibleDragbar={true}
              textareaProps={{
                placeholder: 'Start writing your Markdown...',
                style: { 
                  fontSize: 14,
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
              }}
              preview="edit"
            />
          </div>
        )}
        
        {mode === 'preview' && (
          <div className="preview-container flex-1 overflow-y-auto p-4 min-h-0">
            <MarkdownPreview content={content} />
          </div>
        )}
        
        {mode === 'split' && (
          <div className="split-view flex-1 flex min-h-0">
            <div className="editor-pane flex-1 border-r border-border min-h-0">
              <MDEditor
                value={content}
                onChange={handleContentChange}
                data-color-mode="dark"
                height="100%"
                enableScroll={true}
                visibleDragbar={true}
                preview="edit"
              />
            </div>
            <div className="preview-pane flex-1 overflow-y-auto p-4 min-h-0">
              <MarkdownPreview content={content} />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Mode: {mode}</span>
            <span>Lines: {content.split('\n').length}</span>
            <span>Characters: {content.length}</span>
            {hasUnsavedChanges && (
              <span className="text-orange-600">• Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Ctrl+S to save</span>
            {isFullscreen && <span>Press Esc to exit fullscreen</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
