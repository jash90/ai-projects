import { useEffect, useRef, useCallback } from 'react'
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
  id?: string
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const Dialog = ({ open, onClose, children, className, size = 'default' }: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    // Focus trap
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'

      // Focus first focusable element in dialog
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        focusable?.focus()
      })
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'

      // Restore focus to previously focused element
      previousFocusRef.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
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

const DialogTitle = ({ children, className, id }: DialogTitleProps) => (
  <h2 id={id} className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
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
