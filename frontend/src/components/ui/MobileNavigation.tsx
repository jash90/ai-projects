import { useState, useEffect } from "react";
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FolderOpen, 
  BarChart3, 
  Settings, 
  Shield, 
  Menu, 
  X,
  Plus,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  onNewProject?: () => void;
}

export function MobileNavigation({ onNewProject }: MobileNavigationProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.mobile-nav')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navigationItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      active: location.pathname === '/dashboard' || location.pathname === '/'
    },
    {
      label: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      active: location.pathname.startsWith('/projects')
    },
    {
      label: 'Usage',
      href: '/usage',
      icon: BarChart3,
      active: location.pathname === '/usage'
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: location.pathname === '/settings'
    },
  ];

  // Add admin panel for admin users
  if (user?.role === 'admin') {
    navigationItems.push({
      label: 'Admin Panel',
      href: '/admin',
      icon: Shield,
      active: location.pathname === '/admin'
    });
  }

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-nav lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo/Brand */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CP</span>
            </div>
            <span className="font-semibold text-foreground">AI Projects</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* New Project Button */}
            {onNewProject && location.pathname === '/dashboard' && (
              <Button
                onClick={onNewProject}
                size="sm"
                className="flex items-center gap-1 px-3"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">New</span>
              </Button>
            )}

            {/* Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
      )}

      {/* Side Menu */}
      <div className={cn(
        "mobile-nav fixed top-0 right-0 h-full w-80 max-w-[80vw] bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.role === 'admin' && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-1">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      item.active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors",
                  item.active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Spacer for fixed bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  );
}

// Hook to detect mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}
