import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'bordered' | 'ghost'
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: [
        'bg-card text-card-foreground',
        'border border-border',
        'rounded-xl',
        'shadow-design-sm',
      ].join(' '),
      elevated: [
        'bg-card text-card-foreground',
        'border border-border',
        'rounded-xl',
        'shadow-design-md',
        'hover:shadow-design-lg hover:border-primary/20',
        'transition-all duration-200',
      ].join(' '),
      interactive: [
        'bg-card text-card-foreground',
        'border border-border',
        'rounded-xl',
        'shadow-design-sm',
        'cursor-pointer',
        'hover:shadow-design-lg hover:border-primary/30 hover:-translate-y-0.5',
        'active:scale-[0.99]',
        'transition-all duration-200',
      ].join(' '),
      bordered: [
        'bg-transparent text-card-foreground',
        'border-2 border-border',
        'rounded-xl',
      ].join(' '),
      ghost: [
        'bg-transparent text-card-foreground',
        'rounded-xl',
      ].join(' '),
    }

    return (
      <div
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-xl font-semibold leading-none tracking-tight text-foreground',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

CardTitle.displayName = 'CardTitle'

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)

CardDescription.displayName = 'CardDescription'

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  noPadding?: boolean
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, noPadding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(noPadding ? '' : 'p-6 pt-0', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

// Stat Card for dashboards
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info'
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, description, icon, trend, variant = 'default', className, ...props }, ref) => {
    const gradientClasses = {
      default: '',
      primary: 'bg-gradient-primary text-white',
      success: 'bg-gradient-success text-white',
      warning: 'bg-gradient-warning text-white',
      info: 'bg-gradient-info text-white',
    }

    const isGradient = variant !== 'default'

    return (
      <Card
        ref={ref}
        variant="elevated"
        className={cn(
          'relative overflow-hidden',
          gradientClasses[variant],
          className
        )}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className={cn(
                'text-sm font-medium',
                isGradient ? 'text-white/80' : 'text-muted-foreground'
              )}>
                {title}
              </p>
              <p className={cn(
                'text-3xl font-bold tracking-tight',
                isGradient ? 'text-white' : 'text-foreground'
              )}>
                {value}
              </p>
              {description && (
                <p className={cn(
                  'text-xs',
                  isGradient ? 'text-white/70' : 'text-muted-foreground'
                )}>
                  {description}
                </p>
              )}
              {trend && (
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  trend.isPositive
                    ? isGradient ? 'text-white' : 'text-success'
                    : isGradient ? 'text-white' : 'text-destructive'
                )}>
                  <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                  <span className={isGradient ? 'text-white/70' : 'text-muted-foreground'}>
                    vs last period
                  </span>
                </div>
              )}
            </div>
            {icon && (
              <div className={cn(
                'rounded-xl p-3',
                isGradient ? 'bg-white/20' : 'bg-primary/10'
              )}>
                <div className={cn(
                  'h-6 w-6',
                  isGradient ? 'text-white' : 'text-primary'
                )}>
                  {icon}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)

StatCard.displayName = 'StatCard'
