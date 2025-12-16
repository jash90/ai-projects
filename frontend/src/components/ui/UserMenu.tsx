import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut, Shield, Settings, Globe } from 'lucide-react'
import { LanguageSelector } from './LanguageSelector'
import { useAuth } from '@/stores/authStore'

interface UserMenuProps {
  className?: string
  showAdminLink?: boolean
}

export function UserMenu({ className = '', showAdminLink = true }: UserMenuProps) {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!user) return null

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
      >
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-card-foreground">{user.username}</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg py-2 min-w-48 z-50">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-medium text-card-foreground">{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {user.role === 'admin' && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-1">
                {t('userMenu.admin')}
              </span>
            )}
          </div>
          
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
            onClick={() => setShowMenu(false)}
          >
            <Settings className="w-4 h-4" />
            {t('userMenu.settings')}
          </Link>
          
          {user.role === 'admin' && showAdminLink && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setShowMenu(false)}
            >
              <Shield className="w-4 h-4" />
              {t('userMenu.adminPanel')}
            </Link>
          )}

          <div className="border-t border-border my-1"></div>

          <div className="px-2 py-1">
            <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" />
              {t('userMenu.language')}
            </div>
            <LanguageSelector variant="dropdown" className="mt-1" />
          </div>

          <div className="border-t border-border my-1"></div>
          
          <button
            onClick={() => {
              handleLogout()
              setShowMenu(false)
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
