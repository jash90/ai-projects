import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, ChevronDown, Check, Sparkles } from 'lucide-react'
import { Agent } from '@/types'
import { cn, getInitials, generateColorFromString } from '@/lib/utils'

interface AgentDropdownProps {
  agents: Agent[]
  selectedAgent: Agent | null
  onAgentSelect: (agent: Agent) => void
  className?: string
  compact?: boolean
}

export function AgentDropdown({
  agents,
  selectedAgent,
  onAgentSelect,
  className,
  compact = false
}: AgentDropdownProps) {
  const { t } = useTranslation('agents')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖'
      case 'anthropic':
        return '🧠'
      case 'openrouter':
        return '🌐'
      default:
        return '⚡'
    }
  }

  const handleSelect = (agent: Agent) => {
    onAgentSelect(agent)
    setIsOpen(false)
  }

  if (agents.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-sm",
        className
      )}>
        <Bot className="w-4 h-4" />
        <span>{t('dropdown.noAgents')}</span>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
          "border border-border hover:border-primary/30 hover:bg-muted/50",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          isOpen && "border-primary/30 bg-muted/50",
          compact ? "text-sm" : ""
        )}
      >
        {selectedAgent ? (
          <>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
              style={{ backgroundColor: generateColorFromString(selectedAgent.name) }}
            >
              {getInitials(selectedAgent.name)}
            </div>
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {selectedAgent.name}
            </span>
          </>
        ) : (
          <>
            <Bot className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground">{t('dropdown.selectAgent')}</span>
          </>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 mt-1 z-50",
          "w-72 max-h-80 overflow-auto",
          "bg-card border border-border rounded-xl shadow-design-lg",
          "animate-scale-in origin-top-left"
        )}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t('dropdown.title')}</span>
            </div>
          </div>

          {/* Agent List */}
          <div className="p-1">
            {agents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id

              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelect(agent)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50 text-left",
                    isSelected && "bg-primary/5"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: generateColorFromString(agent.name) }}
                  >
                    {getInitials(agent.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {agent.name}
                      </span>
                      <span className="text-sm">
                        {getProviderIcon(agent.provider)}
                      </span>
                    </div>
                    {agent.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {agent.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {agent.provider}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {agent.model}
                      </span>
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
