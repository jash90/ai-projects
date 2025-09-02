import { useState } from "react";
import { 
  MoreHorizontal,
  Edit3,
  Download,
  Trash2,
  Copy,
  Share,
  Eye,
  FileText,
  Image,
  Code,
  Archive,
  X
} from 'lucide-react';
import { File as FileType } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn, getFileExtension } from '@/lib/utils';

interface MobileFileActionsProps {
  file: FileType;
  onEdit?: (file: FileType) => void;
  onDownload?: (file: FileType) => void;
  onDelete?: (file: FileType) => void;
  onCopy?: (file: FileType) => void;
  onShare?: (file: FileType) => void;
  onPreview?: (file: FileType) => void;
  className?: string;
}

export function MobileFileActions({
  file,
  onEdit,
  onDownload,
  onDelete,
  onCopy,
  onShare,
  onPreview,
  className
}: MobileFileActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return Image;
    }
    
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss'].includes(ext)) {
      return Code;
    }
    
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return Archive;
    }
    
    return FileText;
  };

  const Icon = getFileIcon(file.name);

  const actions = [
    {
      label: 'Preview',
      icon: Eye,
      action: onPreview,
      available: !!onPreview,
      primary: true
    },
    {
      label: 'Edit',
      icon: Edit3,
      action: onEdit,
      available: !!onEdit,
      primary: true
    },
    {
      label: 'Download',
      icon: Download,
      action: onDownload,
      available: !!onDownload,
      primary: false
    },
    {
      label: 'Copy',
      icon: Copy,
      action: onCopy,
      available: !!onCopy,
      primary: false
    },
    {
      label: 'Share',
      icon: Share,
      action: onShare,
      available: !!onShare,
      primary: false
    },
    {
      label: 'Delete',
      icon: Trash2,
      action: onDelete,
      available: !!onDelete,
      primary: false,
      destructive: true
    }
  ].filter(action => action.available);

  const handleAction = (actionFn?: (file: FileType) => void) => {
    if (actionFn) {
      actionFn(file);
    }
    setIsOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("p-2 h-auto touch-target", className)}
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>

      {/* Mobile Action Sheet */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Action Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-xl animate-slide-in-from-bottom safe-area-bottom">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* File Info */}
            <div className="px-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size || 0)}</span>
                    <span>•</span>
                    <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-2">
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {actions.filter(action => action.primary).map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 py-4 h-auto touch-target"
                    >
                      <ActionIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Secondary Actions */}
              {actions.filter(action => !action.primary).length > 0 && (
                <div className="space-y-1">
                  {actions.filter(action => !action.primary).map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.label}
                        variant="ghost"
                        onClick={() => handleAction(action.action)}
                        className={cn(
                          "w-full justify-start gap-3 py-3 h-auto touch-target",
                          action.destructive && "text-destructive hover:text-destructive"
                        )}
                      >
                        <ActionIcon className="w-5 h-5" />
                        <span className="font-medium">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Safe area bottom padding */}
            <div className="h-4" />
          </div>
        </>
      )}
    </>
  );
}

// Mobile File List Item Component
interface MobileFileItemProps {
  file: FileType;
  isSelected?: boolean;
  onSelect?: (file: FileType) => void;
  onEdit?: (file: FileType) => void;
  onDownload?: (file: FileType) => void;
  onDelete?: (file: FileType) => void;
  onCopy?: (file: FileType) => void;
  onShare?: (file: FileType) => void;
  onPreview?: (file: FileType) => void;
  className?: string;
}

export function MobileFileItem({
  file,
  isSelected = false,
  onSelect,
  onEdit,
  onDownload,
  onDelete,
  onCopy,
  onShare,
  onPreview,
  className
}: MobileFileItemProps) {
  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return Image;
    }
    
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss'].includes(ext)) {
      return Code;
    }
    
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return Archive;
    }
    
    return FileText;
  };

  const Icon = getFileIcon(file.name);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(file);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 border-b border-border bg-card transition-colors touch-target",
        isSelected && "bg-primary/5 border-primary/20",
        onSelect && "cursor-pointer hover:bg-muted/50 active:bg-muted",
        className
      )}
      onClick={handleSelect}
    >
      {/* File Icon */}
      <div className={cn(
        "p-2 rounded-lg shrink-0",
        isSelected ? "bg-primary/10" : "bg-muted"
      )}>
        <Icon className={cn(
          "w-5 h-5",
          isSelected ? "text-primary" : "text-muted-foreground"
        )} />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "font-medium truncate",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {file.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span>{formatFileSize(file.size || 0)}</span>
          <span>•</span>
          <span>{new Date(file.updated_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0">
        <MobileFileActions
          file={file}
          onEdit={onEdit}
          onDownload={onDownload}
          onDelete={onDelete}
          onCopy={onCopy}
          onShare={onShare}
          onPreview={onPreview}
        />
      </div>
    </div>
  );
}
