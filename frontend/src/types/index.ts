// User Types
export interface User {
  id: string;
  email: string;
  username: string;
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
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  system_prompt: string;
  provider: 'openai' | 'anthropic';
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  system_prompt?: string;
  provider?: 'openai' | 'anthropic';
  model?: string;
  temperature?: number;
  max_tokens?: number;
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
}

// File Types (for project files)
export interface File {
  id: string;
  project_id: string;
  name: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
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
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  max_tokens: number;
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