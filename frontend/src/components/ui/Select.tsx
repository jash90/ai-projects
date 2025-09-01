import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
  onSelect?: () => void
}

interface SelectValueProps {
  placeholder?: string
  className?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  placeholder?: string
}>({
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
})

const Select = ({ value, onValueChange, placeholder, children, className }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, placeholder }}>
      <div ref={selectRef} className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = ({ children, className }: SelectTriggerProps) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
      <svg
        className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
}

const SelectContent = ({ children, className }: SelectContentProps) => {
  const { isOpen } = React.useContext(SelectContext)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'absolute z-50 top-full mt-1 min-w-full overflow-hidden rounded-md border border-border bg-background shadow-md',
        className
      )}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

const SelectItem = ({ value, children, className, onSelect }: SelectItemProps) => {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext)

  const handleSelect = () => {
    onValueChange(value)
    setIsOpen(false)
    onSelect?.()
  }

  return (
    <div
      onClick={handleSelect}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className
      )}
    >
      {children}
    </div>
  )
}

const SelectValue = ({ placeholder, className }: SelectValueProps) => {
  const { value, placeholder: contextPlaceholder } = React.useContext(SelectContext)

  return (
    <span className={cn('block truncate', className)}>
      {value || placeholder || contextPlaceholder}
    </span>
  )
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
}
