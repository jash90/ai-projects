import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'warning' | 'gradient'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      default: [
        'bg-primary text-primary-foreground',
        'hover:bg-primary-hover hover:shadow-design-md',
        'active:scale-[0.98]',
      ].join(' '),
      destructive: [
        'bg-destructive text-destructive-foreground',
        'hover:bg-destructive/90 hover:shadow-design-md',
        'active:scale-[0.98]',
      ].join(' '),
      outline: [
        'border border-input bg-background text-foreground',
        'hover:bg-accent hover:text-accent-foreground hover:border-primary/30',
        'active:scale-[0.98]',
      ].join(' '),
      secondary: [
        'bg-secondary text-secondary-foreground',
        'hover:bg-secondary-hover hover:shadow-design-sm',
        'active:scale-[0.98]',
      ].join(' '),
      ghost: [
        'text-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'active:scale-[0.98]',
      ].join(' '),
      link: [
        'text-primary underline-offset-4',
        'hover:underline hover:text-primary-hover',
      ].join(' '),
      success: [
        'bg-success text-success-foreground',
        'hover:bg-success/90 hover:shadow-design-md',
        'active:scale-[0.98]',
      ].join(' '),
      warning: [
        'bg-warning text-warning-foreground',
        'hover:bg-warning/90 hover:shadow-design-md',
        'active:scale-[0.98]',
      ].join(' '),
      gradient: [
        'bg-gradient-primary text-white',
        'hover:brightness-110 hover:shadow-design-lg',
        'active:scale-[0.98]',
      ].join(' '),
    }

    const sizes = {
      xs: 'h-7 px-2 text-xs rounded',
      sm: 'h-8 px-3 text-sm rounded-md',
      default: 'h-10 px-4 py-2 text-sm rounded-md',
      lg: 'h-11 px-6 text-base rounded-lg',
      icon: 'h-10 w-10 rounded-md',
    }

    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
          // Transitions
          'transition-all duration-200 ease-out',
          // Focus states
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          // Disabled states
          'disabled:pointer-events-none disabled:opacity-50',
          // Variant and size
          variants[variant],
          sizes[size],
          // Loading state
          isLoading && 'cursor-wait',
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
