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
import { FileUpload } from '@/components/ui/FileUpload'
import { ModelPickerModal } from '@/components/models/ModelPickerModal'

interface AgentDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AgentCreate | AgentUpdate) => Promise<void>
  title: string
  agent?: Agent | null
}

interface ModelMetadata {
  provider?: string
  cost?: string
  contextWindow?: number
}

interface EnrichedModel {
  id: string
  name: string
  description?: string
  category?: string
  isPopular?: boolean
  metadata?: ModelMetadata
}

interface AIProvider {
  name: string
  configured: boolean
}

interface RawModel {
  id: string
  name: string
  description?: string
  provider: string
  context_window?: number
  cost_per_1k_input_tokens?: string | number
}

interface AIStatus {
  providers: Record<string, boolean>
  models: Record<string, EnrichedModel[]>
}

export function AgentDialog({ open, onClose, onSubmit, title, agent }: AgentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    provider: 'openai' as 'openai' | 'anthropic' | 'openrouter',
    model: '',
    temperature: 0.7,
    max_tokens: 2000,
    files: [] as File[],
  })
  
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showModelPicker, setShowModelPicker] = useState(false)

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
        files: [] as File[], // Can't populate with existing files (they're not File objects)
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
        files: [] as File[],
      })
    }
  }, [agent])

  const loadAIStatus = async () => {
    setIsLoading(true)
    setLoadError(null) // Clear any previous errors
    try {
      // Get provider status and models
      const [statusResponse, modelsResponse] = await Promise.all([
        modelsApi.getProviderStatus(),
        modelsApi.getModels()
      ])

      if (statusResponse.success && modelsResponse.success) {
        // Transform the data to match expected format
        const providers: Record<string, boolean> = {}
        const models: Record<string, EnrichedModel[]> = {}

        // Build providers map
        statusResponse.data?.providers?.forEach((provider: AIProvider) => {
          providers[provider.name] = provider.configured
        })

        // Define popular models for quick selection
        const popularModels = new Set([
          'anthropic/claude-3.5-sonnet',
          'openai/gpt-4o',
          'openai/gpt-4o-mini',
          'anthropic/claude-3-haiku',
          'google/gemini-pro-1.5',
          'meta-llama/llama-3.1-70b-instruct',
          'openai/o1-preview',
          'google/gemini-2.0-flash-exp'
        ])

        // Build models map by provider with enhanced metadata
        modelsResponse.data?.models?.forEach((model: RawModel) => {
          if (!models[model.provider]) {
            models[model.provider] = []
          }

          // Extract provider name from model ID for OpenRouter
          let category = model.provider === 'openrouter' ?
            model.id.split('/')[0]?.charAt(0).toUpperCase() + model.id.split('/')[0]?.slice(1) || 'Other'
            : undefined

          // Determine cost tier for display
          let costTier = 'Unknown'
          if (model.cost_per_1k_input_tokens !== undefined) {
            const cost = typeof model.cost_per_1k_input_tokens === 'number'
              ? model.cost_per_1k_input_tokens
              : parseFloat(model.cost_per_1k_input_tokens)
            if (cost === 0) costTier = 'Free'
            else if (cost < 0.5) costTier = 'Very Low'
            else if (cost < 2) costTier = 'Low'
            else if (cost < 5) costTier = 'Medium'
            else if (cost < 10) costTier = 'High'
            else costTier = 'Very High'
          }

          models[model.provider].push({
            id: model.id,
            name: model.name,
            description: model.description,
            category,
            isPopular: popularModels.has(model.id),
            metadata: {
              provider: category,
              contextWindow: model.context_window,
              cost: costTier
            }
          })
        })

        const aiStatus = { providers, models }
        setAiStatus(aiStatus)
        setLoadError(null) // Clear error on success

        // Auto-select first popular or available model if none selected
        if (!formData.model && models[formData.provider] && models[formData.provider].length > 0) {
          const popularModel = models[formData.provider].find(m => m.isPopular)
          const firstModel = popularModel || models[formData.provider][0]
          if (firstModel) {
            setFormData(prev => ({ ...prev, model: firstModel.id }))
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setLoadError(`Failed to load AI models. ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProviderChange = (provider: string) => {
    const availableModels = aiStatus?.models[provider] || []
    const popularModel = availableModels.find(m => m.isPopular)
    const firstModel = popularModel || availableModels[0]

    setFormData(prev => ({
      ...prev,
      provider: provider as 'openai' | 'anthropic' | 'openrouter',
      model: firstModel?.id || '', // Auto-select first popular or available model
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
    <Dialog
      open={open}
      onClose={onClose}
      className="sm:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[75vw] sm:max-w-[1800px] max-h-[90vh] overflow-hidden"
    >
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
              {loadError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive mb-1">Failed to load AI models</p>
                      <p className="text-xs text-destructive/80">{loadError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={loadAIStatus}
                      className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
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
                        <SelectItem value="openrouter">
                          <div className="flex items-center gap-2">
                            <span>🌐</span>
                            <span>OpenRouter</span>
                            {!aiStatus?.providers.openrouter && (
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
                    {formData.provider === 'openrouter' ? (
                      <>
                        <Label htmlFor="model">Model *</Label>
                        <div className="flex gap-2 mt-1">
                          <div className="flex-1 px-3 py-2 border border-border rounded-md bg-muted/20">
                            {formData.model && availableModels.length > 0 ? (
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  {availableModels.find(m => m.id === formData.model)?.name || formData.model}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {(() => {
                                    const selectedModel = availableModels.find(m => m.id === formData.model)
                                    if (!selectedModel) return formData.model
                                    const parts = []
                                    if (selectedModel.metadata?.provider) parts.push(selectedModel.metadata.provider)
                                    if (selectedModel.metadata?.contextWindow) {
                                      parts.push(`${(selectedModel.metadata.contextWindow / 1000).toFixed(0)}K context`)
                                    }
                                    if (selectedModel.metadata?.cost) parts.push(`${selectedModel.metadata.cost} cost`)
                                    return parts.join(' • ')
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No model selected
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={() => setShowModelPicker(true)}
                            variant="outline"
                            disabled={isLoading}
                          >
                            {formData.model ? 'Change Model' : 'Select Model'}
                          </Button>
                        </div>
                        {!isProviderAvailable && (
                          <p className="text-xs text-destructive mt-1">
                            This provider is not configured. Please add API keys to use it.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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

                {/* Existing Files (when editing) */}
                {agent && agent.files && agent.files.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Current Agent Files</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Files currently associated with this agent. Upload new files below to add more.
                      </p>
                      <div className="space-y-2">
                        {agent.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-4 h-4 text-muted-foreground">📄</div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* File Upload Section */}
                <div className="space-y-4">
                  <div>
                    <Label>{agent ? 'Add More Files (Optional)' : 'Agent Files (Optional)'}</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Upload files that this agent can reference for context. These files will be available to the agent during conversations.
                    </p>
                    <FileUpload
                      onFilesSelected={(files) => setFormData(prev => ({ ...prev, files }))}
                      maxFiles={5}
                      maxFileSize={10}
                      acceptedTypes={['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.py', '.java', '.cpp', '.go', '.rs', '.php', '.rb', '.swift', '.yaml', '.yml', '.xml', '.sql', '.sh']}
                      multiple={true}
                    />
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

      {/* OpenRouter Model Picker Modal */}
      {formData.provider === 'openrouter' && (
        <ModelPickerModal
          open={showModelPicker}
          onClose={() => setShowModelPicker(false)}
          onSelect={(modelId) => {
            setFormData(prev => ({ ...prev, model: modelId }))
            setShowModelPicker(false)
          }}
          models={availableModels}
          selectedModelId={formData.model}
          isLoading={isLoading}
          error={loadError || undefined}
          onRetry={loadAIStatus}
        />
      )}
    </Dialog>
  )
}
