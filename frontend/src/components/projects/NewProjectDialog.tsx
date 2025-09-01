import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, agentsApi } from '@/lib/api'
import { Agent, ProjectFormData } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (projectId: string) => void
}

interface FormErrors {
  name?: string
  agent_type?: string
  agent_id?: string
  custom_agent_name?: string
  system_prompt?: string
  description?: string
}

function NewProjectDialog({ open, onClose, onSuccess }: NewProjectDialogProps) {
  const [agentType, setAgentType] = useState<'existing' | 'custom'>('existing')
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    agent_id: '',
    custom_agent_name: '',
    custom_agent_description: '',
    custom_agent_avatar: '',
    custom_agent_capabilities: [],
    system_prompt: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const queryClient = useQueryClient()

  // Load agents
  const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.getAgents(),
    enabled: open,
  })

  const agents = agentsData?.data?.agents || []

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectFormData) => projectsApi.createProject(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Invalidate projects queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        
        // Reset form
        resetForm()
        onClose()
        
        // Callback with project ID
        onSuccess?.(response.data.project.id)
      }
    },
    onError: (error: any) => {
      console.error('Failed to create project:', error)
      
      // Handle validation errors
      if (error?.response?.data?.details) {
        const validationErrors: FormErrors = {}
        error.response.data.details.forEach((detail: string) => {
          if (detail.includes('name')) {
            validationErrors.name = detail
          } else if (detail.includes('agent_id')) {
            validationErrors.agent_id = detail
          } else if (detail.includes('custom_agent_name')) {
            validationErrors.custom_agent_name = detail
          } else if (detail.includes('system_prompt')) {
            validationErrors.system_prompt = detail
          } else if (detail.includes('description')) {
            validationErrors.description = detail
          }
        })
        setErrors(validationErrors)
      } else {
        setErrors({ name: error?.response?.data?.error || 'Failed to create project' })
      }
    },
  })

  const resetForm = () => {
    setAgentType('existing')
    setFormData({
      name: '',
      description: '',
      agent_id: '',
      custom_agent_name: '',
      custom_agent_description: '',
      custom_agent_avatar: '',
      custom_agent_capabilities: [],
      system_prompt: '',
    })
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Client-side validation
    const newErrors: FormErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length > 200) {
      newErrors.name = 'Project name must be less than 200 characters'
    }

    if (agentType === 'existing') {
      if (!formData.agent_id) {
        newErrors.agent_id = 'Please select an agent'
      }
    } else {
      if (!formData.custom_agent_name?.trim()) {
        newErrors.custom_agent_name = 'Agent name is required'
      }
      if (!formData.system_prompt?.trim()) {
        newErrors.system_prompt = 'System prompt is required for custom agents'
      } else if (formData.system_prompt.length > 10000) {
        newErrors.system_prompt = 'System prompt must be less than 10000 characters'
      }
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Prepare submission data
    const submitData: ProjectFormData = {
      name: formData.name,
      description: formData.description,
    }

    if (agentType === 'existing') {
      submitData.agent_id = formData.agent_id
    } else {
      submitData.custom_agent_name = formData.custom_agent_name
      submitData.custom_agent_description = formData.custom_agent_description
      submitData.custom_agent_avatar = formData.custom_agent_avatar
      submitData.custom_agent_capabilities = formData.custom_agent_capabilities
      submitData.system_prompt = formData.system_prompt
    }

    createProjectMutation.mutate(submitData)
  }

  const handleClose = () => {
    if (!createProjectMutation.isPending) {
      resetForm()
      onClose()
    }
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  const selectedAgent = agents.find((agent: Agent) => agent.id === formData.agent_id)

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-2xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new project and choose an existing AI agent or create a custom one with your own system prompt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Agent Type Selection */}
          <div className="space-y-3">
            <Label>Agent Type *</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="agent_type"
                  value="existing"
                  checked={agentType === 'existing'}
                  onChange={(e) => setAgentType(e.target.value as 'existing' | 'custom')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Use Existing Agent</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="agent_type"
                  value="custom"
                  checked={agentType === 'custom'}
                  onChange={(e) => setAgentType(e.target.value as 'existing' | 'custom')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Create Custom Agent</span>
              </label>
            </div>
          </div>

          {/* Existing Agent Selection */}
          {agentType === 'existing' && (
            <div className="space-y-2">
              <Label htmlFor="agent">Choose AI Agent *</Label>
              {isLoadingAgents ? (
                <div className="flex items-center justify-center h-10 border border-input rounded-md">
                  <LoadingSpinner className="h-4 w-4" />
                </div>
              ) : (
                <Select
                  value={formData.agent_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, agent_id: value }))}
                >
                  <SelectTrigger className={errors.agent_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Choose an AI agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent: Agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={agent.avatar} alt={agent.name} />
                            <AvatarFallback className="text-xs">
                              {agent.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{agent.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {agent.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.agent_id && (
                <p className="text-sm text-destructive">{errors.agent_id}</p>
              )}
              
              {/* Selected Agent Preview */}
              {selectedAgent && (
                <div className="p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedAgent.avatar} alt={selectedAgent.name} />
                      <AvatarFallback>{selectedAgent.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{selectedAgent.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedAgent.description}
                      </p>
                      {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedAgent.capabilities.slice(0, 4).map((capability: string) => (
                            <span
                              key={capability}
                              className="inline-flex items-center px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                            >
                              {capability}
                            </span>
                          ))}
                          {selectedAgent.capabilities.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{selectedAgent.capabilities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Agent Fields */}
          {agentType === 'custom' && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
              <h4 className="font-medium text-sm">Custom Agent Details</h4>
              
              {/* Agent Name */}
              <div className="space-y-2">
                <Label htmlFor="custom_agent_name">Agent Name *</Label>
                <Input
                  id="custom_agent_name"
                  type="text"
                  placeholder="Enter agent name"
                  value={formData.custom_agent_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_agent_name: e.target.value }))}
                  className={errors.custom_agent_name ? 'border-destructive' : ''}
                />
                {errors.custom_agent_name && (
                  <p className="text-sm text-destructive">{errors.custom_agent_name}</p>
                )}
              </div>

              {/* Agent Description */}
              <div className="space-y-2">
                <Label htmlFor="custom_agent_description">Agent Description</Label>
                <Input
                  id="custom_agent_description"
                  type="text"
                  placeholder="Brief description of the agent"
                  value={formData.custom_agent_description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_agent_description: e.target.value }))}
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt *</Label>
                <Textarea
                  id="system_prompt"
                  placeholder="Define how the AI agent should behave and respond..."
                  value={formData.system_prompt || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  className={errors.system_prompt ? 'border-destructive' : ''}
                  rows={6}
                />
                {errors.system_prompt && (
                  <p className="text-sm text-destructive">{errors.system_prompt}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {(formData.system_prompt || '').length}/10000 characters. 
                  The system prompt defines how your AI agent will behave and what context it will use.
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your project (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={errors.description ? 'border-destructive' : ''}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/1000 characters
            </p>
          </div>



          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { NewProjectDialog }
