import { useState } from "react";
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ProjectFileUpload } from './ProjectFileUpload'
import { CheckCircle } from 'lucide-react'

interface UploadFileDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onUploadComplete?: (files: any[]) => void
}

export function UploadFileDialog({
  open,
  onClose,
  projectId,
  onUploadComplete
}: UploadFileDialogProps) {
  const { t } = useTranslation('files')
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleUploadComplete = (file: any) => {
    setUploadedFiles(prev => [...prev, file])
    setError(null)
    
    // Immediately notify parent to refresh file list
    if (onUploadComplete) {
      onUploadComplete([file])
    }
  }

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleClose = () => {
    // Don't call onUploadComplete here since we're calling it immediately after each upload
    setUploadedFiles([])
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{t('upload.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('upload.description')}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <ProjectFileUpload
            projectId={projectId}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFileSize={50}
            acceptedTypes={[
              // Images
              '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
              // Documents
              '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf',
              // Code files
              '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.sass',
              '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift',
              // Data files
              '.json', '.xml', '.yaml', '.yml', '.csv', '.sql',
              // Archives
              '.zip', '.rar', '.tar', '.gz',
              // Media
              '.mp4', '.avi', '.mov', '.mp3', '.wav', '.flac',
              // Other
              '.dockerfile', '.gitignore', '.env.example'
            ]}
          />

          {/* Success Message */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">
                  {t('upload.success', { count: uploadedFiles.length })}
                </h3>
              </div>
              <div className="mt-2 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <p key={index} className="text-sm text-green-700">
                    ✓ {file.name || `File ${index + 1}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            {uploadedFiles.length > 0 ? t('upload.done') : t('upload.cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
