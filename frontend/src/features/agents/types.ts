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
