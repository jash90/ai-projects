import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, FileText, Code, X } from 'lucide-react'
import { Agent, TextFile as FileType, Project } from '@/types'
import { AgentPanel } from '@/components/agents/AgentPanel'
import { FileExplorer } from '@/components/files/FileExplorer'
import { FileEditor } from '@/components/files/FileEditor'
import { cn } from '@/lib/utils'

type TabValue = 'agents' | 'files' | 'editor'

interface SidePanelProps {
  project: Project
  selectedAgent: Agent | null
  selectedFile: FileType | null
  onAgentSelect: (agent: Agent) => void
  onFileSelect: (file: FileType) => void
  defaultTab?: TabValue
  showEditorTab?: boolean
  className?: string
  onClose?: () => void
}

export function SidePanel({
  project,
  selectedAgent,
  selectedFile,
  onAgentSelect,
  onFileSelect,
  defaultTab = 'files',
  showEditorTab = true,
  className,
  onClose
}: SidePanelProps) {
  const { t } = useTranslation('project')
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)

  const tabs: { value: TabValue; icon: React.ReactNode; label: string; disabled?: boolean }[] = [
    {
      value: 'agents',
      icon: <Bot className="w-4 h-4" />,
      label: t('sidePanel.tabs.agents')
    },
    {
      value: 'files',
      icon: <FileText className="w-4 h-4" />,
      label: t('sidePanel.tabs.files')
    },
    ...(showEditorTab ? [{
      value: 'editor' as TabValue,
      icon: <Code className="w-4 h-4" />,
      label: t('sidePanel.tabs.editor'),
      disabled: !selectedFile
    }] : [])
  ]

  // Auto-switch to editor when file is selected
  const handleFileSelect = (file: FileType) => {
    onFileSelect(file)
    if (showEditorTab) {
      setActiveTab('editor')
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => !tab.disabled && setActiveTab(tab.value)}
              disabled={tab.disabled}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                "border-b-2 -mb-px",
                activeTab === tab.value
                  ? "text-primary border-primary bg-background/50"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 mr-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'agents' && (
          <AgentPanel
            selectedAgentId={selectedAgent?.id}
            onAgentSelect={onAgentSelect}
            className="h-full border-0"
          />
        )}

        {activeTab === 'files' && (
          <FileExplorer
            projectId={project.id}
            selectedFileId={selectedFile?.id}
            onFileSelect={handleFileSelect}
            className="h-full border-0"
          />
        )}

        {activeTab === 'editor' && (
          <div className="h-full flex flex-col">
            {selectedFile ? (
              <>
                <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Code className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                    {selectedFile.name.split('.').pop() || 'txt'}
                  </span>
                </div>
                <FileEditor
                  file={selectedFile}
                  className="flex-1"
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{t('sidePanel.noFileSelected')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('sidePanel.selectFile')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
