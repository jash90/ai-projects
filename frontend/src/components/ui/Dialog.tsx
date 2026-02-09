import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  size?: 'default' | 'xl'
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

const Dialog = ({ open, onClose, children, className, size = 'default' }: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          'relative z-10 w-full bg-background border border-border rounded-t-xl sm:rounded-lg shadow-lg flex flex-col overflow-hidden',
          size === 'xl'
            ? 'max-w-[1200px] max-h-[90vh] sm:max-h-[1200px]'
            : 'max-w-lg max-h-[90vh] sm:max-h-[85vh]',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

const DialogContent = ({ children, className }: DialogContentProps) => (
  <div className={cn('p-6', className)}>
    {children}
  </div>
)

const DialogHeader = ({ children, className }: DialogHeaderProps) => (
  <div className={cn('space-y-1.5 text-center sm:text-left', className)}>
    {children}
  </div>
)

const DialogTitle = ({ children, className }: DialogTitleProps) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
    {children}
  </h2>
)

const DialogDescription = ({ children, className }: DialogDescriptionProps) => (
  <p className={cn('text-sm text-muted-foreground', className)}>
    {children}
  </p>
)

const DialogFooter = ({ children, className }: DialogFooterProps) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6', className)}>
    {children}
  </div>
)

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
