import { useTranslation } from 'react-i18next'
import { Bot, Check, X } from 'lucide-react'
import { Agent } from '@/types'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn, getInitials, generateColorFromString } from '@/lib/utils'

interface AgentPickerDialogProps {
  open: boolean
  onClose: () => void
  agents: Agent[]
  selectedAgentId?: string
  onAgentSelect: (agent: Agent) => void
  isAdmin?: boolean
}

export function AgentPickerDialog({
  open,
  onClose,
  agents,
  selectedAgentId,
  onAgentSelect,
  isAdmin = false
}: AgentPickerDialogProps) {
  const { t } = useTranslation('agents')

  const handleSelect = (agent: Agent) => {
    onAgentSelect(agent)
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[480px]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {t('picker.title')}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 pt-2">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">{t('picker.empty.title')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id

                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all text-center',
                        isSelected
                          ? 'bg-primary/10 border-primary text-foreground'
                          : 'border-border hover:bg-muted/50 hover:border-primary/50 text-foreground'
                      )}
                      onClick={() => handleSelect(agent)}
                    >
                      {isSelected && (
                        <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                      )}

                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: generateColorFromString(agent.name) }}
                      >
                        {getInitials(agent.name)}
                      </div>

                      <div className="min-w-0 w-full">
                        <span className="font-medium text-sm truncate block">{agent.name}</span>
                        {isAdmin && (
                          <span className="text-xs text-muted-foreground capitalize">{agent.provider}</span>
                        )}
                        {agent.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{agent.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Drawer>
  )
}
