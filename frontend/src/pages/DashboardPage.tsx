import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  FolderOpen,
  MessageSquare,
  Clock,
  BarChart3,
  Shield,
  ArrowRight,
  Sparkles,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects(),
  })

  const { data: recentProjectsData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['projects', 'recent'],
    queryFn: () => projectsApi.getRecentProjects(5),
  })

  const projects = projectsData?.data?.items || []
  const recentProjects = recentProjectsData?.data?.projects || []
  const totalMessages = projects.reduce((acc, project) => acc + (project.message_count || 0), 0)

  const handleNewProjectSuccess = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader
        title={`Welcome back, ${user?.username}`}
        subtitle="Manage your projects and collaborate with AI agents"
        variant="gradient"
        actions={
          <Button
            onClick={() => setShowNewProjectDialog(true)}
            variant="gradient"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Project
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard
            title="Total Projects"
            value={projectsData?.data?.total || 0}
            icon={<FolderOpen className="w-6 h-6" />}
            variant="primary"
            trend={projects.length > 0 ? { value: 12, isPositive: true } : undefined}
          />

          <StatCard
            title="Total Messages"
            value={totalMessages.toLocaleString()}
            icon={<MessageSquare className="w-6 h-6" />}
            variant="success"
          />

          <StatCard
            title="Active This Week"
            value={recentProjects.length}
            icon={<Clock className="w-6 h-6" />}
            variant="info"
          />

          <Card
            variant="interactive"
            className="cursor-pointer"
            onClick={() => navigate('/usage')}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Usage Stats</p>
                  <p className="text-lg font-semibold text-foreground">View token usage</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Track your AI usage
                  </p>
                </div>
                <div className="rounded-xl p-3 bg-accent">
                  <BarChart3 className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Link (if admin) */}
        {user?.role === 'admin' && (
          <Card
            variant="interactive"
            className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
            onClick={() => navigate('/admin')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Admin Panel</p>
                    <p className="text-sm text-muted-foreground">Manage users, token limits, and system settings</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Projects
                </CardTitle>
                {recentProjects.length > 0 && (
                  <Badge variant="secondary" size="sm">
                    {recentProjects.length} active
                  </Badge>
                )}
              </CardHeader>

              <CardContent>
                {isLoadingRecent ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : recentProjects.length > 0 ? (
                  <div className="space-y-3">
                    {recentProjects.map((project, index) => (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="block p-4 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-primary/20 transition-all duration-200 group animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {project.name}
                              </h3>
                              {index === 0 && (
                                <Badge variant="success" size="sm" dot>
                                  Most Recent
                                </Badge>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3">
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {project.message_count || 0} messages
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <FileText className="w-3.5 h-3.5" />
                                {project.file_count || 0} files
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(project.updated_at)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Sparkles className="w-12 h-12" />}
                    title="No recent projects"
                    description="Create your first project to get started with AI collaboration"
                    action={
                      <Button
                        onClick={() => setShowNewProjectDialog(true)}
                        variant="gradient"
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Create Project
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Projects Sidebar */}
          <div>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  All Projects
                </CardTitle>
              </CardHeader>

              <CardContent>
                {isLoadingProjects ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-2">
                    {projects.slice(0, 6).map((project, index) => (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <FolderOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate text-sm group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(project.updated_at)}
                          </p>
                        </div>
                      </Link>
                    ))}

                    {projects.length > 6 && (
                      <Link
                        to="/projects"
                        className="flex items-center justify-center gap-2 p-3 text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                      >
                        View all {projects.length} projects
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={<FolderOpen className="w-8 h-8" />}
                    title="No projects yet"
                    description="Start by creating a new project"
                    compact
                  />
                )}
              </CardContent>
            </Card>

            {/* Quick Tips Card */}
            <Card variant="bordered" className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Quick Tip</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add files to your project to give AI agents context for better assistance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
        onSuccess={handleNewProjectSuccess}
      />
    </div>
  )
}

// Empty State Component
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  compact?: boolean
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
}) => (
  <div className={`text-center ${compact ? 'py-6' : 'py-12'}`}>
    <div className={`mx-auto mb-4 text-muted-foreground/40 ${compact ? '' : 'animate-pulse-soft'}`}>
      {icon}
    </div>
    <p className={`font-medium text-muted-foreground ${compact ? 'text-sm' : ''}`}>{title}</p>
    <p className={`text-muted-foreground mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export default DashboardPage
