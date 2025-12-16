import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Upload,
  Edit3,
  Trash2,
  Copy,
} from 'lucide-react'
import { TextFile as FileType } from '@/types'
import { useFiles } from '@/stores/fileStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FileDialog } from './FileDialog'
import { UploadFileDialog } from './UploadFileDialog'
import { cn, getFileExtension, copyToClipboard } from '@/lib/utils'

interface FileExplorerProps {
  projectId: string
  selectedFileId?: string
  onFileSelect: (file: FileType) => void
  className?: string
}

interface FileTreeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string[]
  children?: FileTreeItem[]
  file?: FileType
}

export function FileExplorer({
  projectId,
  selectedFileId,
  onFileSelect,
  className
}: FileExplorerProps) {
  const { t } = useTranslation('files')
  const {
    getProjectFiles,
    fetchProjectFiles,
    createFile,
    deleteFile,
    isLoading,
    error,
    clearError
  } = useFiles()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    file: FileType
  } | null>(null)

  const files = getProjectFiles(projectId)

  useEffect(() => {
    if (projectId && files.length === 0 && !isLoading) {
      console.log('🔄 FileExplorer: Triggering fetchProjectFiles for project:', projectId)
      fetchProjectFiles(projectId)
    }
  }, [projectId])

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Build file tree from flat file list
  const buildFileTree = (files: FileType[], searchQuery: string): FileTreeItem[] => {
    const buildStartTime = performance.now()
    
    const filteredFiles = searchQuery
      ? files.filter(file => 
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : files

    const tree: FileTreeItem[] = []
    const folderMap = new Map<string, FileTreeItem>()

    filteredFiles.forEach(file => {
      const pathParts = file.name.split('/')
      const fileName = pathParts.pop() || file.name
      const folderPath = pathParts

      // Create folder structure
      let currentPath: string[] = []
      let currentParent = tree

      folderPath.forEach(folderName => {
        currentPath.push(folderName)
        const folderKey = currentPath.join('/')
        
        let folder = folderMap.get(folderKey)
        if (!folder) {
          folder = {
            id: folderKey,
            name: folderName,
            type: 'folder',
            path: [...currentPath],
            children: []
          }
          folderMap.set(folderKey, folder)
          currentParent.push(folder)
        }
        
        currentParent = folder.children!
      })

      // Add file to appropriate location
      currentParent.push({
        id: file.id,
        name: fileName,
        type: 'file',
        path: [...folderPath, fileName],
        file
      })
    })

    // Sort tree items (folders first, then files, both alphabetically)
    const sortTreeItems = (items: FileTreeItem[]): FileTreeItem[] => {
      return items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      }).map(item => ({
        ...item,
        children: item.children ? sortTreeItems(item.children) : undefined
      }))
    }

    const buildEndTime = performance.now()
    console.log(`🌳 buildFileTree took: ${(buildEndTime - buildStartTime).toFixed(2)}ms for ${filteredFiles.length} files`)
    
    return sortTreeItems(tree)
  }

  const fileTree = buildFileTree(files, searchQuery)

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const handleCreateFile = async (data: { name: string; content: string; type: string }) => {
    try {
      const newFile = await createFile(projectId, data)
      setShowCreateDialog(false)
      onFileSelect(newFile)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleUploadComplete = () => {
    // Refresh the file list to show newly uploaded files
    fetchProjectFiles(projectId)
  }

  const handleDeleteFile = async (file: FileType) => {
    if (confirm(t('explorer.deleteConfirm', { name: file.name }))) {
      try {
        await deleteFile(file.id)
        setContextMenu(null)
      } catch (error) {
        // Error is handled by the store
      }
    }
  }



  const handleCopyContent = async (file: FileType) => {
    try {
      await copyToClipboard(file.content)
      setContextMenu(null)
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  const handleRightClick = (e: React.MouseEvent, file: FileType) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    })
  }

  const handleFileClick = (file: FileType) => {
    // All files are now text files that can be opened in the editor
    onFileSelect(file)
  }

  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName)
    
    // Common file type icons
    const iconMap: Record<string, string> = {
      'js': '📜', 'jsx': '⚛️', 'ts': '📘', 'tsx': '⚛️',
      'py': '🐍', 'java': '☕', 'cpp': '⚡', 'c': '⚡',
      'html': '🌐', 'css': '🎨', 'scss': '🎨', 'sass': '🎨',
      'json': '📋', 'xml': '📋', 'yaml': '📋', 'yml': '📋',
      'md': '📝', 'txt': '📄', 'pdf': '📕',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
      'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
      'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
      'zip': '📦', 'tar': '📦', 'gz': '📦'
    }

    return iconMap[ext] || '📄'
  }

  const renderTreeItem = (item: FileTreeItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.path.join('/'))
    const isSelected = item.file && selectedFileId === item.file.id
    const indent = level * 16

    if (item.type === 'folder') {
      return (
        <div key={item.id}>
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1 hover:bg-accent/50 cursor-pointer rounded-sm',
              'text-sm text-foreground'
            )}
            style={{ paddingLeft: `${8 + indent}px` }}
            onClick={() => toggleFolder(item.path.join('/'))}
          >
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            <span className="font-medium">{item.name}</span>
          </div>
          {isExpanded && item.children && (
            <div>
              {item.children.map(child => renderTreeItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        key={item.id}
        className={cn(
          'flex items-center gap-2 px-2 py-1 hover:bg-accent/50 cursor-pointer rounded-sm group',
          'text-sm transition-colors',
          isSelected 
            ? 'bg-accent text-accent-foreground' 
            : 'text-foreground'
        )}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={() => item.file && handleFileClick(item.file)}
        onContextMenu={(e) => item.file && handleRightClick(e, item.file)}
      >
        <span className="text-base">
          {getFileIcon(item.name)}
        </span>
        <span className="flex-1 truncate" title={item.name}>
          {item.name}
        </span>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {item.file?.type}
        </span>
      </div>
    )
  }

  if (isLoading && files.length === 0) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t('explorer.title')}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-card border-r border-border', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <File className="w-5 h-5" />
            {t('explorer.title')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUploadDialog(true)}
              className="h-8 px-2"
              title={t('explorer.uploadTitle')}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="h-8 w-8 p-0"
              title={t('explorer.createTitle')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('explorer.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearError}
              className="mt-1 h-6 text-xs"
            >
              {t('explorer.dismiss')}
            </Button>
          </div>
        )}
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t('explorer.empty.title')}</p>
              <p className="text-xs mt-1">{t('explorer.empty.description')}</p>
            </div>
          ) : fileTree.length === 0 && searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('explorer.noResults')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {fileTree.map(item => renderTreeItem(item))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* File Stats */}
      {files.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {t('explorer.fileCount', { count: files.length })}
            {searchQuery && fileTree.length !== files.length && (
              <span> • {t('explorer.shown', { count: fileTree.length })}</span>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-background border border-border rounded-md shadow-lg py-1 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            onClick={() => {
              handleFileClick(contextMenu.file)
              setContextMenu(null)
            }}
          >
            <Edit3 className="w-3 h-3" />
            {t('explorer.contextMenu.open')}
          </button>

          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            onClick={() => handleCopyContent(contextMenu.file)}
          >
            <Copy className="w-3 h-3" />
            {t('explorer.contextMenu.copyContent')}
          </button>

          <div className="border-t border-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 text-destructive"
            onClick={() => handleDeleteFile(contextMenu.file)}
          >
            <Trash2 className="w-3 h-3" />
            {t('explorer.contextMenu.delete')}
          </button>
        </div>
      )}

      {/* Create File Dialog */}
      <FileDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateFile}
        title={t('dialog.createTitle')}
      />

      {/* Upload File Dialog */}
      <UploadFileDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        projectId={projectId}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}
