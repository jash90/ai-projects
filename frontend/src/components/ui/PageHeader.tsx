import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UserMenu } from '@/components/ui/UserMenu'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  backTo?: string
  showRefresh?: boolean
  onRefresh?: () => void
  refreshLabel?: string
  isRefreshing?: boolean
  showUserMenu?: boolean
  userMenuProps?: {
    showAdminLink?: boolean
  }
  actions?: React.ReactNode
  tabs?: Array<{
    id: string
    label: string
    icon: React.ElementType
  }>
  activeTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
  variant?: 'default' | 'gradient' | 'minimal'
}

export function PageHeader({
  title,
  subtitle,
  showBackButton = false,
  backTo = '/dashboard',
  showRefresh = false,
  onRefresh,
  refreshLabel = 'Refresh',
  isRefreshing = false,
  showUserMenu = true,
  userMenuProps = {},
  actions,
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = 'default',
}: PageHeaderProps) {
  const variantStyles = {
    default: 'bg-card border-b border-border shadow-design-sm',
    gradient: 'bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border',
    minimal: 'bg-transparent',
  }

  return (
    <div className={cn(variantStyles[variant], className)}>
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          {/* Left side - Title and subtitle */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {showBackButton && (
              <Link to={backTo}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 -ml-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground text-sm sm:text-base hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Custom actions */}
            {actions}

            {/* Refresh button */}
            {showRefresh && onRefresh && (
              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                <span className="hidden sm:inline">{refreshLabel}</span>
              </Button>
            )}

            {/* User menu - hidden on mobile when using MobileNavigation */}
            {showUserMenu && (
              <div className="hidden lg:block">
                <UserMenu {...userMenuProps} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="border-t border-border/50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    'flex items-center py-3 px-3 sm:px-4 font-medium text-sm transition-all whitespace-nowrap shrink-0 rounded-t-lg',
                    activeTab === tab.id
                      ? 'text-primary bg-primary/5 border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
