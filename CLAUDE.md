# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Projects Platform - a full-stack TypeScript application with pnpm workspaces and Nx build orchestration. Users can create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and have conversations with AI assistants.

## Development Commands

```bash
# Root level - start everything
pnpm install              # Install all dependencies
pnpm dev                  # Start frontend + backend in parallel
pnpm build                # Build entire monorepo with Nx caching
pnpm type-check           # Type check all packages
pnpm lint                 # Lint all packages

# Database operations
pnpm db:migrate           # Run database migrations
pnpm db:seed              # Seed initial data

# Individual package commands
cd backend && pnpm dev    # Backend only (port 3001)
cd frontend && pnpm dev   # Frontend only (port 3000)

# Testing
cd backend && pnpm test                   # Run all backend tests
cd backend && pnpm run test:token-limits  # Test token limit enforcement
cd backend && pnpm run check:user <email> # Debug specific user account

# Nx-specific
pnpm exec nx graph                  # Visual dependency graph
pnpm exec nx affected -t build      # Build only affected projects
```

## Architecture

### Workspace Structure
- **backend/**: Express API, PostgreSQL, Redis, Socket.io
- **frontend/**: React 18 + Vite + TailwindCSS + Zustand
- **shared-types/**: Shared TypeScript types (workspace dependency)

### Backend Path Aliases
Uses `@/` prefix for imports from `backend/src/`:
```typescript
import { aiService } from '@/services/aiService';
import { User } from '@/types';
```

### Frontend API Pattern
All API calls go through `frontend/src/lib/api.ts` which provides typed API modules:
- `authApi` - Authentication
- `projectsApi` - Project CRUD
- `agentsApi` - AI agent management
- `chatApi` - AI chat (including streaming)
- `filesApi` - Project files (text-based, for editing)
- `uploadedFilesApi` - Uploaded files (binary, for agent context)
- `conversationsApi` - Chat history
- `adminApi` - Admin panel operations
- `usageApi` - Token usage tracking

### State Management (Zustand)
Frontend stores in `frontend/src/stores/`:
- `authStore.ts` - Authentication (persisted to localStorage)
- `projectStore.ts` - Project management
- `agentStore.ts` - AI agents
- `conversationStore.ts` - Chat conversations
- `fileStore.ts` - File management
- `uiStore.ts` - Theme/UI preferences (persisted)

### AI Service Architecture
`backend/src/services/aiService.ts` - Multi-provider AI integration:
- `AIService.chat()` - Main entry point, routes to provider
- `chatWithOpenAI()` / `streamChatWithOpenAI()`
- `chatWithAnthropic()` / `streamChatWithAnthropic()`
- `chatWithOpenRouter()` / `streamChatWithOpenRouter()`
- Supports streaming responses via AsyncGenerator

### Real-time Communication
Socket.io with room-based project collaboration:
```typescript
// Frontend: useSocket hook manages connection
socket.emit('join-project', { projectId });
socket.on('new-message', handleMessage);
```

### Database Tables
- `users` - Accounts with roles and token limits
- `projects` - User projects
- `agents` - AI agent configurations (provider, model, prompt)
- `conversations` - Chat history with JSONB messages
- `files` - Text-based project files (for editing)
- `project_files` - Uploaded binary files (for agent context)
- `token_usage` - API usage tracking with costs

## Key Patterns

### Error Handling
HTTP status codes:
- `401`: Unauthorized
- `402`: Token limits exceeded
- `403`: Forbidden
- `429`: Rate limited

### File Systems
Two distinct file systems:
1. **Project files** (`files` table): Text content stored in DB, editable in Monaco Editor
2. **Uploaded files** (`project_files` table): Binary files on disk, included in AI context

### Token Limit System
- Global and monthly limits per user
- Admin-configurable via `/api/admin/limits`
- Client-side pre-validation in `usageApi.getCurrentUsage()`

## Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgres://user:pass@localhost:5432/claude_projects
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
JWT_SECRET=your-secret
ADMIN_EMAIL=admin@example.com
CORS_ORIGIN=http://localhost:3000
ENABLE_SWAGGER=true
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## API Documentation
Interactive Swagger docs available at `/api-docs` when `ENABLE_SWAGGER=true`.
