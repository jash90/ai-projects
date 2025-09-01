import React, { useState, useEffect } from 'react'
import { Agent, AgentCreate, AgentUpdate } from '@/types'
import { modelsApi } from '@/lib/api'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AgentDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AgentCreate | AgentUpdate) => Promise<void>
  title: string
  agent?: Agent | null
}

interface AIStatus {
  providers: Record<string, boolean>
  models: Record<string, Array<{ id: string; name: string }>>
}

export function AgentDialog({ open, onClose, onSubmit, title, agent }: AgentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    provider: 'openai' as 'openai' | 'anthropic',
    model: '',
    temperature: 0.7,
    max_tokens: 2000,
  })
  
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load AI status when dialog opens
  useEffect(() => {
    if (open && !aiStatus) {
      loadAIStatus()
    }
  }, [open, aiStatus])

  // Populate form when editing
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description || '',
        system_prompt: agent.system_prompt,
        provider: agent.provider,
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
      })
    } else {
      // Reset form for new agent
      setFormData({
        name: '',
        description: '',
        system_prompt: '',
        provider: 'openai',
        model: '',
        temperature: 0.7,
        max_tokens: 2000,
      })
    }
  }, [agent])

  const loadAIStatus = async () => {
    setIsLoading(true)
    try {
      // Get provider status and models
      const [statusResponse, modelsResponse] = await Promise.all([
        modelsApi.getProviderStatus(),
        modelsApi.getModels()
      ])
      
      if (statusResponse.success && modelsResponse.success) {
        // Transform the data to match expected format
        const providers: Record<string, boolean> = {}
        const models: Record<string, Array<{ id: string; name: string }>> = {}
        
        // Build providers map
        statusResponse.data?.providers?.forEach((provider: any) => {
          providers[provider.name] = provider.configured
        })
        
        // Build models map by provider
        modelsResponse.data?.models?.forEach((model: any) => {
          if (!models[model.provider]) {
            models[model.provider] = []
          }
          models[model.provider].push({ id: model.id, name: model.name })
        })
        
        const aiStatus = { providers, models }
        setAiStatus(aiStatus)
        
        // Auto-select first available model if none selected
        if (!formData.model && models[formData.provider] && models[formData.provider].length > 0) {
          const firstModel = models[formData.provider][0]
          if (firstModel) {
            setFormData(prev => ({ ...prev, model: firstModel.id }))
          }
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      setError('Failed to load AI models. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProviderChange = (provider: string) => {
    const availableModels = aiStatus?.models[provider] || []
    setFormData(prev => ({
      ...prev,
      provider: provider as 'openai' | 'anthropic',
      model: availableModels[0]?.id || '', // Auto-select first available model
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (!formData.name.trim()) {
      setError('Agent name is required')
      return
    }
    
    if (!formData.system_prompt.trim()) {
      setError('System prompt is required')
      return
    }
    
    if (!formData.model) {
      setError('Model selection is required')
      return
    }
    
    if (!aiStatus?.providers[formData.provider]) {
      setError(`${formData.provider} provider is not configured`)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        system_prompt: formData.system_prompt.trim(),
        provider: formData.provider,
        model: formData.model,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
      })
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableModels = aiStatus?.models[formData.provider] || []
  const isProviderAvailable = aiStatus?.providers[formData.provider] || false

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-muted-foreground">Loading AI providers...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Code Expert, Creative Writer"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the agent's purpose"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="system_prompt">System Prompt *</Label>
                  <Textarea
                    id="system_prompt"
                    value={formData.system_prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                    placeholder="Define the agent's role, personality, and capabilities..."
                    rows={6}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This prompt defines how the AI agent will behave and respond.
                  </p>
                </div>
              </div>

              {/* AI Provider Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">AI Provider Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider">Provider *</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">
                          <div className="flex items-center gap-2">
                            <span>🤖</span>
                            <span>OpenAI</span>
                            {!aiStatus?.providers.openai && (
                              <span className="text-xs text-destructive">(Not configured)</span>
                            )}
                          </div>
                        </SelectItem>
                        <SelectItem value="anthropic">
                          <div className="flex items-center gap-2">
                            <span>🧠</span>
                            <span>Anthropic</span>
                            {!aiStatus?.providers.anthropic && (
                              <span className="text-xs text-destructive">(Not configured)</span>
                            )}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {!isProviderAvailable && (
                      <p className="text-xs text-destructive mt-1">
                        This provider is not configured. Please add API keys to use it.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="model">Model *</Label>
                    <Select
                      value={formData.model}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select model...">
                          {(() => {
                            const selectedModel = availableModels.find(m => m.id === formData.model)
                            return selectedModel ? selectedModel.name : 'Select model...'
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        temperature: parseFloat(e.target.value) || 0 
                      }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Controls randomness (0.0 = deterministic, 2.0 = very creative)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="max_tokens">Max Tokens</Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      min="1"
                      max="8000"
                      step="100"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_tokens: parseInt(e.target.value) || 2000 
                      }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum response length (higher = longer responses)
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || isSubmitting || !isProviderAvailable}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                {agent ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              agent ? 'Update Agent' : 'Create Agent'
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
