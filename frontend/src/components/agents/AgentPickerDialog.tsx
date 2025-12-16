import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Check, X, Search } from 'lucide-react'
import { Agent } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
  const [searchQuery, setSearchQuery] = useState('')

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

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'anthropic':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'openrouter':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const filteredAgents = agents.filter(agent => {
    const query = searchQuery.toLowerCase()
    const nameMatch = agent.name.toLowerCase().includes(query)
    const descriptionMatch = agent.description?.toLowerCase().includes(query)

    if (isAdmin) {
      const providerMatch = agent.provider.toLowerCase().includes(query)
      const modelMatch = agent.model.toLowerCase().includes(query)
      return nameMatch || descriptionMatch || providerMatch || modelMatch
    }

    return nameMatch || descriptionMatch
  })

  const handleSelect = (agent: Agent) => {
    onAgentSelect(agent)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogContent className="p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {t('picker.title')}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isAdmin ? t('picker.searchAdmin') : t('picker.searchUser')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 pt-4">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">{t('picker.empty.title')}</p>
                {searchQuery && (
                  <p className="text-xs mt-1">{t('picker.empty.hint')}</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id

                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        'relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      )}
                      onClick={() => handleSelect(agent)}
                    >
                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}

                      {/* Agent header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                          style={{ backgroundColor: generateColorFromString(agent.name) }}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate pr-6">
                            {agent.name}
                          </h3>
                          {isAdmin && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                getProviderColor(agent.provider)
                              )}>
                                <span>{getProviderIcon(agent.provider)}</span>
                                <span className="capitalize">{agent.provider}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {agent.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                          {agent.description}
                        </p>
                      )}

                      {/* Model info - admin only */}
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                            {agent.model}
                          </span>
                          <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                            {t('panel.temp')} {agent.temperature}
                          </span>
                          <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                            {t('panel.maxTokens')} {agent.max_tokens} {t('panel.tokens')}
                          </span>
                        </div>
                      )}

                      {/* Select button */}
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="w-full mt-4"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(agent)
                        }}
                      >
                        {isSelected ? t('picker.selected') : t('picker.select')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
