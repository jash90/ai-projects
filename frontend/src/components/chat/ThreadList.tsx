import type { MouseEvent } from 'react'
import { useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Thread } from '../../types'
import { cn } from '../../lib/utils'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { threadStore, useThreads, useActiveThread, useThreadsLoading } from '../../stores/threadStore'

interface ThreadListProps {
  projectId: string
  onThreadSelect?: (thread: Thread) => void
  className?: string
}

export function ThreadList({ projectId, onThreadSelect, className }: ThreadListProps) {
  const { t } = useTranslation('chat')
  const threads = useThreads(projectId)
  const activeThread = useActiveThread(projectId)
  const isLoading = useThreadsLoading(projectId)

  useEffect(() => {
    if (projectId) {
      threadStore.getState().fetchThreads(projectId).catch((error) => {
        console.error('Failed to fetch threads:', error)
        toast.error(t('errors.loadFailed'))
      })
    }
  }, [projectId, t])

  const handleCreateThread = async () => {
    try {
      const thread = await threadStore.getState().createThread(projectId)
      onThreadSelect?.(thread)
    } catch (error) {
      console.error('Failed to create thread:', error)
      toast.error(t('errors.createFailed'))
    }
  }

  const handleSelectThread = (thread: Thread) => {
    threadStore.getState().setActiveThread(projectId, thread.id)
    onThreadSelect?.(thread)
  }

  const handleDeleteThread = async (e: MouseEvent, threadId: string) => {
    e.stopPropagation()
    if (confirm(t('threads.deleteConfirm'))) {
      try {
        await threadStore.getState().deleteThread(threadId, projectId)
      } catch (error) {
        console.error('Failed to delete thread:', error)
        toast.error(t('errors.deleteFailed'))
      }
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return ''
    }
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">{t('threads.title')}</h3>
        <button
          onClick={handleCreateThread}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title={t('threads.newConversation')}
        >
          <PlusIcon size={16} />
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="text-muted-foreground text-sm mb-2">{t('threads.noConversations')}</div>
            <button
              onClick={handleCreateThread}
              className="text-primary text-sm hover:underline"
            >
              {t('threads.startNew')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map(thread => (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={cn(
                  'group relative p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  activeThread?.id === thread.id && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {thread.title || t('threads.newThread')}
                    </div>
                    {thread.last_message && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {truncateText(thread.last_message, 60)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {thread.last_agent_name && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {thread.last_agent_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(thread.updated_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteThread(e, thread.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                    title={t('threads.deleteConversation')}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
                {typeof thread.message_count === 'number' && thread.message_count > 0 && (
                  <div className="absolute right-3 bottom-3">
                    <span className="text-xs text-muted-foreground">
                      {t('threads.messageCount', { count: thread.message_count })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
