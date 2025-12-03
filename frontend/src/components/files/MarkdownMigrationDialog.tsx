import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { FileTypeService } from '@/services/fileTypeService'
import { useFiles } from '@/stores/fileStore'
import { TextFile as FileType } from '@/types'

interface MarkdownMigrationDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onComplete: () => void
}

export function MarkdownMigrationDialog({ 
  open, 
  onClose, 
  projectId, 
  onComplete 
}: MarkdownMigrationDialogProps) {
  const [candidates, setCandidates] = useState<FileType[]>([])
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const { getProjectFiles } = useFiles()
  
  useEffect(() => {
    if (open) {
      const files = getProjectFiles(projectId) || []
      const markdownCandidates = FileTypeService.getMigrationCandidates(files)
      setCandidates(markdownCandidates)
    }
  }, [open, projectId, getProjectFiles])
  
  const handleMigrateAll = async () => {
    setMigrating(true)
    setProgress(0)
    
    for (let i = 0; i < candidates.length; i++) {
      try {
        await FileTypeService.migrateToMarkdown(candidates[i].id)
        setProgress(((i + 1) / candidates.length) * 100)
      } catch (error) {
        console.error(`Failed to migrate ${candidates[i].name}:`, error)
      }
    }
    
    setMigrating(false)
    onComplete()
    onClose()
  }
  
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Migrate to Markdown Editor</h2>
        
        <p className="text-muted-foreground mb-4">
          Found {candidates.length} files that could benefit from the Markdown editor.
        </p>
        
        {candidates.length > 0 && (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {candidates.map(file => (
              <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({file.type} → markdown)
                </span>
              </div>
            ))}
          </div>
        )}
        
        {migrating && (
          <div className="mb-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Migrating files... {Math.round(progress)}%
            </p>
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleMigrateAll}
            disabled={migrating || candidates.length === 0}
          >
            {migrating ? 'Migrating...' : `Migrate ${candidates.length} Files`}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
