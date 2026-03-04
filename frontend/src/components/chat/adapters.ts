import type { ThreadMessage, ConversationMessage } from '@/types'
import type { Message } from '@/components/ui/chat-message'

/**
 * Convert a ThreadMessage (from threadStore) to the kit Message shape.
 */
export function threadMessageToKitMessage(msg: ThreadMessage): Message {
  return {
    id: msg.id,
    role: msg.role === 'system' ? 'assistant' : msg.role,
    content: msg.content,
    createdAt: new Date(msg.created_at),
  }
}

/**
 * Convert a ConversationMessage (from conversationStore) to the kit Message shape.
 */
export function conversationMessageToKitMessage(
  msg: ConversationMessage,
  fallbackId: string
): Message {
  return {
    id: msg.id || fallbackId,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(msg.created_at || msg.timestamp),
  }
}
