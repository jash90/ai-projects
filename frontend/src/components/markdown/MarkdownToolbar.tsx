import { Button } from '@/components/ui/Button'
import { 
  Save, 
  Eye, 
  Edit3, 
  Columns, 
  Maximize2, 
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownToolbarProps {
  mode: 'edit' | 'preview' | 'split'
  onModeChange: (mode: 'edit' | 'preview' | 'split') => void
  onSave: () => void
  onFullscreen: () => void
  isSaving: boolean
  hasUnsavedChanges: boolean
  readOnly: boolean
  onExport?: () => void
}

export function MarkdownToolbar({
  mode,
  onModeChange,
  onSave,
  onFullscreen,
  isSaving,
  hasUnsavedChanges,
  readOnly,
  onExport
}: MarkdownToolbarProps) {
  return (
    <div className="markdown-toolbar flex items-center justify-between p-2 border-b border-border bg-muted/20">
      <div className="flex items-center space-x-2">
        <Button
          variant={mode === 'edit' ? 'secondary' : 'ghost'}
          onClick={() => onModeChange('edit')}
          size="sm"
          title="Edit Mode"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button
          variant={mode === 'preview' ? 'secondary' : 'ghost'}
          onClick={() => onModeChange('preview')}
          size="sm"
          title="Preview Mode"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant={mode === 'split' ? 'secondary' : 'ghost'}
          onClick={() => onModeChange('split')}
          size="sm"
          title="Split Mode"
        >
          <Columns className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {onExport && (
          <Button
            variant="ghost"
            onClick={onExport}
            size="sm"
            title="Export Document"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges || readOnly}
          size="sm"
          title="Save (Ctrl+S)"
        >
          <Save className={cn("h-4 w-4", hasUnsavedChanges && "text-orange-500")} />
        </Button>
        <Button
          variant="ghost"
          onClick={onFullscreen}
          size="sm"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
