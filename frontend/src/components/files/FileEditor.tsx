import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, RotateCcw, Maximize2, Minimize2 } from 'lucide-react'
import { File as FileType } from '@/types'
import { useFiles } from '@/stores/fileStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MarkdownEditor, ExportDialog } from '@/components/markdown'
import { FileTypeService } from '@/services/fileTypeService'
import { cn, debounce, getFileExtension } from '@/lib/utils'

interface FileEditorProps {
  file: FileType | null
  className?: string
}

// Monaco Editor types (for when Monaco is loaded)
declare global {
  interface Window {
    monaco: any
  }
}

export function FileEditor({ file, className }: FileEditorProps) {
  const {
    updateFileContent,
    saveFileContent,
    currentFile,
    isSaving,
    error
  } = useFiles()

  const [isMonacoLoading, setIsMonacoLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load Monaco Editor
  useEffect(() => {
    const loadMonaco = async () => {
      console.log('Loading Monaco Editor...')
      
      if (window.monaco) {
        console.log('Monaco already loaded')
        setIsMonacoLoading(false)
        return
      }

      // Check if loader script is already present in DOM
      const existingScript = document.querySelector('script[data-monaco-loader="true"]')
      if (existingScript) {
        console.log('Monaco loader script already present, waiting for Monaco...')

        // Wait for Monaco to be available with interval check
        const checkInterval = setInterval(() => {
          if (window.monaco) {
            clearInterval(checkInterval)
            setIsMonacoLoading(false)
          }
        }, 100)

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          if (!window.monaco) {
            console.warn('Monaco loading timeout')
            setIsMonacoLoading(false)
          }
        }, 10000)

        return
      }

      // Check if AMD loader is already configured
      if ((window as any).require && (window as any).require.config) {
        console.log('AMD loader already configured, loading Monaco...')

        try {
          (window as any).require(['vs/editor/editor.main'], () => {
            console.log('Monaco editor main loaded')
            setIsMonacoLoading(false)
          }, (error: any) => {
            console.error('Failed to load Monaco:', error)
            setIsMonacoLoading(false)
          })
          return
        } catch (error) {
          console.error('AMD loader error:', error)
        }
      }

      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('Monaco Editor loading timeout, falling back to textarea')
        setIsMonacoLoading(false)
      }, 10000) // 10 second timeout

      try {
        // Load Monaco Editor from CDN
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js'
        script.setAttribute('data-monaco-loader', 'true')

        script.onload = () => {
          console.log('Monaco loader script loaded');
          (window as any).require.config({ 
            paths: { 
              vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' 
            } 
          });
          
          (window as any).require(['vs/editor/editor.main'], () => {
            console.log('Monaco editor main loaded')
            clearTimeout(timeout)
            setIsMonacoLoading(false)
          }, (error: any) => {
            console.error('Failed to load Monaco main:', error)
            clearTimeout(timeout)
            setIsMonacoLoading(false)
          })
        }
        
        script.onerror = (error) => {
          console.error('Failed to load Monaco loader script:', error)
          clearTimeout(timeout)
          setIsMonacoLoading(false)
        }
        
        document.head.appendChild(script)
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error)
        clearTimeout(timeout)
        setIsMonacoLoading(false)
      }
    }

    loadMonaco()
  }, [])

  // Initialize editor when Monaco is loaded and file is available
  useEffect(() => {
    if (!isMonacoLoading && file && containerRef.current && !editorRef.current) {
      const editor = window.monaco.editor.create(containerRef.current, {
        value: file.content,
        language: getLanguageFromFileType(file.type, file.name),
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        wordWrap: 'on',
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 4,
        glyphMargin: false,
        tabSize: 2,
        insertSpaces: true,
      })

      // Handle content changes
      editor.onDidChangeModelContent(() => {
        const content = editor.getValue()
        updateFileContent(file.id, content)
        setHasUnsavedChanges(content !== lastSavedContent)
      })

      editorRef.current = editor
      setLastSavedContent(file.content)
    }
  }, [isMonacoLoading, file, updateFileContent])

  // Update editor content when file changes
  useEffect(() => {
    if (editorRef.current && file && file.id !== currentFile?.id) {
      const editor = editorRef.current
      const model = window.monaco.editor.createModel(
        file.content,
        getLanguageFromFileType(file.type, file.name)
      )
      editor.setModel(model)
      setLastSavedContent(file.content)
      setHasUnsavedChanges(false)
    }
  }, [file, currentFile])

  // Cleanup editor
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [])

  // Auto-save with debouncing
  const debouncedSave = useCallback(
    debounce(async (fileId: string) => {
      if (hasUnsavedChanges) {
        try {
          await saveFileContent(fileId)
          setLastSavedContent(currentFile?.content || '')
          setHasUnsavedChanges(false)
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }
    }, 2000),
    [hasUnsavedChanges, saveFileContent, currentFile]
  )

  useEffect(() => {
    if (file && hasUnsavedChanges) {
      debouncedSave(file.id)
    }
  }, [file, hasUnsavedChanges, debouncedSave])

  const handleSave = async () => {
    if (!file) return
    
    try {
      await saveFileContent(file.id)
      setLastSavedContent(currentFile?.content || '')
      setHasUnsavedChanges(false)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleRevert = () => {
    if (!file || !editorRef.current) return
    
    if (confirm('Are you sure you want to revert all unsaved changes?')) {
      editorRef.current.setValue(lastSavedContent)
      updateFileContent(file.id, lastSavedContent)
      setHasUnsavedChanges(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  if (!file) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium mb-2">No file selected</h3>
            <p className="text-sm">Select a file from the explorer to start editing</p>
          </div>
        </div>
      </div>
    )
  }

  if (isMonacoLoading) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground truncate">{file.name}</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner className="w-8 h-8 mb-2" />
            <p className="text-sm text-muted-foreground">Loading editor...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'flex flex-col h-full bg-background',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate">{file.name}</h3>
            {hasUnsavedChanges && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
            )}
            {isSaving(file.id) && (
              <LoadingSpinner className="w-4 h-4" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRevert}
              disabled={!hasUnsavedChanges || isSaving(file.id)}
              className="h-8"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Revert
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving(file.id)}
              className="h-8"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving(file.id) ? 'Saving...' : 'Save'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* File Info */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Type: {file.type}</span>
          <span>Lines: {file.content.split('\n').length}</span>
          <span>Characters: {file.content.length}</span>
          {hasUnsavedChanges && (
            <span className="text-orange-600">• Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative min-h-0">
        {file && FileTypeService.shouldUseMarkdownEditor(file) ? (
          <MarkdownEditor
            content={file.content}
            onChange={(content) => updateFileContent(file.id, content)}
            onSave={() => saveFileContent(file.id)}
            onExport={() => setShowExportDialog(true)}
            readOnly={false}
            className="h-full"
          />
        ) : window.monaco ? (
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ height: '100%' }}
          />
        ) : (
          <textarea
            value={file?.content || ''}
            onChange={(e) => file && updateFileContent(file.id, e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-background text-foreground border-0 resize-none focus:outline-none"
            placeholder="Start typing..."
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Language: {getLanguageFromFileType(file.type, file.name)}</span>
            <span>Auto-save: {hasUnsavedChanges ? 'Pending' : 'Up to date'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Ctrl+S to save</span>
            {isFullscreen && <span>Press Esc to exit fullscreen</span>}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {file && FileTypeService.shouldUseMarkdownEditor(file) && (
        <ExportDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          content={file.content}
          filename={file.name.replace(/\.md$/, '')}
        />
      )}
    </div>
  )
}

// Helper function to map file types to Monaco Editor languages
function getLanguageFromFileType(fileType: string, fileName: string): string {
  const extension = getFileExtension(fileName)
  
  // Map file types and extensions to Monaco languages
  const languageMap: Record<string, string> = {
    // By file type
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    markdown: 'markdown',
    shell: 'shell',
    dockerfile: 'dockerfile',
    
    // By file extension
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
  }

  return languageMap[fileType] || languageMap[extension] || 'plaintext'
}
