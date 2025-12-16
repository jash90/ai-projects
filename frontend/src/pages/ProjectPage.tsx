import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  Code,
  Sparkles,
  FolderOpen,
} from 'lucide-react'
import { Agent, TextFile as FileType } from '@/types'
import { useProjects } from '@/stores/projectStore'
import { useAgents } from '@/stores/agentStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AgentPanel } from '@/components/agents/AgentPanel'
import { FileExplorer } from '@/components/files/FileExplorer'
import { FileEditor } from '@/components/files/FileEditor'
import { ThreadChat } from '@/components/chat/ThreadChat'
import { MobileNavigation, useIsMobile } from '@/components/ui/MobileNavigation'
import { usePWAFeatures, useOfflineFiles } from '@/hooks/usePWAFeatures'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

type MobileView = 'chat' | 'agents' | 'files' | 'editor'

function ProjectPage() {
  const { t } = useTranslation('project')
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

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

  // Mobile layout
  if (isMobile) {
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
            {/* PWA Status Indicators */}
            {isOffline && (
              <Badge variant="warning" size="sm" className="gap-1">
                <WifiOff className="w-3 h-3" />
                <span className="hidden xs:inline">{t('mobile.menu.offlineMode')}</span>
              </Badge>
            )}

            {hasPendingUploads && (
              <Badge variant="info" size="sm" className="gap-1">
                <Upload className="w-3 h-3" />
                {pendingUploads.length}
              </Badge>
            )}

            {/* Install App Button */}
            {canInstall && !isInstalled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInstallApp}
                className="h-8 w-8 p-0"
                title={t('mobile.actions.installApp')}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {/* Share Project */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareProject}
              className="h-8 w-8 p-0"
              title="Share Project"
            >
              <Share className="w-4 h-4" />
            </Button>

            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
              title={isFullscreen ? t('desktop.actions.exitFullscreen') : t('desktop.actions.enterFullscreen')}
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
              className="h-8 w-8 p-0"
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
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Mobile Menu */}
        <div className={cn(
          "absolute top-14 right-2 w-72 max-w-[90vw] bg-card border border-border rounded-xl shadow-design-lg z-50 transform transition-all duration-300 origin-top-right",
          mobileMenuOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}>
          <div className="p-4 space-y-4">
            {/* View Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mobileView === 'chat' ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('chat')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {t('mobile.views.chat')}
              </Button>

              <Button
                variant={mobileView === 'agents' ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('agents')}
                className="flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                {t('mobile.views.agents')}
              </Button>

              <Button
                variant={mobileView === 'files' ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('files')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {t('mobile.views.files')}
              </Button>

              <Button
                variant={mobileView === 'editor' ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => handleMobileViewChange('editor')}
                className="flex items-center gap-2"
                disabled={!selectedFile}
              >
                <Code className="w-4 h-4" />
                {t('mobile.views.editor')}
              </Button>
            </div>

            {/* Connection Status */}
            <div className="p-3 rounded-xl bg-muted/30 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('mobile.menu.status')}</div>
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

              {hasOfflineFiles && (
                <p className="text-xs text-muted-foreground">
                  {t('mobile.menu.filesAvailableOffline', { count: offlineFiles.size })}
                </p>
              )}

              {hasPendingUploads && (
                <div className="flex items-center gap-2 text-xs text-info">
                  <Upload className="w-3 h-3" />
                  <span>{t('mobile.menu.filesPendingUpload', { count: pendingUploads.length })}</span>
                </div>
              )}
            </div>

            {/* Current Selections */}
            <div className="p-3 rounded-xl bg-muted/30 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('mobile.menu.currentSelection')}</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground truncate">
                    {selectedAgent?.name || t('mobile.menu.noAgentSelected')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-accent-foreground" />
                  </div>
                  <span className="text-foreground truncate">
                    {selectedFile?.name || t('mobile.menu.noFileSelected')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareProject}
                className="flex-1"
                leftIcon={<Share className="w-3 h-3" />}
              >
                {t('mobile.actions.share')}
              </Button>

              {canInstall && !isInstalled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallApp}
                  className="flex-1"
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  {t('mobile.actions.install')}
                </Button>
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

        {/* Mobile Bottom Navigation */}
        <div className="border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
          <div className="grid grid-cols-4 gap-1 p-2">
            <button
              onClick={() => setMobileView('chat')}
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
              onClick={() => setMobileView('agents')}
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
              onClick={() => setMobileView('files')}
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

            <button
              onClick={() => setMobileView('editor')}
              disabled={!selectedFile}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200',
                mobileView === 'editor'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                !selectedFile && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Code className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.editor')}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
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
          {/* Selected Agent Indicator */}
          {selectedAgent && (
            <Badge variant="secondary" size="sm" className="hidden sm:flex gap-1.5">
              <Bot className="w-3 h-3" />
              {selectedAgent.name}
            </Badge>
          )}

          <div className="h-6 w-px bg-border mx-1.5 hidden md:block" />

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="hidden md:flex h-8 w-8 p-0"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
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
            className="hidden md:flex h-8 w-8 p-0"
            title={leftPanelCollapsed ? t('desktop.actions.showSidebar') : t('desktop.actions.hideSidebar')}
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
            className="hidden lg:flex h-8 w-8 p-0"
            title={rightPanelCollapsed ? t('desktop.actions.showEditor') : t('desktop.actions.hideEditor')}
          >
            {rightPanelCollapsed ? (
              <Code className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>

          <MobileNavigation />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Agents & Files */}
        <div className={cn(
          'flex flex-col border-r border-border bg-card/50 transition-all duration-300 ease-in-out',
          leftPanelCollapsed ? 'w-0 overflow-hidden' : 'w-72 xl:w-80'
        )}>
          {/* Agent Panel */}
          <div className="h-1/2 border-b border-border overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t('desktop.panels.aiAgents')}</span>
                </div>
              </div>
              <AgentPanel
                selectedAgentId={selectedAgent?.id}
                onAgentSelect={handleAgentSelect}
                className="flex-1 overflow-y-auto"
              />
            </div>
          </div>

          {/* File Explorer */}
          <div className="h-1/2 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t('desktop.panels.projectFiles')}</span>
                </div>
              </div>
              <FileExplorer
                projectId={currentProject.id}
                selectedFileId={selectedFile?.id}
                onFileSelect={handleFileSelect}
                className="flex-1 overflow-y-auto"
              />
            </div>
          </div>
        </div>

        {/* Center Panel - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <ThreadChat
            project={currentProject}
            agent={selectedAgent}
            onToggleSidebar={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="h-full"
          />
        </div>

        {/* Right Panel - File Editor */}
        <div className={cn(
          'border-l border-border bg-background transition-all duration-300 ease-in-out overflow-hidden',
          rightPanelCollapsed ? 'w-0' : 'w-[45%] lg:w-2/5'
        )}>
          {!rightPanelCollapsed && (
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
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectPage
