import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, FolderOpen, MessageSquare, Clock, BarChart3 } from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'

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

  const handleNewProjectSuccess = (projectId: string) => {
    // Navigate to the new project
    navigate(`/projects/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-card-foreground">
                Welcome back, {user?.username}
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your projects and collaborate with AI agents
              </p>
            </div>
            
            <button
              onClick={() => setShowNewProjectDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {projectsData?.data?.total || 0}
                </p>
                <p className="text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {projects.reduce((acc, project) => acc + (project.message_count || 0), 0)}
                </p>
                <p className="text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {recentProjects.length}
                </p>
                <p className="text-muted-foreground">Active This Week</p>
              </div>
            </div>
          </div>

          <Link to="/usage" className="bg-card rounded-lg border border-border p-6 hover:bg-accent transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-card-foreground">
                  Usage Stats
                </p>
                <p className="text-muted-foreground">View token usage</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-border">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-card-foreground">
                  Recent Projects
                </h2>
              </div>
              
              <div className="p-6">
                {isLoadingRecent ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : recentProjects.length > 0 ? (
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-card-foreground">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{project.message_count || 0} messages</span>
                              <span>{project.file_count || 0} files</span>
                              <span>{formatRelativeTime(project.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent projects</p>
                    <p className="text-sm">Create your first project to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All Projects */}
          <div>
            <div className="bg-card rounded-lg border border-border">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-card-foreground">
                  All Projects
                </h2>
              </div>
              
              <div className="p-6">
                {isLoadingProjects ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="block p-3 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                            <FolderOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-card-foreground truncate">
                              {project.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(project.updated_at)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    
                    {projects.length > 5 && (
                      <Link
                        to="/projects"
                        className="block p-3 text-center text-primary hover:text-primary/90 text-sm font-medium"
                      >
                        View all {projects.length} projects →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No projects yet</p>
                  </div>
                )}
              </div>
            </div>
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

export default DashboardPage