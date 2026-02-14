import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import { ProjectCreate } from '@/types'
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
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (projectId: string) => void
}

interface FormErrors {
  name?: string
  description?: string
}

function NewProjectDialog({ open, onClose, onSuccess }: NewProjectDialogProps) {
  const [formData, setFormData] = useState<ProjectCreate>({
    name: '',
    description: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const queryClient = useQueryClient()

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectCreate) => projectsApi.createProject(data),
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
    setFormData({
      name: '',
      description: '',
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

    if ((formData.description?.length || 0) > 1000) {
      newErrors.description = 'Description must be less than 1000 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit the simple project data
    createProjectMutation.mutate(formData)
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

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project. You can chat with different AI agents within the project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              {formData.description?.length || 0}/1000 characters
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
