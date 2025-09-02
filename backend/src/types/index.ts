// User Types
export interface User {
  id: string;
  email: string;
  username: string;
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
export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  provider: 'openai' | 'anthropic';
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
  };
  log_level: string;
}