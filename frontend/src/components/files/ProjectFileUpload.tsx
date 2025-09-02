import React, { useState } from 'react'
import { Upload, X, File, FileText, Image, Video, Music, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { projectFilesApi } from '@/lib/api'
import { getFileExtension } from '@/lib/utils'

interface ProjectFileUploadProps {
  projectId: string
  onUploadComplete?: (file: any) => void
  onUploadError?: (error: string) => void
  className?: string
  disabled?: boolean
  maxFileSize?: number // in MB
  acceptedTypes?: string[] // MIME types or extensions
}

interface UploadingFile {
  file: File
  id: string
  progress: number
  error?: string
  completed?: boolean
}

export function ProjectFileUpload({
  projectId,
  onUploadComplete,
  onUploadError,
  className,
  disabled = false,
  maxFileSize = 50, // 50MB default
  acceptedTypes = [] // Accept all types by default
}: ProjectFileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase()
    
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />
    }
    if (type.startsWith('video/')) {
      return <Video className="w-4 h-4 text-purple-500" />
    }
    if (type.startsWith('audio/')) {
      return <Music className="w-4 h-4 text-green-500" />
    }
    if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gz')) {
      return <Archive className="w-4 h-4 text-orange-500" />
    }
    if (type.includes('text') || type.includes('json') || type.includes('xml') || type.includes('javascript') || type.includes('typescript')) {
      return <FileText className="w-4 h-4 text-gray-600" />
    }
    
    return <File className="w-4 h-4 text-gray-500" />
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxFileSize}MB.`
    }

    // Check file type if restrictions are set
    if (acceptedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const mimeType = file.type.toLowerCase()
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase()
        }
        return mimeType.includes(type.toLowerCase())
      })
      
      if (!isAccepted) {
        return `File type not supported. Allowed types: ${acceptedTypes.join(', ')}`
      }
    }

    return null
  }

  const uploadFile = async (file: File) => {
    const fileId = Math.random().toString(36).substr(2, 9)
    
    // Add to uploading files list
    const uploadingFile: UploadingFile = {
      file,
      id: fileId,
      progress: 0
    }
    
    setUploadingFiles(prev => [...prev, uploadingFile])

    try {
      // Update progress to show we're reading the file
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.id === fileId 
            ? { ...uf, progress: 25 }
            : uf
        )
      )

      // Read file content as text
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (typeof result === 'string') {
            resolve(result)
          } else {
            reject(new Error('Failed to read file as text'))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })

      // Update progress to show we're saving
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.id === fileId 
            ? { ...uf, progress: 50 }
            : uf
        )
      )

      // Create a text file in the database with the file's content
      const response = await projectFilesApi.createFile(projectId, {
        name: file.name,
        content: content,
        type: getFileExtension(file.name) || 'text'
      })

      // Mark as completed
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.id === fileId 
            ? { ...uf, progress: 100, completed: true }
            : uf
        )
      )

      // Call success callback
      if (onUploadComplete && response.success) {
        onUploadComplete(response.data?.file)
      }

      // Remove from list after 2 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(uf => uf.id !== fileId))
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      // Mark as error
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.id === fileId 
            ? { ...uf, error: errorMessage }
            : uf
        )
      )

      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }

  const handleFiles = async (files: FileList) => {
    const validFiles: File[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)
      
      if (validationError) {
        errors.push(validationError)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      setError(errors[0]) // Show first error
      return
    }

    setError(null)
    
    // Upload each file
    for (const file of validFiles) {
      await uploadFile(file)
    }
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


  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(uf => uf.id !== fileId))
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
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            if (acceptedTypes.length > 0) {
              input.accept = acceptedTypes.join(',')
            }
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement
              if (target.files) {
                handleFiles(target.files)
              }
            }
            input.click()
          }
        }}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">
          {dragActive ? 'Drop files here' : 'Upload files from your computer'}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-xs text-muted-foreground">
          Maximum file size: {maxFileSize}MB
          {acceptedTypes.length > 0 && (
            <span className="block mt-1">
              Supported types: {acceptedTypes.slice(0, 5).join(', ')}
              {acceptedTypes.length > 5 && ` and ${acceptedTypes.length - 5} more`}
            </span>
          )}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile) => (
              <div
                key={uploadingFile.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(uploadingFile.file)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                    {uploadingFile.error ? (
                      <p className="text-xs text-destructive mt-1">
                        {uploadingFile.error}
                      </p>
                    ) : uploadingFile.completed ? (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Upload complete
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${uploadingFile.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {uploadingFile.progress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeUploadingFile(uploadingFile.id)
                  }}
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
