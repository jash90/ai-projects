import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  PanelLeftOpen,
  PanelLeftClose,
  X,
  Bot,
  FileText,
  MessageSquare,
  Maximize2,
  Minimize2,
  WifiOff,
  Upload,
  Code,
  FolderOpen,
  ChevronRight,
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
    isOffline
  } = usePWAFeatures()

  const {
    pendingUploads,
    hasPendingUploads
  } = useOfflineFiles()

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(isMobile)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true)
  const [agentSectionCollapsed, setAgentSectionCollapsed] = useState(false)
  const [filesSectionCollapsed, setFilesSectionCollapsed] = useState(false)

  // Mobile-specific states
  const [mobileView, setMobileView] = useState<MobileView>('chat')
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
      // Don't force editor open — respect initial state (collapsed)
    }
  }, [isMobile])

  // Auto-collapse/expand left panel based on section states
  useEffect(() => {
    if (agentSectionCollapsed && filesSectionCollapsed && !isMobile) {
      setLeftPanelCollapsed(true)
    } else if (!agentSectionCollapsed || !filesSectionCollapsed) {
      if (!isMobile) setLeftPanelCollapsed(false)
    }
  }, [agentSectionCollapsed, filesSectionCollapsed, isMobile])


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
        <div className="flex items-center justify-between p-3 border-b border-border bg-background safe-area-top">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="shrink-0 h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <h1 className="text-base font-semibold text-foreground truncate min-w-0 flex-1">
              {currentProject.name}
            </h1>
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
        <div className="border-t border-border bg-background safe-area-bottom">
          <div className="grid grid-cols-4 gap-1 p-1.5">
            <button
              onClick={() => setMobileView('chat')}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-lg transition-colors',
                mobileView === 'chat'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.chat')}</span>
            </button>

            <button
              onClick={() => setMobileView('agents')}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-lg transition-colors',
                mobileView === 'agents'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bot className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.agents')}</span>
            </button>

            <button
              onClick={() => setMobileView('files')}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-lg transition-colors',
                mobileView === 'files'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('mobile.views.files')}</span>
            </button>

            <button
              onClick={() => setMobileView('editor')}
              disabled={!selectedFile}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-lg transition-colors',
                mobileView === 'editor'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground',
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
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-background">
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
          <h1 className="text-base font-semibold text-foreground truncate">{currentProject.name}</h1>
          {currentProject.description && (
            <p className="text-xs text-muted-foreground truncate">{currentProject.description}</p>
          )}
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
          'flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out',
          leftPanelCollapsed ? 'w-10' : 'w-72 xl:w-80'
        )}>
          {leftPanelCollapsed ? (
            <div className="flex flex-col h-full">
              <button
                onClick={() => { setLeftPanelCollapsed(false); setAgentSectionCollapsed(false) }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-4 hover:bg-muted/50 transition-colors border-b border-border"
              >
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-lr]">
                  {t('desktop.panels.aiAgents')}
                </span>
              </button>
              <button
                onClick={() => { setLeftPanelCollapsed(false); setFilesSectionCollapsed(false) }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-4 hover:bg-muted/50 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-lr]">
                  {t('desktop.panels.projectFiles')}
                </span>
              </button>
            </div>
          ) : (
            <>
              {/* Agent Panel */}
              <div className={cn(
                'border-b border-border overflow-hidden flex flex-col',
                agentSectionCollapsed ? '' : 'flex-1'
              )}>
                <button
                  onClick={() => setAgentSectionCollapsed(!agentSectionCollapsed)}
                  className="px-4 py-3 border-b border-border/50 flex items-center gap-2 w-full hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className={cn(
                    'w-3 h-3 text-muted-foreground transition-transform duration-200',
                    !agentSectionCollapsed && 'rotate-90'
                  )} />
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t('desktop.panels.aiAgents')}</span>
                </button>
                {!agentSectionCollapsed && (
                  <AgentPanel
                    selectedAgentId={selectedAgent?.id}
                    onAgentSelect={handleAgentSelect}
                    className="flex-1 overflow-y-auto"
                  />
                )}
              </div>

              {/* File Explorer */}
              <div className={cn(
                'overflow-hidden flex flex-col',
                filesSectionCollapsed ? '' : 'flex-1'
              )}>
                <button
                  onClick={() => setFilesSectionCollapsed(!filesSectionCollapsed)}
                  className="px-4 py-3 border-b border-border/50 flex items-center gap-2 w-full hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className={cn(
                    'w-3 h-3 text-muted-foreground transition-transform duration-200',
                    !filesSectionCollapsed && 'rotate-90'
                  )} />
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t('desktop.panels.projectFiles')}</span>
                </button>
                {!filesSectionCollapsed && (
                  <FileExplorer
                    projectId={currentProject.id}
                    selectedFileId={selectedFile?.id}
                    onFileSelect={handleFileSelect}
                    className="flex-1 overflow-y-auto"
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Center Panel - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <ThreadChat
            project={currentProject}
            agent={selectedAgent}
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
