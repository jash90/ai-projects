import React, { useState, useEffect } from 'react'
import { Plus, Settings, Trash2, Bot, Zap } from 'lucide-react'
import { Agent, AgentCreate, AgentUpdate } from '@/types'
import { useAgents } from '@/stores/agentStore'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AgentDialog } from './AgentDialog'
import { cn, getInitials, generateColorFromString } from '@/lib/utils'

interface AgentPanelProps {
  selectedAgentId?: string
  onAgentSelect: (agent: Agent) => void
  className?: string
}

export function AgentPanel({ selectedAgentId, onAgentSelect, className }: AgentPanelProps) {
  const {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    clearError
  } = useAgents()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleCreateAgent = async (data: AgentCreate) => {
    try {
      const newAgent = await createAgent(data)
      setShowCreateDialog(false)
      onAgentSelect(newAgent)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleUpdateAgent = async (data: AgentUpdate) => {
    if (!editingAgent) return
    
    try {
      const updatedAgent = await updateAgent(editingAgent.id, data)
      setEditingAgent(null)
      if (selectedAgentId === editingAgent.id) {
        onAgentSelect(updatedAgent)
      }
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleDeleteAgent = async (agent: Agent) => {
    if (confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      try {
        await deleteAgent(agent.id)
        if (selectedAgentId === agent.id && agents.length > 0) {
          // Select the first remaining agent
          const remainingAgents = agents.filter(a => a.id !== agent.id)
          if (remainingAgents.length > 0) {
            onAgentSelect(remainingAgents[0])
          }
        }
      } catch (error) {
        // Error is handled by the store
      }
    }
  }

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
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="h-8 w-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
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

      {/* Agent List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No agents available</p>
              <p className="text-xs mt-1">Create your first AI agent to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'group relative p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50',
                    selectedAgentId === agent.id
                      ? 'bg-accent border-accent-foreground/20'
                      : 'border-border hover:border-accent-foreground/30'
                  )}
                  onClick={() => onAgentSelect(agent)}
                >
                  <div className="flex items-start gap-3">
                    {/* Agent Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: generateColorFromString(agent.name) }}
                    >
                      {getInitials(agent.name)}
                    </div>

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {agent.name}
                        </h3>
                        <span className={cn('text-xs', getProviderColor(agent.provider))}>
                          {getProviderIcon(agent.provider)}
                        </span>
                      </div>
                      
                      {agent.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {agent.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{agent.provider}</span>
                        <span>•</span>
                        <span>{agent.model}</span>
                        <span>•</span>
                        <span>T: {agent.temperature}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingAgent(agent)
                        }}
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAgent(agent)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {agents.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Quick Select</div>
          <Select
            value={selectedAgentId || ''}
            onValueChange={(value) => {
              const agent = agents.find(a => a.id === value)
              if (agent) onAgentSelect(agent)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{getProviderIcon(agent.provider)}</span>
                    <span>{agent.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({agent.provider})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Create Agent Dialog */}
      <AgentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAgent}
        title="Create New Agent"
      />

      {/* Edit Agent Dialog */}
      <AgentDialog
        open={!!editingAgent}
        onClose={() => setEditingAgent(null)}
        onSubmit={handleUpdateAgent}
        title="Edit Agent"
        agent={editingAgent}
      />
    </div>
  )
}
