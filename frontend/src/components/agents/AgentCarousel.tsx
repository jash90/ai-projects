import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Agent } from '@/types'
import { cn, getInitials, generateColorFromString } from '@/lib/utils'

interface AgentCarouselProps {
  agents: Agent[]
  selectedAgentId?: string
  onAgentSelect: (agent: Agent) => void
  isAdmin?: boolean
}

export function AgentCarousel({
  agents,
  selectedAgentId,
  onAgentSelect,
  isAdmin = false
}: AgentCarouselProps) {
  const { t } = useTranslation('agents')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to selected agent on mount
  useEffect(() => {
    if (!scrollRef.current || !selectedAgentId) return
    const index = agents.findIndex(a => a.id === selectedAgentId)
    if (index <= 0) return
    const container = scrollRef.current
    const card = container.children[index] as HTMLElement | undefined
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedAgentId, agents])

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">{t('panel.empty.title')}</p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-wrap gap-3 overflow-y-auto px-4 py-3"
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
    >
      {agents.map((agent) => {
        const isSelected = selectedAgentId === agent.id

        return (
          <div
            key={agent.id}
            className={cn(
              'w-full rounded-xl border-2 p-4 cursor-pointer transition-all',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/30'
            )}
            onClick={() => onAgentSelect(agent)}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-base font-medium text-white flex-shrink-0"
                style={{ backgroundColor: generateColorFromString(agent.name) }}
              >
                {getInitials(agent.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate text-base">
                    {agent.name}
                  </h3>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </div>

                {isAdmin && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {agent.provider}
                  </span>
                )}
              </div>
            </div>

            {agent.description && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {agent.description}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
