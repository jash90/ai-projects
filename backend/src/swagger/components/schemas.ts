/**
 * Reusable OpenAPI Schemas
 * Based on TypeScript interfaces from /types/index.ts
 */

export const schemas = {
  // User Schemas
  User: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique user identifier',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
      },
      username: {
        type: 'string',
        description: 'User display name',
      },
      role: {
        type: 'string',
        enum: ['user', 'admin'],
        description: 'User role',
      },
      token_limit_global: {
        type: 'number',
        nullable: true,
        description: 'Global token limit for the user',
      },
      token_limit_monthly: {
        type: 'number',
        nullable: true,
        description: 'Monthly token limit for the user',
      },
      is_active: {
        type: 'boolean',
        description: 'Whether the user account is active',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        description: 'Account creation timestamp',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp',
      },
    },
    required: ['id', 'email', 'username', 'role', 'is_active', 'created_at', 'updated_at'],
  },

  UserRegister: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
        example: 'user@example.com',
      },
      username: {
        type: 'string',
        minLength: 3,
        description: 'User display name',
        example: 'johndoe',
      },
      password: {
        type: 'string',
        minLength: 6,
        format: 'password',
        description: 'User password',
        example: 'SecurePass123!',
      },
    },
    required: ['email', 'username', 'password'],
  },

  UserLogin: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
        example: 'user@example.com',
      },
      password: {
        type: 'string',
        format: 'password',
        description: 'User password',
        example: 'SecurePass123!',
      },
    },
    required: ['email', 'password'],
  },

  UserProfileUpdate: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: 'Updated username',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Updated email address',
      },
    },
  },

  AuthResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT access token',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },
    },
  },

  // Project Schemas
  Project: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique project identifier',
      },
      name: {
        type: 'string',
        description: 'Project name',
      },
      description: {
        type: 'string',
        description: 'Project description',
      },
      user_id: {
        type: 'string',
        format: 'uuid',
        description: 'Owner user ID',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp',
      },
      file_count: {
        type: 'number',
        description: 'Number of files in project',
      },
      message_count: {
        type: 'number',
        description: 'Number of messages in project',
      },
    },
    required: ['id', 'name', 'description', 'user_id', 'created_at', 'updated_at'],
  },

  ProjectCreate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Project name',
        example: 'My AI Project',
      },
      description: {
        type: 'string',
        description: 'Project description',
        example: 'A project for building AI-powered applications',
      },
    },
    required: ['name'],
  },

  ProjectUpdate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Updated project name',
      },
      description: {
        type: 'string',
        description: 'Updated project description',
      },
    },
  },

  // Agent Schemas
  Agent: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique agent identifier',
      },
      name: {
        type: 'string',
        description: 'Agent name',
      },
      description: {
        type: 'string',
        nullable: true,
        description: 'Agent description',
      },
      system_prompt: {
        type: 'string',
        description: 'System prompt for the agent',
      },
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'openrouter'],
        description: 'AI provider',
      },
      model: {
        type: 'string',
        description: 'Model identifier',
        example: 'gpt-4',
      },
      temperature: {
        type: 'number',
        minimum: 0,
        maximum: 2,
        description: 'Sampling temperature',
        example: 0.7,
      },
      max_tokens: {
        type: 'number',
        description: 'Maximum tokens to generate',
        example: 2000,
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
      },
    },
    required: ['id', 'name', 'system_prompt', 'provider', 'model', 'temperature', 'max_tokens'],
  },

  AgentCreate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Agent name',
        example: 'Code Assistant',
      },
      description: {
        type: 'string',
        description: 'Agent description',
        example: 'An AI assistant for coding tasks',
      },
      system_prompt: {
        type: 'string',
        description: 'System prompt defining agent behavior',
        example: 'You are a helpful coding assistant',
      },
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'openrouter'],
        description: 'AI provider',
        example: 'openai',
      },
      model: {
        type: 'string',
        description: 'Model identifier',
        example: 'gpt-4',
      },
      temperature: {
        type: 'number',
        minimum: 0,
        maximum: 2,
        description: 'Sampling temperature (default: 0.7)',
        example: 0.7,
      },
      max_tokens: {
        type: 'number',
        description: 'Maximum tokens to generate (default: 2000)',
        example: 2000,
      },
    },
    required: ['name', 'system_prompt', 'provider', 'model'],
  },

  AgentUpdate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Updated agent name',
        example: 'Advanced Code Assistant',
      },
      description: {
        type: 'string',
        description: 'Updated agent description',
        example: 'An advanced AI assistant for complex coding tasks',
      },
      system_prompt: {
        type: 'string',
        description: 'Updated system prompt',
        example: 'You are an expert programming assistant with deep knowledge of software architecture',
      },
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'openrouter'],
        description: 'Updated AI provider',
        example: 'anthropic',
      },
      model: {
        type: 'string',
        description: 'Updated model identifier',
        example: 'claude-3-sonnet-20240229',
      },
      temperature: {
        type: 'number',
        minimum: 0,
        maximum: 2,
        description: 'Updated sampling temperature',
        example: 0.5,
      },
      max_tokens: {
        type: 'number',
        description: 'Updated max tokens',
        example: 4000,
      },
    },
  },

  // Conversation & Message Schemas
  Conversation: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      project_id: {
        type: 'string',
        format: 'uuid',
      },
      agent_id: {
        type: 'string',
        format: 'uuid',
      },
      messages: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/ConversationMessage',
        },
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  ConversationMessage: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        enum: ['user', 'assistant'],
        description: 'Message sender role',
      },
      content: {
        type: 'string',
        description: 'Message content',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
      },
      metadata: {
        $ref: '#/components/schemas/MessageMetadata',
      },
    },
  },

  MessageMetadata: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Associated file IDs',
      },
      tokens: {
        type: 'number',
        description: 'Total tokens used',
      },
      model: {
        type: 'string',
        description: 'Model used',
      },
      processing_time: {
        type: 'number',
        description: 'Processing time in milliseconds',
      },
      prompt_tokens: {
        type: 'number',
        description: 'Prompt tokens used',
      },
      completion_tokens: {
        type: 'number',
        description: 'Completion tokens generated',
      },
    },
  },

  ChatRequest: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'User message',
        example: 'Hello, how can you help me?',
      },
      stream: {
        type: 'boolean',
        description: `Enable streaming response via Server-Sent Events (SSE).

When enabled, the response will be sent as text/event-stream with the following event types:

1. Message events (event: message):
   data: {"role":"assistant","content":"Hello","delta":"Hello"}

2. Completion event (event: done):
   data: {"messageId":"uuid","tokenUsage":{"prompt":10,"completion":5}}

3. Error event (event: error):
   data: {"error":"Error message"}

Example SSE stream:
event: message
data: {"role":"assistant","content":"Hello","delta":"Hello"}

event: message
data: {"role":"assistant","content":"Hello world","delta":" world"}

event: done
data: {"messageId":"550e8400-e29b-41d4-a716-446655440000","tokenUsage":{"prompt":10,"completion":5}}
`,
        example: false,
      },
    },
    required: ['message'],
  },

  ChatResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        type: 'object',
        properties: {
          response: {
            type: 'string',
            description: 'AI response content',
          },
          metadata: {
            $ref: '#/components/schemas/MessageMetadata',
          },
        },
      },
    },
  },

  // File Schemas
  ProjectFile: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      project_id: {
        type: 'string',
        format: 'uuid',
      },
      filename: {
        type: 'string',
        description: 'Stored filename',
      },
      original_name: {
        type: 'string',
        description: 'Original filename',
      },
      mimetype: {
        type: 'string',
        description: 'File MIME type',
        example: 'application/pdf',
      },
      size: {
        type: 'number',
        description: 'File size in bytes',
      },
      path: {
        type: 'string',
        description: 'File path on server',
      },
      uploaded_by: {
        type: 'string',
        format: 'uuid',
        description: 'User ID of uploader',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  // Admin Schemas
  AdminStats: {
    type: 'object',
    properties: {
      total_users: {
        type: 'number',
        example: 42,
      },
      active_users: {
        type: 'number',
        example: 28,
      },
      total_projects: {
        type: 'number',
        example: 156,
      },
      total_messages: {
        type: 'number',
        example: 5247,
      },
      total_tokens_used: {
        type: 'number',
        example: 12458920,
      },
      total_cost: {
        type: 'number',
        example: 245.67,
      },
      monthly_tokens: {
        type: 'number',
        example: 2847560,
      },
      monthly_cost: {
        type: 'number',
        example: 56.89,
      },
      top_users: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/UserUsageStats',
        },
      },
    },
  },

  UserUsageStats: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        format: 'uuid',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      email: {
        type: 'string',
        example: 'user@example.com',
      },
      username: {
        type: 'string',
        example: 'johndoe',
      },
      total_tokens: {
        type: 'number',
        example: 458920,
      },
      monthly_tokens: {
        type: 'number',
        example: 84560,
      },
      total_cost: {
        type: 'number',
        example: 9.18,
      },
      monthly_cost: {
        type: 'number',
        example: 1.69,
      },
      project_count: {
        type: 'number',
        example: 5,
      },
      last_active: {
        type: 'string',
        format: 'date-time',
        example: '2025-01-10T15:30:00Z',
      },
    },
  },

  TokenLimitUpdate: {
    type: 'object',
    properties: {
      global_limit: {
        type: 'number',
        description: 'Global token limit',
        example: 1000000,
      },
      monthly_limit: {
        type: 'number',
        description: 'Monthly token limit',
        example: 100000,
      },
    },
  },

  // Response Schemas
  SuccessResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'object',
        description: 'Response data',
      },
      message: {
        type: 'string',
        description: 'Success message',
      },
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      error: {
        type: 'string',
        description: 'Error message',
      },
    },
  },

  PaginatedResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          total: {
            type: 'number',
            description: 'Total number of items',
          },
          page: {
            type: 'number',
            description: 'Current page number',
          },
          limit: {
            type: 'number',
            description: 'Items per page',
          },
          totalPages: {
            type: 'number',
            description: 'Total number of pages',
          },
        },
      },
    },
  },

  // Model Schemas
  AIModel: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Model identifier',
      },
      name: {
        type: 'string',
        description: 'Human-readable model name',
      },
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'openrouter'],
      },
      max_tokens: {
        type: 'number',
        description: 'Maximum context tokens',
      },
      supports_streaming: {
        type: 'boolean',
      },
    },
  },

  AIStatus: {
    type: 'object',
    properties: {
      openai: {
        type: 'object',
        properties: {
          available: {
            type: 'boolean',
          },
          models: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/AIModel',
            },
          },
        },
      },
      anthropic: {
        type: 'object',
        properties: {
          available: {
            type: 'boolean',
          },
          models: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/AIModel',
            },
          },
        },
      },
    },
  },

  // Additional Agent Schemas
  AgentStats: {
    type: 'object',
    properties: {
      agent_id: {
        type: 'string',
        format: 'uuid',
      },
      total_messages: {
        type: 'number',
        description: 'Total messages sent to this agent',
      },
      total_tokens: {
        type: 'number',
        description: 'Total tokens used by this agent',
      },
      total_cost: {
        type: 'number',
        description: 'Total cost in USD',
      },
      average_response_time: {
        type: 'number',
        description: 'Average response time in milliseconds',
      },
      last_used: {
        type: 'string',
        format: 'date-time',
        description: 'Last time agent was used',
      },
    },
  },

  // File Management Schemas
  EditableFile: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      project_id: {
        type: 'string',
        format: 'uuid',
      },
      name: {
        type: 'string',
        description: 'File name',
      },
      content: {
        type: 'string',
        description: 'File content (text)',
      },
      language: {
        type: 'string',
        description: 'Programming language or file type',
        example: 'typescript',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  FileCreate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'File name',
        example: 'main.ts',
      },
      content: {
        type: 'string',
        description: 'File content',
        example: 'console.log("Hello World");',
      },
      language: {
        type: 'string',
        description: 'Programming language',
        example: 'typescript',
      },
    },
    required: ['name', 'content'],
  },

  FileUpdate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Updated file name',
      },
      content: {
        type: 'string',
        description: 'Updated file content',
      },
      language: {
        type: 'string',
        description: 'Updated language',
      },
    },
  },

  FileUploadResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        $ref: '#/components/schemas/ProjectFile',
      },
      message: {
        type: 'string',
        example: 'File uploaded successfully',
      },
    },
  },

  FileStats: {
    type: 'object',
    properties: {
      total_files: {
        type: 'number',
      },
      total_size: {
        type: 'number',
        description: 'Total size in bytes',
      },
      by_type: {
        type: 'object',
        additionalProperties: {
          type: 'number',
        },
        description: 'File count by MIME type',
      },
    },
  },

  FileSearchResults: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'array',
        items: {
          oneOf: [
            { $ref: '#/components/schemas/ProjectFile' },
            { $ref: '#/components/schemas/EditableFile' },
          ],
        },
      },
      total: {
        type: 'number',
      },
    },
  },

  MigrateMarkdownRequest: {
    type: 'object',
    properties: {
      target_type: {
        type: 'string',
        enum: ['editable', 'upload'],
        description: 'Target file type',
      },
    },
    required: ['target_type'],
  },

  // Message Schemas
  Message: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      project_id: {
        type: 'string',
        format: 'uuid',
      },
      agent_id: {
        type: 'string',
        format: 'uuid',
      },
      role: {
        type: 'string',
        enum: ['user', 'assistant', 'system'],
      },
      content: {
        type: 'string',
      },
      metadata: {
        $ref: '#/components/schemas/MessageMetadata',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  MessageCreate: {
    type: 'object',
    properties: {
      agent_id: {
        type: 'string',
        format: 'uuid',
        description: 'Agent ID',
      },
      role: {
        type: 'string',
        enum: ['user', 'assistant', 'system'],
      },
      content: {
        type: 'string',
        description: 'Message content',
      },
    },
    required: ['agent_id', 'role', 'content'],
  },

  MessageUpdate: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Updated message content',
      },
    },
    required: ['content'],
  },

  MessageSearchResults: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Message',
        },
      },
      total: {
        type: 'number',
      },
    },
  },

  MessageStats: {
    type: 'object',
    properties: {
      total_messages: {
        type: 'number',
      },
      user_messages: {
        type: 'number',
      },
      assistant_messages: {
        type: 'number',
      },
      total_tokens: {
        type: 'number',
      },
      total_cost: {
        type: 'number',
      },
    },
  },

  ConversationContext: {
    type: 'object',
    properties: {
      messages: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Message',
        },
      },
      files: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/EditableFile',
        },
      },
      project: {
        $ref: '#/components/schemas/Project',
      },
      agent: {
        $ref: '#/components/schemas/Agent',
      },
    },
  },

  // Conversation Schemas
  ConversationStats: {
    type: 'object',
    properties: {
      conversation_id: {
        type: 'string',
        format: 'uuid',
      },
      message_count: {
        type: 'number',
      },
      total_tokens: {
        type: 'number',
      },
      total_cost: {
        type: 'number',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      last_message_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  // Chat Validation Schemas
  ChatValidationRequest: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'openrouter'],
      },
      model: {
        type: 'string',
      },
      api_key: {
        type: 'string',
        description: 'Optional API key to test',
      },
    },
    required: ['provider', 'model'],
  },

  ChatValidationResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        type: 'object',
        properties: {
          valid: {
            type: 'boolean',
          },
          model_available: {
            type: 'boolean',
          },
          error: {
            type: 'string',
            nullable: true,
          },
        },
      },
    },
  },

  // Settings Schemas
  PasswordUpdate: {
    type: 'object',
    properties: {
      current_password: {
        type: 'string',
        format: 'password',
      },
      new_password: {
        type: 'string',
        format: 'password',
        minLength: 6,
      },
    },
    required: ['current_password', 'new_password'],
  },

  UserPreferences: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      language: {
        type: 'string',
        default: 'en',
      },
      notifications_enabled: {
        type: 'boolean',
        default: true,
      },
      default_model: {
        type: 'string',
        nullable: true,
      },
      editor_settings: {
        type: 'object',
        properties: {
          font_size: {
            type: 'number',
            default: 14,
          },
          tab_size: {
            type: 'number',
            default: 2,
          },
          word_wrap: {
            type: 'boolean',
            default: true,
          },
        },
      },
    },
  },

  PreferencesUpdate: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
      },
      language: {
        type: 'string',
      },
      notifications_enabled: {
        type: 'boolean',
      },
      default_model: {
        type: 'string',
      },
      editor_settings: {
        type: 'object',
      },
    },
  },

  // Usage Schemas
  UsageSummary: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        format: 'uuid',
      },
      total_tokens: {
        type: 'number',
      },
      monthly_tokens: {
        type: 'number',
      },
      daily_tokens: {
        type: 'number',
      },
      total_cost: {
        type: 'number',
      },
      monthly_cost: {
        type: 'number',
      },
      token_limit_global: {
        type: 'number',
        nullable: true,
      },
      token_limit_monthly: {
        type: 'number',
        nullable: true,
      },
      remaining_global: {
        type: 'number',
        nullable: true,
      },
      remaining_monthly: {
        type: 'number',
        nullable: true,
      },
    },
  },

  UsageStats: {
    type: 'object',
    properties: {
      daily_usage: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
            },
            tokens: {
              type: 'number',
            },
            cost: {
              type: 'number',
            },
          },
        },
      },
      by_model: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            tokens: {
              type: 'number',
            },
            cost: {
              type: 'number',
            },
            messages: {
              type: 'number',
            },
          },
        },
      },
      by_project: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            tokens: {
              type: 'number',
            },
            cost: {
              type: 'number',
            },
          },
        },
      },
    },
  },

  ProjectUsage: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
      },
      total_tokens: {
        type: 'number',
      },
      total_cost: {
        type: 'number',
      },
      message_count: {
        type: 'number',
      },
      by_agent: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              format: 'uuid',
            },
            agent_name: {
              type: 'string',
            },
            tokens: {
              type: 'number',
            },
            cost: {
              type: 'number',
            },
          },
        },
      },
    },
  },

  AgentUsage: {
    type: 'object',
    properties: {
      agent_id: {
        type: 'string',
        format: 'uuid',
      },
      total_tokens: {
        type: 'number',
      },
      total_cost: {
        type: 'number',
      },
      message_count: {
        type: 'number',
      },
      average_tokens_per_message: {
        type: 'number',
      },
    },
  },

  // Models Schemas
  ModelList: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/AIModel',
        },
      },
    },
  },

  ProviderStatus: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'openrouter'],
      },
      available: {
        type: 'boolean',
      },
      model_count: {
        type: 'number',
      },
      last_sync: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
      error: {
        type: 'string',
        nullable: true,
      },
    },
  },

  SyncResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        type: 'object',
        properties: {
          synced_models: {
            type: 'number',
          },
          providers: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },

  // Admin Schemas
  UserStatusUpdate: {
    type: 'object',
    properties: {
      is_active: {
        type: 'boolean',
        description: 'User account active status',
      },
    },
    required: ['is_active'],
  },

  ActivityLog: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      user_id: {
        type: 'string',
        format: 'uuid',
      },
      action: {
        type: 'string',
        description: 'Action performed',
      },
      resource_type: {
        type: 'string',
        enum: ['project', 'agent', 'file', 'message', 'user'],
      },
      resource_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
      },
      metadata: {
        type: 'object',
        description: 'Additional action metadata',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  UserList: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/User',
        },
      },
      pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'number',
          },
          page: {
            type: 'number',
          },
          limit: {
            type: 'number',
          },
          totalPages: {
            type: 'number',
          },
        },
      },
    },
  },

  // Debug Schemas
  UserDebugInfo: {
    type: 'object',
    properties: {
      user: {
        $ref: '#/components/schemas/User',
      },
      usage: {
        $ref: '#/components/schemas/UsageSummary',
      },
      capabilities: {
        type: 'object',
        properties: {
          can_create_projects: {
            type: 'boolean',
          },
          can_use_ai: {
            type: 'boolean',
          },
          reason: {
            type: 'string',
            nullable: true,
          },
        },
      },
      recent_activity: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/ActivityLog',
        },
      },
    },
  },

  TokenLimitTestRequest: {
    type: 'object',
    properties: {
      tokens: {
        type: 'number',
        description: 'Number of tokens to test',
      },
    },
    required: ['tokens'],
  },

  TokenLimitTestResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        type: 'object',
        properties: {
          allowed: {
            type: 'boolean',
          },
          reason: {
            type: 'string',
            nullable: true,
          },
          usage: {
            $ref: '#/components/schemas/UsageSummary',
          },
        },
      },
    },
  },

  AIServiceStatus: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        type: 'object',
        properties: {
          openai: {
            type: 'object',
            properties: {
              configured: {
                type: 'boolean',
              },
              accessible: {
                type: 'boolean',
              },
              error: {
                type: 'string',
                nullable: true,
              },
            },
          },
          anthropic: {
            type: 'object',
            properties: {
              configured: {
                type: 'boolean',
              },
              accessible: {
                type: 'boolean',
              },
              error: {
                type: 'string',
                nullable: true,
              },
            },
          },
        },
      },
    },
  },

  UsageResetResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      message: {
        type: 'string',
      },
      data: {
        type: 'object',
        properties: {
          previous_usage: {
            type: 'number',
          },
          reset_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },

  // Markdown Schemas
  MarkdownExportRequest: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Markdown content to export',
      },
      format: {
        type: 'string',
        enum: ['pdf', 'html', 'docx'],
        description: 'Export format',
      },
      options: {
        type: 'object',
        properties: {
          include_toc: {
            type: 'boolean',
            description: 'Include table of contents',
          },
          page_size: {
            type: 'string',
            enum: ['A4', 'Letter', 'Legal'],
            description: 'PDF page size',
          },
        },
      },
    },
    required: ['content', 'format'],
  },

  MarkdownExportResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        type: 'object',
        properties: {
          download_url: {
            type: 'string',
            description: 'URL to download exported file',
          },
          filename: {
            type: 'string',
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },

  MarkdownTemplate: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      name: {
        type: 'string',
      },
      description: {
        type: 'string',
        nullable: true,
      },
      content: {
        type: 'string',
        description: 'Template markdown content',
      },
      category: {
        type: 'string',
        enum: ['documentation', 'readme', 'notes', 'report', 'custom'],
      },
      is_public: {
        type: 'boolean',
      },
      created_by: {
        type: 'string',
        format: 'uuid',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  TemplateCreate: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Template name',
      },
      description: {
        type: 'string',
        description: 'Template description',
      },
      content: {
        type: 'string',
        description: 'Template markdown content',
      },
      category: {
        type: 'string',
        enum: ['documentation', 'readme', 'notes', 'report', 'custom'],
      },
      is_public: {
        type: 'boolean',
        default: false,
      },
    },
    required: ['name', 'content', 'category'],
  },

  // Project Statistics
  ProjectStats: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
      },
      file_count: {
        type: 'number',
      },
      upload_count: {
        type: 'number',
      },
      message_count: {
        type: 'number',
      },
      total_tokens: {
        type: 'number',
      },
      total_cost: {
        type: 'number',
      },
      agent_count: {
        type: 'number',
      },
      last_activity: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
    },
  },
};
