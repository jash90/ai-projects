// Chat file attachment constants
export const SUPPORTED_CHAT_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export type SupportedChatFileType = typeof SUPPORTED_CHAT_FILE_TYPES[number];

export const MAX_CHAT_FILE_SIZE = 20 * 1024 * 1024; // 20MB max per file
export const MAX_CHAT_FILES_COUNT = 5; // Max 5 files per message

// Conversation Types
export interface Conversation {
  id: string;
  project_id: string;
  agent_id: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at?: string;
  error?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  files?: string[];
  tokens?: number;
  model?: string;
  processing_time?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  estimated_cost?: number;
  attachments?: ChatFileAttachmentInfo[];
}

// Chat file attachment types (for multimodal LLM support)
export interface ChatFileAttachment {
  id: string;
  file: File;
  preview?: string;
}

export interface ChatFileAttachmentInfo {
  filename: string;
  mimetype: string;
  size: number;
}

// Chat Types
export interface ChatMessage extends ConversationMessage {
  id?: string;
  isLoading?: boolean;
  error?: string;
}

export interface TypingStatus {
  userId: string;
  projectId: string;
  isTyping: boolean;
}

// Socket Types
export interface SocketMessage {
  type: 'chat' | 'typing' | 'error' | 'system';
  data: any;
  projectId?: string;
  userId?: string;
}

// Thread Types
export interface Thread {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
  last_agent_id?: string;
  last_agent_name?: string;
  total_tokens?: number;
  total_cost?: number;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  agent_id: string | null;
  agent_name?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  isLoading?: boolean;
  error?: string;
}

export interface ThreadCreate {
  project_id: string;
  title?: string;
}

export interface ThreadUpdate {
  title?: string;
}
