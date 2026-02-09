import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  side?: 'left' | 'right'
  width?: string
  title?: string
}

export function Drawer({ open, onClose, children, className, side = 'left', width, title }: DrawerProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Mount/unmount with animation
  useEffect(() => {
    if (open) {
      setMounted(true)
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Escape key + body scroll lock
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

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        className={cn(
          'absolute top-0 h-full bg-background border-border shadow-lg transition-transform duration-200 ease-out',
          width ?? 'w-72',
          side === 'left' && 'left-0 border-r',
          side === 'right' && 'right-0 border-l',
          side === 'left' && (visible ? 'translate-x-0' : '-translate-x-full'),
          side === 'right' && (visible ? 'translate-x-0' : 'translate-x-full'),
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
