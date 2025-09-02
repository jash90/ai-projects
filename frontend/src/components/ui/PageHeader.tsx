;
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/components/ui/UserMenu';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  refreshLabel?: string;
  isRefreshing?: boolean;
  showUserMenu?: boolean;
  userMenuProps?: {
    showAdminLink?: boolean;
  };
  actions?: React.ReactNode;
  tabs?: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
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
}: PageHeaderProps) {

  return (
    <div className={cn("bg-card shadow-sm border-b", className)}>
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and subtitle */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {showBackButton && (
              <Link to={backTo}>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground mt-1 text-sm sm:text-base hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
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
        <div className="border-t">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap shrink-0",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
