import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
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
  Code,
  Sparkles,
  FolderOpen,
  LayoutPanelLeft,
  PanelRight,
} from 'lucide-react'
import { Agent, TextFile as FileType } from '@/types'
import { useProjects } from '@/stores/projectStore'
import { useAgents } from '@/stores/agentStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AgentPanel } from '@/components/agents/AgentPanel'
import { AgentDropdown } from '@/components/agents/AgentDropdown'
import { FileExplorer } from '@/components/files/FileExplorer'
import { FileEditor } from '@/components/files/FileEditor'
import { ThreadChat } from '@/components/chat/ThreadChat'
import { SidePanel } from '@/components/ui/SidePanel'
import { usePWAFeatures, useOfflineFiles } from '@/hooks/usePWAFeatures'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

type MobileView = 'chat' | 'agents' | 'files' | 'editor'

// Custom hook for responsive breakpoints
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth
      if (width < 640) {
        setBreakpoint('mobile')
      } else if (width < 1024) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('desktop')
      }
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return breakpoint
}

function ProjectPage() {
  const { t } = useTranslation('project')
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const breakpoint = useBreakpoint()

  const { currentProject, fetchProject, isLoading: isLoadingProject } = useProjects()
  const { agents, fetchAgents } = useAgents()

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
    pendingUploads,
    hasPendingUploads
  } = useOfflineFiles()

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null)

  // Panel states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [showSidePanel, setShowSidePanel] = useState(true)

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

  // Close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [mobileView])

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
    if (breakpoint === 'mobile') {
      setMobileView('chat')
    }
  }

  const handleFileSelect = (file: FileType) => {
    setSelectedFile(file)
    if (breakpoint === 'mobile') {
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
    if (breakpoint === 'mobile') {
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
    if (success && breakpoint === 'mobile') {
      vibrate([100, 50, 100])
    }
  }

  const handleInstallApp = async () => {
    const success = await install()
    if (success && breakpoint === 'mobile') {
      vibrate([200, 100, 200])
    }
  }

  // Loading state
  if (isLoadingProject) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <LoadingSpinner className="w-8 h-8" />
          </div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  // Project not found
  if (!currentProject) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <Card variant="bordered" className="max-w-md w-full animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('notFound.title')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('notFound.description')}
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="gradient" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              {t('backToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No agents
  if (!selectedAgent) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <Card variant="bordered" className="max-w-md w-full animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('noAgents.title')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('noAgents.description')}
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="gradient" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              {t('backToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // MOBILE LAYOUT (< 640px)
  // ============================================
  if (breakpoint === 'mobile') {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur-sm safe-area-top">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="shrink-0 h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-foreground truncate">
                {currentProject.name}
              </h1>
              {currentProject.description && !mobileMenuOpen && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentProject.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isOffline && (
              <Badge variant="warning" size="sm" className="gap-1">
                <WifiOff className="w-3 h-3" />
              </Badge>
            )}

            {hasPendingUploads && (
              <Badge variant="info" size="sm" className="gap-1">
                <Upload className="w-3 h-3" />
                {pendingUploads.length}
              </Badge>
            )}

            {canInstall && !isInstalled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInstallApp}
                className="h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareProject}
              className="h-8 w-8 p-0"
            >
              <Share className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-8 w-8 p-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Mobile Menu */}
        <div className={cn(
          "absolute top-14 right-2 w-72 max-w-[90vw] bg-card border border-border rounded-xl shadow-design-lg z-50 transform transition-all duration-300 origin-top-right",
          mobileMenuOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}>
          <div className="p-4 space-y-4">
            {/* Current Agent */}
            <div className="p-3 rounded-xl bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('mobile.menu.currentSelection')}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground truncate">
                  {selectedAgent?.name || t('mobile.menu.noAgentSelected')}
                </span>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isOffline ? (
                <Badge variant="warning" size="sm" dot>
                  <WifiOff className="w-3 h-3 mr-1" />
                  {t('mobile.menu.offlineMode')}
                </Badge>
              ) : (
                <Badge variant="success" size="sm" dot>
                  <Wifi className="w-3 h-3 mr-1" />
                  {t('mobile.menu.online')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden animate-fade-in">
          {mobileView === 'chat' && (
            <ThreadChat
              project={currentProject}
              agent={selectedAgent}
              className="h-full"
            />
          )}

          {mobileView === 'agents' && (
            <div className="h-full bg-card/50">
              <AgentPanel
                selectedAgentId={selectedAgent?.id}
                onAgentSelect={handleAgentSelect}
                className="h-full"
              />
            </div>
          )}

          {mobileView === 'files' && (
            <div className="h-full bg-card/50">
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

        {/* Mobile Bottom Navigation - Hide Editor tab when no file */}
        <div className="border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
          <div className={cn(
            "grid gap-1 p-2",
            selectedFile ? "grid-cols-4" : "grid-cols-3"
          )}>
            <button
              onClick={() => handleMobileViewChange('chat')}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200',
                mobileView === 'chat'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.chat')}</span>
            </button>

            <button
              onClick={() => handleMobileViewChange('agents')}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200',
                mobileView === 'agents'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Bot className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.agents')}</span>
            </button>

            <button
              onClick={() => handleMobileViewChange('files')}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200',
                mobileView === 'files'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.files')}</span>
            </button>

            {selectedFile && (
              <button
                onClick={() => handleMobileViewChange('editor')}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200',
                  mobileView === 'editor'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Code className="w-5 h-5" />
                <span className="text-[10px] font-medium">{t('mobile.views.editor')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // TABLET LAYOUT (640px - 1024px)
  // ============================================
  if (breakpoint === 'tablet') {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Tablet Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {t('dashboard')}
          </Button>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-foreground truncate">{currentProject.name}</h1>
            </div>
          </div>

          {/* Compact Agent Selector */}
          <AgentDropdown
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentSelect={handleAgentSelect}
            compact
          />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidePanel(!showSidePanel)}
              className="h-8 w-8 p-0"
              title={showSidePanel ? "Hide panel" : "Show panel"}
            >
              {showSidePanel ? <PanelRight className="w-4 h-4" /> : <LayoutPanelLeft className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Tablet Content - 2 Panel Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area - 60% */}
          <div className={cn(
            "flex flex-col min-w-0 transition-all duration-300",
            showSidePanel ? "flex-1" : "w-full"
          )}>
            <ThreadChat
              project={currentProject}
              agent={selectedAgent}
              className="h-full"
            />
          </div>

          {/* Side Panel - 40% */}
          {showSidePanel && (
            <div className="w-[40%] min-w-[280px] max-w-[400px] border-l border-border">
              <SidePanel
                project={currentProject}
                selectedAgent={selectedAgent}
                selectedFile={selectedFile}
                onAgentSelect={handleAgentSelect}
                onFileSelect={handleFileSelect}
                showEditorTab={true}
                onClose={() => setShowSidePanel(false)}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // DESKTOP LAYOUT (>= 1024px)
  // ============================================
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Desktop Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {t('dashboard')}
        </Button>

        <div className="h-6 w-px bg-border" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">{currentProject.name}</h1>
              {currentProject.description && (
                <p className="text-xs text-muted-foreground truncate">{currentProject.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Agent Dropdown for quick switching */}
          <AgentDropdown
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentSelect={handleAgentSelect}
          />

          <div className="h-6 w-px bg-border mx-1.5" />

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="h-8 w-8 p-0"
            title={leftPanelCollapsed ? t('desktop.actions.showSidebar') : t('desktop.actions.hideSidebar')}
          >
            {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="h-8 w-8 p-0"
            title={rightPanelCollapsed ? t('desktop.actions.showEditor') : t('desktop.actions.hideEditor')}
          >
            {rightPanelCollapsed ? <Code className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Desktop Content - Resizable 3 Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Agents & Files */}
          {!leftPanelCollapsed && (
            <>
              <Panel
                defaultSize={20}
                minSize={15}
                maxSize={30}
                className="bg-card/50"
              >
                <div className="h-full flex flex-col">
                  {/* Tabs for Agents/Files */}
                  <SidePanel
                    project={currentProject}
                    selectedAgent={selectedAgent}
                    selectedFile={selectedFile}
                    onAgentSelect={handleAgentSelect}
                    onFileSelect={(file) => {
                      handleFileSelect(file)
                      if (rightPanelCollapsed) {
                        setRightPanelCollapsed(false)
                      }
                    }}
                    defaultTab="files"
                    showEditorTab={false}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />
            </>
          )}

          {/* Center Panel - Chat */}
          <Panel defaultSize={leftPanelCollapsed && rightPanelCollapsed ? 100 : 50} minSize={30}>
            <ThreadChat
              project={currentProject}
              agent={selectedAgent}
              onToggleSidebar={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="h-full"
            />
          </Panel>

          {/* Right Panel - File Editor */}
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

              <Panel
                defaultSize={30}
                minSize={20}
                maxSize={50}
                className="bg-background"
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Code className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {selectedFile?.name || t('editor.noFileSelected')}
                      </span>
                    </div>
                    {selectedFile && (
                      <Badge variant="secondary" size="sm">
                        {selectedFile.name.split('.').pop() || 'txt'}
                      </Badge>
                    )}
                  </div>
                  <FileEditor
                    file={selectedFile}
                    className="flex-1 overflow-hidden"
                  />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}

export default ProjectPage
