import React from 'react';
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
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Link to={backTo}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-4">
            {/* Custom actions */}
            {actions}

            {/* Refresh button */}
            {showRefresh && onRefresh && (
              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                {refreshLabel}
              </Button>
            )}

            {/* User menu */}
            {showUserMenu && (
              <UserMenu {...userMenuProps} />
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="border-t">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
