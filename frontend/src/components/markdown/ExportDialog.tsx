import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useExport } from './hooks/useExport'
import { Download, FileText, FileImage, File } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  content: string
  filename: string
}

export function ExportDialog({ open, onClose, content, filename }: ExportDialogProps) {
  const [format, setFormat] = useState<'html' | 'pdf' | 'docx'>('html')
  const [isExporting, setIsExporting] = useState(false)
  
  const { exportToFormat } = useExport()

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportToFormat(content, filename, format)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="export-dialog p-4">
        <h2 className="text-lg font-semibold mb-4">Export Document</h2>
        
        <div className="format-selection space-y-2 mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="html"
              checked={format === 'html'}
              onChange={(e) => setFormat(e.target.value as any)}
              className="form-radio text-primary"
            />
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span>HTML (Web Page)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="pdf"
              checked={format === 'pdf'}
              onChange={(e) => setFormat(e.target.value as any)}
              className="form-radio text-primary"
            />
            <FileImage className="h-5 w-5 text-muted-foreground" />
            <span>PDF (Printable Document)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="docx"
              checked={format === 'docx'}
              onChange={(e) => setFormat(e.target.value as any)}
              className="form-radio text-primary"
            />
            <File className="h-5 w-5 text-muted-foreground" />
            <span>Word Document (DOCX)</span>
          </label>
        </div>
        
        <div className="dialog-actions flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : <><Download className="h-4 w-4 mr-2" /> Export</>}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
