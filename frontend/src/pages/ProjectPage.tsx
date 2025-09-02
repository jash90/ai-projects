import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { Agent, File as FileType } from '@/types'
import { useProjects } from '@/stores/projectStore'
import { useAgents } from '@/stores/agentStore'
import { useFiles } from '@/stores/fileStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AgentPanel } from '@/components/agents/AgentPanel'
import { FileExplorer } from '@/components/files/FileExplorer'
import { FileEditor } from '@/components/files/FileEditor'
import { Chat } from '@/components/chat/Chat'
import { UserMenu } from '@/components/ui/UserMenu'
import { cn } from '@/lib/utils'

function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const { currentProject, fetchProject, isLoading: isLoadingProject } = useProjects()
  const { agents, fetchAgents } = useAgents()
  const { getFileById } = useFiles()
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  // Load project and agents on mount
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
      fetchAgents()
    }
  }, [projectId, fetchProject, fetchAgents])

  // Auto-select first agent if none selected
  useEffect(() => {
    if (!selectedAgent && agents.length > 0) {
      setSelectedAgent(agents[0])
    }
  }, [selectedAgent, agents])

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const handleFileSelect = (file: FileType) => {
    setSelectedFile(file)
  }



  if (isLoadingProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mb-2" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!selectedAgent) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No AI agents available</h2>
          <p className="text-muted-foreground mb-4">
            You need at least one AI agent to use this project.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Button>
        
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">{currentProject.name}</h1>
          {currentProject.description && (
            <p className="text-sm text-muted-foreground">{currentProject.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="hidden md:flex"
          >
            {leftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="hidden lg:flex"
          >
            {rightPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
          
          <UserMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Agents & Files */}
        <div className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          leftPanelCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        )}>
          {/* Agent Panel */}
          <div className="h-1/2 border-b border-border">
            <AgentPanel
              selectedAgentId={selectedAgent?.id}
              onAgentSelect={handleAgentSelect}
              className="h-full"
            />
          </div>
          
          {/* File Explorer */}
          <div className="h-1/2">
            <FileExplorer
              projectId={currentProject.id}
              selectedFileId={selectedFile?.id}
              onFileSelect={handleFileSelect}
              className="h-full"
            />
          </div>
        </div>

        {/* Center Panel - Chat */}
        <div className="flex-1 flex flex-col">
          <Chat
            project={currentProject}
            agent={selectedAgent}
            onToggleSidebar={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="h-full"
          />
        </div>

        {/* Right Panel - File Editor */}
        <div className={cn(
          'border-l border-border bg-background transition-all duration-300',
          rightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-1/2 lg:w-2/5'
        )}>
          <FileEditor
            file={selectedFile}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )
}

export default ProjectPage