import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'ghost'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, leftIcon, rightIcon, variant = 'default', id, ...props }, ref) => {
    const inputId = id || React.useId()

    const variants = {
      default: [
        'border border-input bg-background',
        'hover:border-muted-foreground/30',
        'focus:border-primary focus:ring-2 focus:ring-ring/20',
      ].join(' '),
      filled: [
        'border-0 bg-muted',
        'hover:bg-muted/80',
        'focus:bg-background focus:ring-2 focus:ring-ring/20',
      ].join(' '),
      ghost: [
        'border-0 bg-transparent',
        'hover:bg-muted/50',
        'focus:bg-muted/50 focus:ring-2 focus:ring-ring/20',
      ].join(' '),
    }

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              // Base styles
              'flex h-10 w-full rounded-md px-3 py-2 text-sm',
              'ring-offset-background',
              'transition-all duration-200',
              // Placeholder
              'placeholder:text-muted-foreground',
              // File input styles
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
              // Focus states
              'focus-visible:outline-none',
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50',
              // Variant
              variants[variant],
              // Error state
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              // Icon padding
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea component with similar styling
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  variant?: 'default' | 'filled' | 'ghost'
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, variant = 'default', id, ...props }, ref) => {
    const textareaId = id || React.useId()

    const variants = {
      default: [
        'border border-input bg-background',
        'hover:border-muted-foreground/30',
        'focus:border-primary focus:ring-2 focus:ring-ring/20',
      ].join(' '),
      filled: [
        'border-0 bg-muted',
        'hover:bg-muted/80',
        'focus:bg-background focus:ring-2 focus:ring-ring/20',
      ].join(' '),
      ghost: [
        'border-0 bg-transparent',
        'hover:bg-muted/50',
        'focus:bg-muted/50 focus:ring-2 focus:ring-ring/20',
      ].join(' '),
    }

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            // Base styles
            'flex min-h-[80px] w-full rounded-md px-3 py-2 text-sm',
            'ring-offset-background',
            'transition-all duration-200',
            // Placeholder
            'placeholder:text-muted-foreground',
            // Focus
            'focus-visible:outline-none',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50',
            // Resize
            'resize-y',
            // Variant
            variants[variant],
            // Error state
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
