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
  subscription_plan_id?: string;
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
export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
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
  attachments?: ChatFileAttachmentInfo[];
}

// Chat file attachment types (for multimodal LLM support)
// Full attachment with base64 data for sending to AI
export interface ChatFileAttachment {
  id?: string;
  filename: string;
  mimetype: string;
  size: number;
  data: string; // base64 encoded data
}

// Attachment info for storing in message metadata (without base64 data)
export interface ChatFileAttachmentInfo {
  filename: string;
  mimetype: string;
  size: number;
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
  frontend_url: string;
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
  stripe: {
    mode: 'test' | 'live';
    secret_key?: string;
    webhook_secret?: string;
    public_key?: string;
  };
  log_level: string;
}

// Subscription Types
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' | 'incomplete';
export type BillingCycle = 'monthly' | 'yearly';
export type PlanName = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  display_name: string;
  description?: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  price_monthly: number;
  price_yearly: number;
  token_limit_monthly: number;
  token_limit_global?: number;
  features: string[];
  max_projects?: number;
  max_agents?: number;
  max_file_size_mb: number;
  priority_support: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  trial_start?: Date;
  trial_end?: Date;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionHistoryEvent {
  id: string;
  user_id: string;
  subscription_id?: string;
  event_type: 'created' | 'upgraded' | 'downgraded' | 'canceled' | 'renewed' | 'payment_failed' | 'reactivated';
  from_plan_id?: string;
  to_plan_id?: string;
  stripe_event_id?: string;
  details?: Record<string, unknown>;
  created_at: Date;
}

export interface CreateCheckoutRequest {
  plan_id: string;
  billing_cycle: BillingCycle;
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutSession {
  session_id: string;
  url: string;
}

export interface PortalSession {
  url: string;
}

export interface UserLimits {
  token_limit_monthly: number;
  token_limit_global?: number;
  max_projects?: number;
  max_agents?: number;
  max_file_size_mb: number;
}

export interface LimitCheck {
  allowed: boolean;
  current: number;
  max: number | null;
  message?: string;
}

// Admin Subscription Plan Management Types
export interface PlanCreate {
  name: string;
  display_name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  token_limit_monthly: number;
  token_limit_global?: number;
  max_projects?: number;
  max_agents?: number;
  max_file_size_mb: number;
  features: string[];
  priority_support?: boolean;
  sort_order?: number;
}

export interface PlanUpdate {
  display_name?: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  token_limit_monthly?: number;
  token_limit_global?: number;
  max_projects?: number;
  max_agents?: number;
  max_file_size_mb?: number;
  features?: string[];
  priority_support?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface StripeSyncResult {
  success: boolean;
  price_id_monthly?: string;
  price_id_yearly?: string;
  errors?: string[];
  message?: string;
}