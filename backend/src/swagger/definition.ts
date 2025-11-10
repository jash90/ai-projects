/**
 * Base OpenAPI 3.0 Definition
 * Defines the core API information, servers, and metadata
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AI Projects Platform API',
    version: '1.0.0',
    description: `
      A comprehensive REST API for managing AI projects, agents, and conversations.

      ## Features
      - User authentication with JWT tokens
      - Project and agent management
      - Real-time AI chat with streaming support
      - File uploads and management
      - Token usage tracking and limits
      - Admin dashboard and controls

      ## Authentication
      Most endpoints require authentication via JWT Bearer token.
      Use the /api/auth/login endpoint to obtain a token, then click "Authorize" to add it.
    `,
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3001',
      description: process.env.NODE_ENV === 'production'
        ? 'Production server'
        : 'Development server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and profile management',
    },
    {
      name: 'Projects',
      description: 'Project creation and management',
    },
    {
      name: 'Agents',
      description: 'AI agent configuration and management',
    },
    {
      name: 'Chat',
      description: 'AI conversations and messaging',
    },
    {
      name: 'Files',
      description: 'File upload, download, and management',
    },
    {
      name: 'Admin',
      description: 'Administrative functions and user management',
    },
    {
      name: 'Debug',
      description: 'Development and debugging endpoints',
    },
    {
      name: 'Conversations',
      description: 'Conversation history and management',
    },
    {
      name: 'Models',
      description: 'AI model information and synchronization',
    },
    {
      name: 'Settings',
      description: 'User settings and preferences',
    },
    {
      name: 'Usage',
      description: 'Token usage tracking and statistics',
    },
  ],
};
