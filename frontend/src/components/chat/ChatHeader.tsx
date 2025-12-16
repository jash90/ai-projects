import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, FileText, Trash2, Settings } from 'lucide-react'
import type { Project, Agent } from '@/types'
import { Button } from '@/components/ui/Button'
import { StreamingToggle } from './StreamingToggle'
import { cn, getInitials, generateColorFromString } from '@/lib/utils'
import { useAuth } from '@/stores/authStore'

interface ChatHeaderProps {
  project: Project
  agent: Agent
  isConnected?: boolean
  includeFiles?: boolean
  onToggleFiles?: (include: boolean) => void
  onClearConversation?: () => void
  onToggleSidebar?: () => void
  streaming?: boolean
  onToggleStreaming?: (enabled: boolean) => void
  className?: string
  extraActions?: React.ReactNode
}

function ChatHeader({
  project,
  agent,
  isConnected = false,
  includeFiles = true,
  onToggleFiles,
  onClearConversation,
  onToggleSidebar,
  streaming = true,
  onToggleStreaming,
  className,
  extraActions
}: ChatHeaderProps) {
  const { t } = useTranslation('chat')
  const [showMenu, setShowMenu] = useState(false)
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      default: return '⚡'
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'text-green-600 dark:text-green-400'
      case 'anthropic': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className={cn('flex items-center justify-between border-b bg-background p-4', className)}>
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
            <span className="sr-only">{t('header.toggleSidebar')}</span>
          </Button>
        )}

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white"
          style={{ backgroundColor: generateColorFromString(agent.name) }}
        >
          {getInitials(agent.name)}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-foreground">{project.name}</h1>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-foreground">{agent.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {isAdmin && (
              <div className="flex items-center gap-1">
                <span className={cn('text-xs', getProviderColor(agent.provider))}>
                  {getProviderIcon(agent.provider)}
                </span>
                <span className="text-xs">{agent.model}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-xs">
                {isConnected ? t('header.connected') : t('header.disconnected')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Extra Actions */}
        {extraActions}

        {/* Streaming Toggle */}
        {onToggleStreaming && (
          <StreamingToggle
            enabled={streaming}
            onToggle={onToggleStreaming}
            className="h-8"
          />
        )}

        {/* File Context Toggle */}
        <Button
          variant={includeFiles ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleFiles?.(!includeFiles)}
          className="h-8"
        >
          <FileText className="w-4 h-4 mr-1" />
          {t('header.files')}
        </Button>

        {/* Options Menu */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="h-8 w-8"
          >
            <Settings className="w-4 h-4" />
            <span className="sr-only">{t('header.moreOptions')}</span>
          </Button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg py-1 min-w-40 z-50">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-destructive"
                onClick={() => {
                  onClearConversation?.()
                  setShowMenu(false)
                }}
              >
                <Trash2 className="w-3 h-3" />
                {t('header.clearConversation')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { ChatHeader }
