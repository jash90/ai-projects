import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  PanelLeftOpen, 
  PanelLeftClose, 
  Menu, 
  X, 
  Bot, 
  FileText, 
  MessageSquare,
  Maximize2,
  Minimize2,
  Share,
  Download,
  WifiOff,
  Wifi,
  Upload,
} from 'lucide-react'
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
import { MobileNavigation, useIsMobile } from '@/components/ui/MobileNavigation'
import { usePWAFeatures, useOfflineFiles } from '@/hooks/usePWAFeatures'
import { cn } from '@/lib/utils'

type MobileView = 'chat' | 'agents' | 'files' | 'editor'

function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  
  const { currentProject, fetchProject, isLoading: isLoadingProject } = useProjects()
  const { agents, fetchAgents } = useAgents()
  const { } = useFiles()
  
  // PWA features
  const { 
    isOffline, 
    isInstalled, 
    canInstall, 
    install, 
    share, 
    vibrate 
  } = usePWAFeatures()
  
  const { 
    offlineFiles, 
    pendingUploads, 
    hasOfflineFiles, 
    hasPendingUploads 
  } = useOfflineFiles()
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(isMobile)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(isMobile)
  
  // Mobile-specific states
  const [mobileView, setMobileView] = useState<MobileView>('chat')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Update panel states when screen size changes
  useEffect(() => {
    if (isMobile) {
      setLeftPanelCollapsed(true)
      setRightPanelCollapsed(true)
    } else {
      setLeftPanelCollapsed(false)
      setRightPanelCollapsed(false)
    }
  }, [isMobile])

  // Close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [mobileView])

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
    if (isMobile) {
      setMobileView('chat')
    }
  }

  const handleFileSelect = (file: FileType) => {
    setSelectedFile(file)
    if (isMobile) {
      setMobileView('editor')
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const handleMobileViewChange = (view: MobileView) => {
    setMobileView(view)
    setMobileMenuOpen(false)
    
    // Haptic feedback on mobile
    if (isMobile) {
      vibrate(50)
    }
  }

  const handleShareProject = async () => {
    if (!currentProject) return
    
    const shareData = {
      title: `AI Projects - ${currentProject.name}`,
      text: currentProject.description || 'Check out this AI project!',
      url: window.location.href
    }
    
    const success = await share(shareData)
    if (success && isMobile) {
      vibrate([100, 50, 100])
    }
  }

  const handleInstallApp = async () => {
    const success = await install()
    if (success && isMobile) {
      vibrate([200, 100, 200])
    }
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

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card safe-area-top">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {currentProject.name}
              </h1>
              {currentProject.description && !mobileMenuOpen && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentProject.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* PWA Status Indicators */}
            {isOffline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                <WifiOff className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Offline
                </span>
              </div>
            )}
            
            {hasPendingUploads && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                <Upload className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {pendingUploads.length}
                </span>
              </div>
            )}

            {/* Install App Button */}
            {canInstall && !isInstalled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInstallApp}
                className="p-2"
                title="Install App"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {/* Share Project */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareProject}
              className="p-2"
              title="Share Project"
            >
              <Share className="w-4 h-4" />
            </Button>

            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="p-2"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
              title="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Mobile Menu */}
        <div className={cn(
          "absolute top-16 right-0 w-80 max-w-[90vw] bg-card border border-border rounded-bl-lg shadow-lg z-50 transform transition-transform duration-300",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mobileView === 'chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('chat')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
              
              <Button
                variant={mobileView === 'agents' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('agents')}
                className="flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Agents
              </Button>
              
              <Button
                variant={mobileView === 'files' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('files')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Files
              </Button>
              
              <Button
                variant={mobileView === 'editor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('editor')}
                className="flex items-center gap-2"
                disabled={!selectedFile}
              >
                <FileText className="w-4 h-4" />
                Editor
              </Button>
            </div>

            {/* PWA Status */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Status:</div>
              <div className="flex items-center gap-2 text-sm">
                {isOffline ? (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline Mode</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Wifi className="w-3 h-3" />
                    <span>Online</span>
                  </div>
                )}
              </div>
              
              {hasOfflineFiles && (
                <div className="text-sm text-muted-foreground">
                  {offlineFiles.size} files available offline
                </div>
              )}
              
              {hasPendingUploads && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Upload className="w-3 h-3" />
                  <span>{pendingUploads.length} files pending upload</span>
                </div>
              )}
            </div>

            {/* Current selections */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Current Selection:</div>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="w-3 h-3" />
                  <span className="truncate">
                    {selectedAgent?.name || 'No agent selected'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="w-3 h-3" />
                  <span className="truncate">
                    {selectedFile?.name || 'No file selected'}
                  </span>
                </div>
              </div>
            </div>

            {/* PWA Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Actions:</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareProject}
                  className="flex items-center gap-2 text-xs"
                >
                  <Share className="w-3 h-3" />
                  Share
                </Button>
                
                {canInstall && !isInstalled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstallApp}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Download className="w-3 h-3" />
                    Install
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileView === 'chat' && (
            <Chat
              project={currentProject}
              agent={selectedAgent}
              className="h-full"
            />
          )}
          
          {mobileView === 'agents' && (
            <div className="h-full bg-card">
              <AgentPanel
                selectedAgentId={selectedAgent?.id}
                onAgentSelect={handleAgentSelect}
                className="h-full"
              />
            </div>
          )}
          
          {mobileView === 'files' && (
            <div className="h-full bg-card">
              <FileExplorer
                projectId={currentProject.id}
                selectedFileId={selectedFile?.id}
                onFileSelect={handleFileSelect}
                className="h-full"
              />
            </div>
          )}
          
          {mobileView === 'editor' && (
            <div className="h-full">
              <FileEditor
                file={selectedFile}
                className="h-full"
              />
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="border-t border-border bg-card safe-area-bottom">
          <div className="grid grid-cols-4 gap-1 p-2">
            <Button
              variant={mobileView === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMobileView('chat')}
              className="flex flex-col items-center gap-1 py-3 h-auto"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Chat</span>
            </Button>
            
            <Button
              variant={mobileView === 'agents' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMobileView('agents')}
              className="flex flex-col items-center gap-1 py-3 h-auto"
            >
              <Bot className="w-4 h-4" />
              <span className="text-xs">Agents</span>
            </Button>
            
            <Button
              variant={mobileView === 'files' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMobileView('files')}
              className="flex flex-col items-center gap-1 py-3 h-auto"
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs">Files</span>
            </Button>
            
            <Button
              variant={mobileView === 'editor' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMobileView('editor')}
              className="flex flex-col items-center gap-1 py-3 h-auto"
              disabled={!selectedFile}
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs">Editor</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Desktop layout
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
            onClick={toggleFullscreen}
            className="hidden md:flex"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          
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
          
          <MobileNavigation />
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