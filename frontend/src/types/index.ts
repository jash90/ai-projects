// Chat file attachment constants (inlined to avoid ESM/CJS compatibility issues)
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

// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  token_limit_global?: number;
  token_limit_monthly?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserProfileUpdate {
  username?: string;
  email?: string;
}

export interface UserPasswordUpdate {
  current_password: string;
  new_password: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
  email_notifications?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  temperature: number;
  max_tokens: number;
  files?: AgentFile[];
  created_at: string;
  updated_at: string;
}

export interface AgentFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
  created_at: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  system_prompt: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  temperature?: number;
  max_tokens?: number;
  files?: File[]; // Browser File objects for upload
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  system_prompt?: string;
  provider?: 'openai' | 'anthropic' | 'openrouter';
  model?: string;
  temperature?: number;
  max_tokens?: number;
  files?: File[]; // Browser File objects for upload
}

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
  id: string; // Unique identifier for reliable state updates
  file: File; // Browser File object
  preview?: string; // Data URL for image preview
}

export interface ChatFileAttachmentInfo {
  filename: string;
  mimetype: string;
  size: number;
}

// File Types (for project text files)
// Named TextFile to avoid collision with browser's native File type
export interface TextFile {
  id: string;
  project_id: string;
  name: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
  // Additional properties for uploaded files
  isUploaded?: boolean;
  size?: number;
  mimetype?: string;
}

export interface FileCreate {
  name: string;
  content: string;
  type: string;
}

export interface FileUpdate {
  name?: string;
  content?: string;
  type?: string;
}

// File Types
export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// UI State Types
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  activeProject: string | null;
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

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
}

export interface AgentFormData {
  name: string;
  description?: string;
  system_prompt: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  temperature: number;
  max_tokens: number;
  files?: File[];
}

// Error Types
export interface AppError {
  message: string;
  statusCode?: number;
  details?: string[];
}

// Search Types
export interface SearchResult<T> {
  items: T[];
  query: string;
  results_count: number;
}

// File Upload Types
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: number;
}

// Context Menu Types
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  shortcut?: string;
  dangerous?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

// Activity Types
export interface Activity {
  id: string;
  type: 'message' | 'file_upload' | 'project_create' | 'project_update';
  title: string;
  description: string;
  timestamp: string;
  project?: Project;
  metadata?: Record<string, any>;
}

// Settings Types
export interface UserSettings {
  theme: Theme;
  notifications: {
    email: boolean;
    desktop: boolean;
    sounds: boolean;
  };
  chat: {
    sendOnEnter: boolean;
    showTimestamps: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
  };
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
  // Frontend-only properties
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

// Admin Types
export interface AdminStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_messages: number;
  total_tokens_used: number;
  total_cost: number;
  monthly_tokens: number;
  monthly_cost: number;
  top_users: UserUsageStats[];
}

export interface UserUsageStats {
  user_id: string;
  email: string;
  username: string;
  token_limit_global?: number;
  token_limit_monthly?: number;
  total_tokens: number;
  monthly_tokens: number;
  total_cost: number;
  monthly_cost: number;
  project_count: number;
  last_active: string;
}

export interface UserManagement {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  token_limit_global?: number;
  token_limit_monthly?: number;
  is_active: boolean;
  total_tokens_used: number;
  monthly_tokens_used: number;
  project_count: number;
  last_active?: string;
  created_at: string;
}

export interface TokenLimitUpdate {
  user_id?: string;
  global_limit?: number;
  monthly_limit?: number;
}

export interface AdminActivity {
  id: string;
  admin_user_id: string;
  admin_email: string;
  admin_username: string;
  action_type: string;
  target_user_id?: string;
  target_email?: string;
  target_username?: string;
  details: any;
  created_at: string;
}