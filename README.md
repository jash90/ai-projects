# Claude Projects Clone

A production-ready, full-stack AI-powered project management platform that replicates and extends Claude Projects functionality with advanced AI agents, real-time chat, dynamic model management, and comprehensive project collaboration tools.

## 🎯 Key Features

### 🤖 **Advanced AI Integration**
- **Dynamic Model Management**: Automatic synchronization of OpenAI and Anthropic models with real-time status monitoring
- **Multi-Provider Support**: Seamless integration with OpenAI GPT models and Anthropic Claude models
- **Intelligent Agent System**: Specialized AI agents with distinct personalities and capabilities
- **Real-time Chat**: WebSocket-powered conversations with typing indicators and message history
- **Context-Aware AI**: Project files automatically included in AI conversations for enhanced context
- **Token Usage Tracking**: Comprehensive monitoring of AI API usage and costs per project and agent
- **Token Limit Management**: Admin-configurable global and per-user token limits with automatic enforcement
- **Streaming Responses**: Real-time AI response streaming for better user experience

### 📁 **Project Management**
- **Multi-Project Support**: Create and manage unlimited projects with dedicated contexts
- **Advanced File Management**: Upload, preview, and organize project files with support for 20+ file types
- **Project-Specific Agents**: Each project can have its own AI agent configuration
- **Conversation History**: Persistent chat history per project and agent combination with full CRUD operations
- **Real-time Collaboration**: Live updates across all connected clients via WebSocket
- **File Search & Organization**: Full-text search across project files with type filtering
- **Project Analytics**: Usage statistics and insights per project

### 🔒 **Enterprise-Grade Security**
- **JWT Authentication**: Secure token-based auth with automatic refresh and blacklisting
- **Role-Based Access Control**: Admin and user roles with proper authorization
- **Rate Limiting**: Configurable request limits with Redis-backed storage (1000 requests per 15 minutes)
- **Input Validation**: Comprehensive request validation using Joi schemas
- **Security Headers**: Helmet.js integration for secure HTTP headers
- **CORS Protection**: Configurable cross-origin request handling
- **File Upload Security**: MIME type validation and size limits (10MB max)
- **Session Management**: Secure session handling with Redis storage
- **Admin Panel**: Comprehensive admin dashboard with user management and token limits

### 🎨 **Modern User Experience**
- **Responsive Design**: Mobile-first UI built with Tailwind CSS and custom design system
- **Dark/Light Mode**: System-aware theme switching with persistent preferences
- **Real-time Updates**: Live notifications and status updates via Socket.IO
- **Drag & Drop**: Intuitive file upload with visual feedback and progress indicators
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Advanced Components**: Custom UI components with accessibility support
- **Toast Notifications**: Real-time feedback with react-hot-toast integration

### ⚡ **High Performance**
- **Optimized Database**: PostgreSQL with JSONB support and efficient indexing
- **Redis Caching**: Fast session storage, rate limiting, and caching layer
- **Code Splitting**: Automatic chunk splitting for optimal loading performance
- **Connection Pooling**: Efficient database connection management
- **Background Processing**: Non-blocking AI model synchronization
- **TanStack Query**: Advanced server state management with caching and background updates

## 🛠️ Tech Stack

### Frontend Architecture
```typescript
React 18 + TypeScript          // Component framework with strict typing
Vite 4.5                      // Lightning-fast build tool and dev server  
Tailwind CSS 3.3             // Utility-first styling with custom design system
Zustand 4.4                   // Lightweight state management with 7 specialized stores
TanStack Query 5.8           // Server state management and caching
Socket.io Client 4.7         // Real-time bidirectional communication
React Hook Form 7.47 + Zod   // Type-safe form validation
Framer Motion 10.16          // Smooth animations and transitions
React Router v6.17           // Modern routing with data loading
Lucide React 0.288           // Beautiful icon library
React Dropzone 14.2          // File upload with drag & drop
React Markdown 9.0           // Markdown rendering with syntax highlighting
Headless UI 1.7              // Accessible component primitives
```

### Backend Architecture
```typescript
Node.js 18+ + Express 4.18   // Server runtime and web framework
TypeScript 5.2               // Static type checking with strict mode
PostgreSQL 15                // Primary database with JSONB support
Redis 7                      // Session storage, caching, and rate limiting
Socket.io 4.7                // WebSocket server with authentication
Winston 3.11                 // Structured logging with rotation
JWT 9.0                      // Authentication with refresh tokens
Multer 1.4.5                 // File upload handling with security
Joi 17.11                    // Request validation schemas
Helmet 7.0 + CORS 2.8        // Security middleware
Bcrypt 2.4                   // Password hashing
UUID 9.0                     // Unique identifier generation
```

### AI & ML Integration
```typescript
OpenAI SDK v4.20.1          // GPT models integration with streaming
Anthropic SDK v0.60.0       // Claude models integration
Dynamic Model Management     // Auto-sync latest models from providers
Token Usage Tracking        // Comprehensive cost monitoring
Context-Aware Processing    // Project files in AI conversations
Streaming Responses         // Real-time AI response delivery
Custom Agent Personalities  // Specialized AI agents with unique traits
```

### DevOps & Infrastructure
```yaml
Docker + Docker Compose     # Containerization with health checks
pnpm Workspaces 8+         # Monorepo dependency management
Jest 29.7 + Supertest 7.1  # Comprehensive testing suite with 80%+ coverage
ESLint 8.52 + Prettier     # Code quality and formatting
TypeScript Strict Mode     # Enhanced type safety
Nodemon + tsx              # Development hot-reloading
Health Checks              # Container and service monitoring
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **pnpm 8+** (install with `npm install -g pnpm` or `corepack enable pnpm`)
- **Docker & Docker Compose** (for containerized setup)
- **Git** (for version control)
- **OpenAI API Key** (for GPT models)
- **Anthropic API Key** (for Claude models)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd claude-projects-clone

# Run automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or install manually
pnpm run install:all
```

### 2. Environment Configuration

Create `.env` files with your configuration:

**Backend Environment** (`backend/.env`):
```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
DATABASE_URL=postgres://claude_user:claude_password@localhost:5432/claude_projects

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.py,.java,.cpp,.go,.rs,.php,.rb,.swift,.yaml,.yml,.xml,.sql,.sh,.bash

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# AI Provider API Keys
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Admin Configuration
ADMIN_EMAIL=bartekziimny90@gmail.com
DEFAULT_TOKEN_LIMIT_GLOBAL=1000000
DEFAULT_TOKEN_LIMIT_MONTHLY=100000

# Logging
LOG_LEVEL=info
```

**Frontend Environment** (`frontend/.env`):
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Optional: Analytics and monitoring
VITE_APP_VERSION=1.0.0
VITE_BUILD_DATE=2024-01-01
```

### 3. Choose Your Setup Method

#### Option A: Docker (Recommended for Production)
```bash
# Start all services with Docker
pnpm run docker:up

# View logs
docker-compose logs -f

# Stop all services
pnpm run docker:down
```

#### Option B: Development Mode
```bash
# Start databases only
docker-compose up postgres redis -d

# Run database migrations and seeding
pnpm run db:migrate
pnpm run db:seed

# Start both frontend and backend in development mode
pnpm run dev
```

#### Option C: Manual Setup
```bash
# Start backend
cd backend
pnpm run dev

# In another terminal, start frontend
cd frontend
pnpm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs (coming soon)

## 📖 Usage Guide

### Creating Your First Project
1. **Register/Login**: Create an account or sign in with secure JWT authentication
2. **New Project**: Click "New Project" and provide name/description
3. **Select Agent**: Choose from specialized AI agents with unique personalities
4. **Upload Files**: Add project files for AI context (supports 20+ file types)
5. **Start Chatting**: Begin real-time conversations with streaming responses
6. **Monitor Usage**: Track token usage and costs per project

### AI Agents & Models
- **Multiple AI Providers**: OpenAI GPT and Anthropic Claude models
- **Dynamic Model Sync**: Automatic updates when new models are released
- **Custom Agents**: Create specialized agents with custom system prompts
- **Context-Aware**: AI agents automatically reference uploaded project files
- **Token Tracking**: Monitor API usage and costs across all interactions

### Advanced Features
- **Real-time Collaboration**: Multiple users can work on projects simultaneously
- **File Search**: Full-text search across all project files and conversations
- **Usage Analytics**: Detailed insights into AI usage patterns and costs
- **Export Capabilities**: Download conversations and project data
- **WebSocket Integration**: Live updates for messages, typing indicators, and status changes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Pages    │  │ Components  │  │     Stores          │  │
│  │             │  │             │  │ (Zustand)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Hooks    │  │   Services  │  │   TanStack Query    │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                 HTTP API   WebSocket   │
                    │         │         │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Middleware  │  │     Services        │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Models    │  │   Utils     │  │   Socket Handler    │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              PostgreSQL    Redis    AI APIs
                    │         │         │
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Redis    │  │    AI Providers     │  │
│  │   Database  │  │   Cache     │  │ OpenAI + Anthropic  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📡 API Reference

### Authentication Endpoints
```http
POST   /api/auth/register     # User registration with validation
POST   /api/auth/login        # User authentication with JWT
POST   /api/auth/refresh      # Refresh JWT token
POST   /api/auth/logout       # Logout and blacklist token
GET    /api/auth/profile      # Get user profile
PUT    /api/auth/profile      # Update user profile
GET    /api/auth/verify       # Verify token validity
```

### Project Management
```http
GET    /api/projects          # List user projects with pagination
POST   /api/projects          # Create new project
GET    /api/projects/recent   # Get recently accessed projects
GET    /api/projects/search   # Search projects by name/description
GET    /api/projects/:id      # Get project details
PUT    /api/projects/:id      # Update project
DELETE /api/projects/:id      # Delete project and all related data
```

### AI Models & Agents
```http
GET    /api/models                    # List all available AI models
GET    /api/models/providers/status  # Get provider status and health
GET    /api/models/providers/:provider  # Get models by provider (openai/anthropic)
GET    /api/models/:modelId          # Get specific model details
POST   /api/models/sync              # Manually sync models from providers

GET    /api/agents                   # List available agents
GET    /api/agents/:id               # Get agent details
POST   /api/agents                   # Create custom agent
PUT    /api/agents/:id               # Update agent configuration
DELETE /api/agents/:id               # Delete custom agent
GET    /api/agents/:id/stats         # Get agent usage statistics
```

### Chat & Conversations
```http
GET    /api/conversations/:projectId/:agentId        # Get conversation history
POST   /api/conversations/:projectId/:agentId/messages  # Send message
DELETE /api/conversations/:projectId/:agentId        # Clear conversation
GET    /api/conversations/:projectId                 # Get all project conversations
GET    /api/conversations/:projectId/:agentId/stats  # Get conversation statistics

POST   /api/projects/:projectId/agents/:agentId/chat  # Send chat message
GET    /api/ai/status                                 # Get AI service status
POST   /api/ai/validate                              # Validate AI configuration
```

### Message Management
```http
GET    /api/projects/:projectId/messages        # Get project messages with pagination
POST   /api/projects/:projectId/messages       # Create new message
GET    /api/messages/:id                       # Get specific message
PUT    /api/messages/:id                       # Update message
DELETE /api/messages/:id                       # Delete message
GET    /api/projects/:projectId/context        # Get project context for AI
GET    /api/projects/:projectId/messages/search  # Search messages
GET    /api/projects/:projectId/messages/stats   # Get message statistics
DELETE /api/projects/:projectId/messages        # Clear all project messages
```

### File Management
```http
# Project Files (structured content)
GET    /api/projects/:projectId/files           # List project files
POST   /api/projects/:projectId/files          # Create project file
GET    /api/files/:id                          # Get file content
PUT    /api/files/:id                          # Update file content
DELETE /api/files/:id                          # Delete file
GET    /api/projects/:projectId/files/search   # Search files by content
GET    /api/projects/:projectId/files/type/:type  # Get files by type
GET    /api/projects/:projectId/files/stats    # Get file statistics

# File Uploads (binary files)
GET    /api/projects/:projectId/uploads        # List uploaded files
POST   /api/projects/:projectId/uploads       # Upload binary file
GET    /api/files/:id/download                # Download file
GET    /api/projects/:projectId/uploads/type/:mimetype  # Filter by MIME type
GET    /api/projects/:projectId/uploads/search  # Search uploaded files
GET    /api/projects/:projectId/uploads/stats   # Get upload statistics
```

### Usage & Analytics
```http
GET    /api/usage/summary                      # Overall usage summary
GET    /api/usage/stats                        # Detailed usage statistics
GET    /api/projects/:projectId/usage          # Project-specific usage
GET    /api/agents/:agentId/usage              # Agent-specific usage
```

### Admin Panel (Admin Only)
```http
GET    /api/admin/stats                        # Admin dashboard statistics
GET    /api/admin/users                        # Get all users with pagination and filters
GET    /api/admin/users/:userId/stats          # Get detailed user statistics
PUT    /api/admin/users/:userId/status         # Toggle user active/inactive status
PUT    /api/admin/users/:userId/token-limits   # Update token limits for specific user
GET    /api/admin/token-limits                 # Get global token limits
PUT    /api/admin/token-limits                 # Update global token limits
GET    /api/admin/activity                     # Get admin activity log with pagination
```

### User Settings (Authenticated Users)
```http
GET    /api/settings/profile                   # Get user profile information
PUT    /api/settings/profile                   # Update username and email
PUT    /api/settings/password                  # Change user password
GET    /api/settings/preferences               # Get user preferences (theme, notifications)
PUT    /api/settings/preferences               # Update user preferences
GET    /api/settings/usage                     # Get personal usage statistics
```

### WebSocket Events
```javascript
// Client to Server
'join-project'        // Join project room
'send-message'        // Send chat message
'typing-start'        // Start typing indicator
'typing-stop'         // Stop typing indicator

// Server to Client
'new-message'         // New message received
'message-history'     // Historical messages
'user-typing'         // User typing status
'connection-status'   // Connection updates
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run backend tests only
cd backend && pnpm test

# Run tests with coverage
cd backend && pnpm test --coverage

# Run specific test suites
cd backend && pnpm test --testNamePattern="Database"

# Run tests in watch mode
cd backend && pnpm test --watch

# Run all tests including integration tests
cd backend && pnpm run test:all
```

### Test Configuration
- **Jest 29.7** with TypeScript support via ts-jest
- **Supertest 7.1** for API endpoint testing
- **30-second timeout** for AI service tests
- **Sequential execution** to avoid database conflicts
- **Coverage reporting** with HTML, LCOV, and text formats
- **Setup files** for test environment initialization

### Test Structure
```
backend/src/__tests__/
├── core/                    # Core functionality tests
│   ├── database.test.ts     # Database connection and operations
│   ├── environment.test.ts  # Environment configuration validation
│   └── testHelpers.test.ts  # Test utility functions
├── models/                  # Database model tests
│   ├── Project.basic.test.ts    # Project model CRUD operations
│   ├── Conversation.basic.test.ts  # Conversation model tests
│   ├── User.basic.test.ts       # User model tests
│   ├── Agent.basic.test.ts      # Agent model tests
│   ├── Message.basic.test.ts    # Message model tests
│   └── File.basic.test.ts       # File model tests
├── routes/                  # API endpoint tests
│   ├── auth.test.ts         # Authentication endpoints
│   └── projects.test.ts     # Project management endpoints
├── services/                # Service layer tests
│   └── aiService.test.ts    # AI service integration tests
├── middleware/              # Middleware tests
│   └── auth.test.ts         # Authentication middleware
└── utils/                   # Utility function tests
    └── testHelpers.ts       # Common test utilities and mocks
```

### Test Coverage Goals
- **Overall**: >80% code coverage
- **Critical paths**: >95% coverage (auth, AI service, data models)
- **Integration tests**: All major API endpoints
- **Unit tests**: All utility functions and business logic

## 🚀 Deployment

### Production Build
```bash
# Build both frontend and backend
pnpm run build

# Start production server
pnpm start
```

### Docker Production
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# Scale services (optional)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=postgres://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-secret-min-32-characters
OPENAI_API_KEY=your-production-openai-key
ANTHROPIC_API_KEY=your-production-anthropic-key
CORS_ORIGIN=https://yourdomain.com
```

## 🔧 Development

### Project Structure
```
claude-projects-clone/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Database models and schemas
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── __tests__/      # Test suites
│   ├── dist/               # Compiled JavaScript
│   ├── uploads/            # File upload storage
│   └── logs/               # Application logs
├── frontend/               # React TypeScript application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand state management
│   │   ├── lib/            # Utility libraries
│   │   └── types/          # TypeScript definitions
│   ├── dist/               # Production build
│   └── public/             # Static assets
├── scripts/                # Utility scripts
└── docker-compose.yml      # Container orchestration
```

### Database Schema
```sql
-- Core Tables
users              # User accounts and authentication (id, email, password_hash, created_at, updated_at)
projects           # Project information and settings (id, user_id, name, description, created_at, updated_at)
agents             # AI agent configurations (id, name, description, personality, model_id, system_prompt)
ai_models          # Available AI models from providers (id, name, provider, model_id, context_length, etc.)

-- Content Tables
conversations      # Chat conversations with JSONB messages (id, project_id, agent_id, messages, created_at)
messages           # Individual chat messages (id, conversation_id, content, role, metadata, tokens_used)
project_files      # Project file metadata and content (id, project_id, name, content, file_type, size)
files              # Binary file uploads (id, project_id, filename, original_name, mime_type, size, path)

-- Analytics Tables
token_usage        # AI API usage tracking (id, user_id, project_id, agent_id, model_id, tokens_used, cost)

-- System Tables (handled by Redis)
user_sessions      # Active user sessions (Redis)
rate_limits        # API rate limiting data (Redis)
```

### Component Architecture

#### Frontend Components
```
src/components/
├── layouts/           # Page layouts (Auth, Dashboard)
├── ui/               # Reusable UI components (Button, Input, Modal, etc.)
├── projects/         # Project-specific components
├── agents/           # Agent management components  
├── chat/             # Chat interface components
├── files/            # File management components
└── usage/            # Usage analytics components

src/stores/           # Zustand state management
├── authStore.ts      # Authentication state
├── projectStore.ts   # Project management state
├── agentStore.ts     # Agent configuration state
├── chatStore.ts      # Chat interface state
├── conversationStore.ts  # Conversation history state
├── fileStore.ts      # File management state
└── uiStore.ts        # UI preferences and theme state
```

#### Backend Services
```
src/services/
├── aiService.ts      # AI provider integration (OpenAI + Anthropic)
├── modelService.ts   # AI model management and synchronization
├── socketHandler.ts  # WebSocket connection and event handling
└── tokenService.ts   # JWT token management and validation

src/models/           # Database models with TypeScript interfaces
├── User.ts           # User account model
├── Project.ts        # Project model with relationships
├── Agent.ts          # AI agent configuration model
├── AIModel.ts        # AI model metadata model
├── Conversation.ts   # Conversation model with JSONB messages
├── Message.ts        # Individual message model
├── ProjectFile.ts    # Project file model
├── File.ts           # Binary file upload model
└── TokenUsage.ts     # Usage tracking model
```

### Adding New Features

1. **Backend API Endpoint**:
```typescript
// backend/src/routes/newFeature.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
router.use(authenticateToken);

const createSchema = Joi.object({
  name: Joi.string().required(),
  // Add validation schema
});

router.get('/', async (req, res) => {
  try {
    // Implementation with proper error handling
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error in newFeature route:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/', validateRequest(createSchema), async (req, res) => {
  // Implementation
});

export default router;
```

2. **Frontend API Client**:
```typescript
// frontend/src/lib/api.ts
export const newFeatureApi = {
  getAll: () => apiClient.get<ApiResponse<DataType[]>>('/api/new-feature'),
  getById: (id: string) => apiClient.get<ApiResponse<DataType>>(`/api/new-feature/${id}`),
  create: (data: CreateDataType) => apiClient.post<ApiResponse<DataType>>('/api/new-feature', data),
  update: (id: string, data: UpdateDataType) => apiClient.put<ApiResponse<DataType>>(`/api/new-feature/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/api/new-feature/${id}`),
};
```

3. **State Management with Zustand**:
```typescript
// frontend/src/stores/newFeatureStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface NewFeatureState {
  items: DataType[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setItems: (items: DataType[]) => void;
  addItem: (item: DataType) => void;
  updateItem: (id: string, updates: Partial<DataType>) => void;
  removeItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNewFeatureStore = create<NewFeatureState>()(
  devtools(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      updateItem: (id, updates) => set((state) => ({
        items: state.items.map((item) => item.id === id ? { ...item, ...updates } : item)
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'new-feature-store' }
  )
);
```

4. **React Query Integration**:
```typescript
// frontend/src/hooks/useNewFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newFeatureApi } from '@/lib/api';
import { useNewFeatureStore } from '@/stores/newFeatureStore';

export const useNewFeature = () => {
  const queryClient = useQueryClient();
  const { setError } = useNewFeatureStore();

  const {
    data: items,
    isLoading,
    error
  } = useQuery({
    queryKey: ['new-feature'],
    queryFn: () => newFeatureApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: newFeatureApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-feature'] });
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  return {
    items: items?.data || [],
    isLoading,
    error,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};
```

### Code Quality Standards
- **TypeScript Configuration**: Strict typing with path aliases and decorator support
- **ESLint + Prettier**: Automated code formatting and linting with custom rules
- **Conventional Commits**: Structured commit messages following semantic versioning
- **Test Coverage**: Comprehensive Jest testing with >80% coverage target
- **Documentation**: JSDoc comments for all public APIs and complex business logic
- **Error Handling**: Consistent error patterns with proper logging and user feedback
- **Security**: Input validation, rate limiting, and secure authentication patterns

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style Guidelines
- Use **TypeScript** for all new code
- Follow **React** best practices and hooks patterns
- Write **tests** for new functionality
- Update **documentation** for API changes
- Use **conventional commits** for commit messages

### Reporting Issues
- Use the issue template
- Include steps to reproduce
- Provide environment details
- Add relevant logs or screenshots

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and API
- **Anthropic** for Claude models and API
- **React Team** for the amazing framework
- **Vercel** for Vite and development tools
- **PostgreSQL** and **Redis** communities

---

## 🔧 Configuration

### Backend Configuration (`backend/src/utils/config.ts`)
The backend uses a centralized configuration system that loads from environment variables:

```typescript
// Key configuration areas
server: {
  port: 3001,
  cors_origin: "http://localhost:3000"
}
database: {
  url: "postgres://claude_user:claude_password@localhost:5432/claude_projects"
}
redis: {
  url: "redis://localhost:6379"
}
ai: {
  openai_api_key: "your-openai-key",
  anthropic_api_key: "your-anthropic-key"
}
upload: {
  path: "./uploads",
  max_file_size: 10485760, // 10MB
  allowed_types: [".txt", ".md", ".json", ...] // 20+ supported types
}
rate_limiting: {
  window_ms: 900000, // 15 minutes
  max_requests: 1000
}
```

### Frontend Configuration (`frontend/vite.config.ts`)
- **Vite 4.5** with React plugin and TypeScript support
- **Path aliases** for clean imports (`@/` maps to `src/`)
- **Proxy configuration** for API and WebSocket connections
- **Code splitting** with manual chunks for optimal loading
- **Source maps** enabled for debugging

### Docker Configuration
- **Multi-stage builds** for optimized production images
- **Health checks** for all services (PostgreSQL, Redis, Backend)
- **Volume persistence** for database and upload storage
- **Network isolation** with service-to-service communication
- **Environment variable** injection for configuration

## 🚀 Advanced Usage

### Custom AI Agent Creation
```typescript
// Example: Creating a specialized code review agent
const codeReviewAgent = {
  name: "Code Review Expert",
  description: "Specialized in code analysis and review",
  personality: "analytical",
  model_id: "gpt-4-turbo-preview",
  system_prompt: `You are a senior code reviewer with expertise in...
    Focus on: security, performance, maintainability, best practices.
    Provide: specific suggestions, code examples, explanations.`
};
```

### WebSocket Integration
```typescript
// Frontend WebSocket usage
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: { token: authToken },
  transports: ['websocket', 'polling']
});

// Join project room for real-time updates
socket.emit('join-project', { projectId });

// Listen for new messages
socket.on('new-message', (message) => {
  // Handle incoming message
});
```

### File Upload with Progress
```typescript
// Drag & drop file upload with progress tracking
const uploadFile = async (file: File, projectId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post(`/api/projects/${projectId}/uploads`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const progress = (progressEvent.loaded / progressEvent.total) * 100;
      updateProgress(progress);
    }
  });
};
```

---

**Built with ❤️ using modern web technologies and AI integration**

For support, feature requests, or contributions, please visit our [GitHub repository](https://github.com/your-username/claude-projects-clone).