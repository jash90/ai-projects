# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is an **AI Projects Platform** - a full-stack TypeScript application built with modern web technologies and pnpm workspaces. It enables users to create projects, manage AI agents, upload files, and have conversations with AI assistants.

### Technology Stack

**Frontend** (React + TypeScript):
- **React 18** with automatic JSX runtime
- **Vite 4.5** for build tooling and dev server  
- **TypeScript 5.2** with strict mode
- **TailwindCSS 3.3** with custom design tokens
- **Zustand 4.4** for state management with persistence
- **TanStack Query 5.8** for server state and caching
- **Socket.io Client 4.7** for real-time communication
- **React Router 6.17** for client-side routing

**Backend** (Node.js + TypeScript):
- **Express 4.18** with TypeScript 5.2
- **PostgreSQL** with native pg driver
- **Redis** for sessions and caching
- **Socket.io 4.7** for WebSocket communication
- **JWT authentication** with refresh tokens
- **Winston** for structured logging
- **Joi** for request validation
- **Multer** for file uploads

**AI Integration**:
- **OpenAI SDK v4.20.1** for GPT models
- **Anthropic SDK v0.60.0** for Claude models
- Dynamic model management with auto-sync
- Token usage tracking and limits
- Streaming responses

## Development Commands

### Root Level (pnpm workspace)
```bash
# Install all dependencies across workspace
pnpm install

# Start both frontend and backend in parallel
pnpm run dev

# Build entire project
pnpm run build

# Type check all packages
pnpm run type-check

# Lint all packages
pnpm run lint

# Clean all build artifacts
pnpm run clean
```

### Backend Commands
```bash
cd backend

# Development with hot reload
pnpm run dev

# Build TypeScript to JavaScript
pnpm run build

# Start production server
pnpm start

# Database operations
pnpm run db:migrate
pnpm run db:seed

# Testing
pnpm test                    # Run all tests
pnpm run test:all           # Include normally ignored tests
pnpm run test:token-limits  # Test token limit enforcement

# Type checking and linting
pnpm run type-check
pnpm run lint
pnpm run lint:fix

# Debug and utility scripts
pnpm run check:user <email>          # Analyze specific user account
pnpm run debug:token-limits          # Debug token calculations
pnpm run inspect:test-db            # Inspect test database
```

### Frontend Commands
```bash
cd frontend

# Development server (runs on port 3000, proxies API to :3001)
pnpm run dev

# Production build
pnpm run build

# Type checking only
pnpm run type-check

# Linting with ESLint
pnpm run lint

# Preview production build
pnpm preview

# Clean build artifacts
pnpm run clean
```

## System Architecture

### Backend Architecture

**Server Structure** (`backend/src/`):
```
├── index.ts                 # Express app setup, middleware, routes
├── database/
│   ├── connection.ts        # PostgreSQL connection with pooling
│   ├── migrate.ts           # Database migrations
│   └── seed.ts             # Initial data seeding
├── middleware/
│   ├── auth.ts             # JWT authentication middleware
│   ├── adminAuth.ts        # Admin role authorization
│   ├── validation.ts       # Joi schema validation
│   └── rateLimiting.ts     # Redis-backed rate limiting
├── routes/                 # API route handlers
│   ├── auth.ts            # Authentication endpoints
│   ├── projects.ts        # Project CRUD operations
│   ├── agents.ts          # AI agent management
│   ├── chat.ts            # AI chat functionality
│   ├── files.ts           # File upload/management
│   ├── admin.ts           # Admin panel endpoints
│   └── debug.ts           # Debug/troubleshooting tools
├── services/
│   ├── aiService.ts       # OpenAI & Anthropic integration
│   ├── socketHandler.ts   # WebSocket connection management
│   ├── modelService.ts    # AI model synchronization
│   └── tokenService.ts    # Token usage tracking
├── models/                # TypeScript data models
└── utils/                 # Configuration, logging, errors
```

**Key Backend Patterns**:
- **Path aliases**: Uses `@/` for imports (`@/services/aiService`)
- **Type safety**: Comprehensive TypeScript interfaces in `types/index.ts`
- **Error handling**: Structured error responses with proper HTTP codes
- **Authentication**: JWT with refresh tokens, role-based access control
- **Real-time**: Socket.io with room-based project collaboration
- **File uploads**: Multer with security validation (10MB limit)
- **Database**: PostgreSQL with connection pooling, JSONB for metadata
- **Caching**: Redis for sessions, rate limiting, and model data

### Frontend Architecture

**Component Structure** (`frontend/src/`):
```
├── components/
│   ├── ui/                # Reusable UI primitives (Button, Input, etc.)
│   ├── layouts/           # Page layout containers
│   ├── chat/              # Real-time chat components
│   ├── files/             # File management components
│   ├── agents/            # AI agent configuration
│   ├── projects/          # Project management
│   ├── markdown/          # Advanced markdown editing system
│   └── admin/             # Admin dashboard components
├── stores/                # Zustand state management
│   ├── authStore.ts       # Authentication & user data (persisted)
│   ├── projectStore.ts    # Project management
│   ├── agentStore.ts      # AI agent state
│   ├── conversationStore.ts # Chat history & conversations
│   ├── fileStore.ts       # File upload & editing
│   ├── markdownStore.ts   # Markdown editing with live preview
│   ├── adminStore.ts      # Admin dashboard state
│   └── uiStore.ts         # Theme & UI preferences (persisted)
├── pages/                 # Route components
├── hooks/                 # Custom React hooks
│   ├── useSocket.ts       # WebSocket integration
│   └── useAuth.ts         # Authentication helpers
├── lib/
│   └── api.ts             # Axios client with JWT interceptors
└── types/                 # TypeScript definitions
```

**Key Frontend Patterns**:
- **State Management**: Zustand stores with persistence for auth/UI data
- **API Integration**: Centralized axios client with automatic JWT token handling
- **Real-time**: Socket.io connection managed through `useSocket` hook
- **File System**: Dual file systems (project files for editing, agent files for uploads)
- **Markdown**: Advanced markdown editor with live preview, math rendering, syntax highlighting
- **Theme System**: CSS custom properties with light/dark mode switching
- **Type Safety**: Comprehensive TypeScript types shared between frontend/backend

### Database Design

**Core Tables**:
- `users` - User accounts with roles and token limits
- `projects` - User projects with metadata
- `agents` - AI agent configurations (provider, model, prompt)
- `conversations` - Chat conversations with message history
- `files` - Project files (text-based, for editing)
- `project_files` - Uploaded files (binary, for agent context)
- `token_usage` - AI API usage tracking with costs

**Key Features**:
- PostgreSQL with JSONB for flexible metadata storage
- Comprehensive indexes for performance
- Foreign key constraints for data integrity
- Audit trails for admin actions

### AI Integration Architecture

**Multi-Provider Support**:
- **OpenAI GPT models**: GPT-4, GPT-3.5-turbo with streaming
- **Anthropic Claude models**: Claude-3-sonnet, Claude-3-haiku
- **Dynamic model management**: Auto-sync latest models from providers
- **Token tracking**: Comprehensive usage monitoring with cost calculation
- **Context awareness**: Project files automatically included in AI conversations

**Agent System**:
- Custom AI agents with specialized prompts and personalities
- Per-project agent configuration
- Temperature and token limit controls
- Model switching between providers

## Environment Configuration

**Backend** (`.env`):
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://claude_user:claude_password@localhost:5432/claude_projects
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
JWT_SECRET=your-jwt-secret
ADMIN_EMAIL=admin@example.com
CORS_ORIGIN=http://localhost:3000
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Key Development Patterns

### State Management Pattern (Zustand)
```typescript
// All stores follow this pattern with persistence
export const useStoreName = create<StoreType>()(
  persist(
    (set, get) => ({
      // state properties
      // actions that call set() or get()
    }),
    { name: 'store-name' } // localStorage key
  )
)
```

### API Integration Pattern
```typescript
// API client with JWT interceptors (lib/api.ts)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 120000, // 2 minutes for AI operations
});

// Automatic JWT token injection and refresh handling
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### WebSocket Integration Pattern
```typescript
// Real-time communication through useSocket hook
const socket = useSocket(); // Automatically connects when authenticated

// Project room management
useEffect(() => {
  if (projectId) {
    socket?.emit('join-project', { projectId });
    return () => socket?.emit('leave-project', { projectId });
  }
}, [projectId, socket]);
```

### File Type Detection
The `getLanguageFromFileType()` function maps extensions to Monaco Editor languages. **Markdown files automatically use the enhanced markdown editor instead of Monaco.**

### Error Handling Pattern
```typescript
// Structured error responses with proper HTTP codes
// 401: Unauthorized, 403: Forbidden, 402: Token limits exceeded, 429: Rate limited
const response = await apiClient.someEndpoint();
if (!response.success) {
  // Error handling based on status code
  if (response.status === 402) {
    // Handle token limit exceeded
  }
}
```

## Testing Strategy

### Backend Testing
- **Jest + Supertest** for API endpoint testing
- **Test database**: Isolated PostgreSQL instance for safe testing
- **Token limit testing**: Comprehensive 7-scenario test suite
- **User account debugging**: Tools for analyzing accounts and usage

### Frontend Testing
- **Component testing** with React Testing Library (ready for implementation)
- **E2E testing** infrastructure prepared
- **Type checking** with TypeScript strict mode

## Special Features

### Advanced Markdown System
- **Rich editor** with toolbar and live preview
- **Multiple view modes**: side-by-side, below, or tab view
- **Math rendering** with KaTeX support
- **Syntax highlighting** for code blocks
- **Security**: XSS protection with DOMPurify
- **File integration**: Markdown files get enhanced editor automatically

### Admin System
- **Role-based access control** with admin middleware
- **Token limit management**: Global and per-user limits
- **Usage analytics**: Comprehensive statistics and monitoring
- **User management**: Account status, limit adjustments
- **Debug tools**: Production-safe debugging endpoints

### Real-time Features
- **Project collaboration**: Live updates across connected clients
- **Typing indicators**: Real-time typing status in chat
- **Message streaming**: AI responses stream in real-time
- **Connection management**: Automatic reconnection handling

## Development Guidelines

### Code Patterns to Follow
- Use absolute imports with `@/` prefix for backend, relative imports for frontend
- Follow existing TypeScript interfaces and type safety patterns
- Implement comprehensive error handling with structured responses  
- Use Zustand stores for frontend state management with persistence where appropriate
- Follow existing authentication patterns with JWT tokens and role checks
- Implement proper WebSocket room management for real-time features

### Testing Requirements
- Add unit tests for new API endpoints using Jest + Supertest
- Test token limit enforcement for any changes to usage tracking
- Verify proper error handling and HTTP status codes
- Test WebSocket functionality for real-time features

### Database Changes
- Always create migrations for schema changes (`db:migrate`)
- Test migrations on sample data (`db:seed`)
- Update TypeScript interfaces to match schema changes
- Consider performance impact and add appropriate indexes