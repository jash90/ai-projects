import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  dot?: boolean
  children?: React.ReactNode
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', dot, children, ...props }, ref) => {
    const variants = {
      default: 'bg-primary/10 text-primary border-primary/20',
      secondary: 'bg-secondary text-secondary-foreground border-border',
      success: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      destructive: 'bg-destructive/10 text-destructive border-destructive/20',
      info: 'bg-info/10 text-info border-info/20',
      outline: 'bg-transparent text-foreground border-border',
    }

    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      default: 'text-xs px-2.5 py-1',
      lg: 'text-sm px-3 py-1.5',
    }

    const dotColors = {
      default: 'bg-primary',
      secondary: 'bg-muted-foreground',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
      info: 'bg-info',
      outline: 'bg-foreground',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium',
          'transition-colors duration-200',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              dotColors[variant]
            )}
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Status indicator with pulse animation
export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline' | 'busy' | 'away' | 'idle'
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'default' | 'lg'
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, label, showLabel = false, size = 'default', className, ...props }, ref) => {
    const statusConfig = {
      online: {
        color: 'bg-success',
        label: label || 'Online',
        pulse: true,
      },
      offline: {
        color: 'bg-muted-foreground',
        label: label || 'Offline',
        pulse: false,
      },
      busy: {
        color: 'bg-destructive',
        label: label || 'Busy',
        pulse: true,
      },
      away: {
        color: 'bg-warning',
        label: label || 'Away',
        pulse: false,
      },
      idle: {
        color: 'bg-muted-foreground',
        label: label || 'Idle',
        pulse: false,
      },
    }

    const sizes = {
      sm: 'h-2 w-2',
      default: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
    }

    const config = statusConfig[status]

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center gap-2', className)}
        {...props}
      >
        <span className="relative flex">
          <span
            className={cn(
              'rounded-full',
              sizes[size],
              config.color
            )}
          />
          {config.pulse && (
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                config.color
              )}
            />
          )}
        </span>
        {showLabel && (
          <span className="text-sm text-muted-foreground">{config.label}</span>
        )}
      </div>
    )
  }
)

StatusIndicator.displayName = 'StatusIndicator'

// Tag component for categorization
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
  removable?: boolean
  onRemove?: () => void
  children: React.ReactNode
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ variant = 'default', removable, onRemove, children, className, ...props }, ref) => {
    const variants = {
      default: 'bg-muted text-muted-foreground hover:bg-muted/80',
      primary: 'bg-primary/10 text-primary hover:bg-primary/20',
      success: 'bg-success/10 text-success hover:bg-success/20',
      warning: 'bg-warning/10 text-warning hover:bg-warning/20',
      destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
          'transition-colors duration-200',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'ml-0.5 rounded-full p-0.5 hover:bg-foreground/10',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
            )}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    )
  }
)

Tag.displayName = 'Tag'

export { Badge, StatusIndicator, Tag }
