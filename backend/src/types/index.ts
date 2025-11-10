// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  token_limit_global?: number;
  token_limit_monthly?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
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

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  file_count?: number;
  message_count?: number;
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
/**
 * AI Agent configuration
 *
 * @remarks
 * The `system_prompt` field is the primary field used for the agent's system prompt.
 * The `prompt` field is maintained as an alias for backward compatibility with older code.
 * New code should use `system_prompt`.
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  /** Primary system prompt field - use this in new code */
  system_prompt: string;
  /** @deprecated Legacy alias for system_prompt - maintained for backward compatibility */
  prompt?: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  temperature: number;
  max_tokens: number;
  created_at: Date;
  updated_at: Date;
}

export interface AgentCreate {
  name: string;
  description?: string;
  system_prompt: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  system_prompt?: string;
  provider?: 'openai' | 'anthropic' | 'openrouter';
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
  created_at: Date;
  updated_at: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  files?: string[];
  tokens?: number;
  model?: string;
  processing_time?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

// File Types (for project files)
export interface File {
  id: string;
  project_id: string;
  name: string;
  content: string;
  type: string;
  created_at: Date;
  updated_at: Date;
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
  path: string;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface FileUpload {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// WebSocket Types
export interface SocketMessage {
  type: 'chat' | 'typing' | 'error' | 'system';
  data: any;
  project_id?: string;
  user_id?: string;
}

export interface TypingStatus {
  user_id: string;
  project_id: string;
  is_typing: boolean;
}

// Legacy Message Types (deprecated - use Conversation instead)
export interface Message {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MessageCreate {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication Types
export interface JwtPayload {
  user_id: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
}

// Context Types
export interface ProjectContext {
  project: Project;
  agent: Agent;
  recent_messages: ConversationMessage[];
  project_files: File[];
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

// Admin Types
export interface AdminStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_messages: number;
  total_conversations?: number;
  total_tokens_used: number;
  total_cost: number;
  monthly_tokens: number;
  monthly_cost: number;
  tokens_this_month?: number;
  cost_this_month?: number;
  top_users: UserUsageStats[];
}

export interface UserUsageStats {
  user_id: string;
  email: string;
  username: string;
  total_tokens: number;
  monthly_tokens: number;
  total_cost: number;
  monthly_cost: number;
  project_count: number;
  last_active: Date;
}

export interface TokenLimitUpdate {
  user_id?: string;
  global_limit?: number;
  monthly_limit?: number;
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
  last_active?: Date;
  created_at: Date;
}

// Configuration Types
export interface Config {
  port: number;
  database_url: string;
  redis_url: string;
  jwt_secret: string;
  jwt_expires_in: string;
  upload_path: string;
  max_file_size: number;
  allowed_file_types: string[];
  cors_origin: string;
  rate_limit: {
    window_ms: number;
    max_requests: number;
  };
  ai: {
    openai_api_key?: string;
    anthropic_api_key?: string;
    openrouter_api_key?: string;
  };
  admin: {
    email: string;
    default_token_limit_global: number;
    default_token_limit_monthly: number;
  };
  log_level: string;
}