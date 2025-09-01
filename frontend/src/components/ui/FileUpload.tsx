import React, { useRef, useState } from 'react'
import { Upload, X, File, FileText, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  className?: string
  disabled?: boolean
  multiple?: boolean
}

interface UploadedFile {
  file: File
  id: string
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = 10,
  acceptedTypes = ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.py', '.java', '.cpp', '.go', '.rs', '.php', '.rb', '.swift', '.yaml', '.yml', '.xml', '.sql', '.sh'],
  className,
  disabled = false,
  multiple = true
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    }
    if (file.type.includes('text') || acceptedTypes.some(type => file.name.endsWith(type.replace('.', '')))) {
      return <FileText className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxFileSize}MB.`
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(fileExtension)) {
      return `File type "${fileExtension}" is not supported. Allowed types: ${acceptedTypes.join(', ')}`
    }

    return null
  }

  const handleFiles = (files: FileList) => {
    const newFiles: File[] = []
    const errors: string[] = []

    // Check total file limit
    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`Cannot upload more than ${maxFiles} files.`)
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)
      
      if (validationError) {
        errors.push(validationError)
      } else {
        newFiles.push(file)
      }
    }

    if (errors.length > 0) {
      setError(errors[0]) // Show first error
      return
    }

    setError(null)
    const updatedFiles = [...uploadedFiles, ...newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9)
    }))]
    
    setUploadedFiles(updatedFiles)
    onFilesSelected(updatedFiles.map(uf => uf.file))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(uf => uf.id !== fileId)
    setUploadedFiles(updatedFiles)
    onFilesSelected(updatedFiles.map(uf => uf.file))
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          disabled={disabled}
        />
        
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-1">
          {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-muted-foreground">
          Max {maxFiles} files, {maxFileSize}MB each
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supported: {acceptedTypes.slice(0, 5).join(', ')}{acceptedTypes.length > 5 && ` and ${acceptedTypes.length - 5} more`}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({uploadedFiles.length}/{maxFiles})</h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(uploadedFile.file)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(uploadedFile.id)
                  }}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
