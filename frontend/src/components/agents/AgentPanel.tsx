import { useEffect, useState } from 'react'
import { Bot, Grid } from 'lucide-react'
import { Agent } from '@/types'
import { useAgents } from '@/stores/agentStore'
import { useAuth } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AgentPickerDialog } from './AgentPickerDialog'
import { cn, getInitials, generateColorFromString } from '@/lib/utils'

interface AgentPanelProps {
  selectedAgentId?: string
  onAgentSelect: (agent: Agent) => void
  className?: string
}

export function AgentPanel({ selectedAgentId, onAgentSelect, className }: AgentPanelProps) {
  const [showPickerDialog, setShowPickerDialog] = useState(false)
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const {
    agents,
    isLoading,
    error,
    fetchAgents,
    clearError
  } = useAgents()

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖'
      case 'anthropic':
        return '🧠'
      default:
        return '⚡'
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'text-green-600 dark:text-green-400'
      case 'anthropic':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (isLoading && agents.length === 0) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">AI Agents</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-card border-r border-border', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Agents
          </h2>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearError}
              className="mt-1 h-6 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Selected Agent Card */}
      <div className="flex-1 p-4">
        {(() => {
          const selectedAgent = agents.find(a => a.id === selectedAgentId)

          if (agents.length === 0) {
            return (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No agents available</p>
                <p className="text-xs mt-1">Contact administrator to create agents</p>
              </div>
            )
          }

          if (!selectedAgent) {
            return (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No agent selected</p>
                <p className="text-xs mt-1">Click "Browse Agents" to select one</p>
              </div>
            )
          }

          return (
            <div className="p-4 rounded-lg border border-border bg-accent/30">
              <div className="flex items-start gap-3 mb-3">
                {/* Agent Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: generateColorFromString(selectedAgent.name) }}
                >
                  {getInitials(selectedAgent.name)}
                </div>

                {/* Agent Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      {selectedAgent.name}
                    </h3>
                    {isAdmin && (
                      <span className={cn('text-sm', getProviderColor(selectedAgent.provider))}>
                        {getProviderIcon(selectedAgent.provider)}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{selectedAgent.provider}</span>
                      <span>•</span>
                      <span>{selectedAgent.model}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedAgent.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedAgent.description}
                </p>
              )}

              {isAdmin && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                    Temp: {selectedAgent.temperature}
                  </span>
                  <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                    Max: {selectedAgent.max_tokens} tokens
                  </span>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Browse All Agents */}
      {agents.length > 0 && (
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowPickerDialog(true)}
          >
            <Grid className="w-4 h-4 mr-2" />
            Browse All Agents
          </Button>
        </div>
      )}

      {/* Agent Picker Dialog */}
      <AgentPickerDialog
        open={showPickerDialog}
        onClose={() => setShowPickerDialog(false)}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentSelect={onAgentSelect}
        isAdmin={isAdmin}
      />
    </div>
  )
}
