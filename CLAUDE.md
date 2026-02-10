# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Projects Platform - a full-stack TypeScript application with pnpm workspaces and Nx build orchestration. Users create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and chat with AI assistants. Deployed on Railway with Docker.

## Development Commands

```bash
# Root level
pnpm install              # Install all dependencies
pnpm dev                  # Start frontend + backend in parallel
pnpm build                # Build entire monorepo (Nx cached)
pnpm type-check           # Type check all packages
pnpm lint                 # Lint all packages

# Database
pnpm db:migrate           # Run migrations (auto-runs on backend startup too)
pnpm db:seed              # Seed initial data (26 predefined agents)

# Individual packages
cd backend && pnpm dev    # Backend only (port 3001)
cd frontend && pnpm dev   # Frontend only (port 3000, HMR on 3010)

# Testing (backend only — frontend has no tests yet)
cd backend && pnpm test                    # All tests (Jest, sequential, 30s timeout)
cd backend && pnpm test -- --testPathPattern="<pattern>"  # Run single test file
cd backend && pnpm run test:token-limits   # Standalone script (tsx, not Jest)
cd backend && pnpm run check:user <email>  # Debug a user's token limits

# i18n (frontend)
cd frontend && pnpm i18n:extract           # Extract keys from source
cd frontend && pnpm i18n:sync              # Sync across 20 languages
cd frontend && pnpm i18n:translate --key <OPENAI_KEY> --sync  # AI-translate missing

# Docker
pnpm docker:up            # Start postgres + redis + backend + frontend
pnpm docker:down          # Stop all containers
```

## Architecture

### Workspace Structure
```
├── backend/      Express API, PostgreSQL, Redis, Socket.io (port 3001)
├── frontend/     React 18 + Vite + TailwindCSS + Zustand (port 3000)
└── shared-types/ Shared TypeScript types (workspace dependency)
```

Both packages use `@/` path alias: backend maps to `backend/src/`, frontend maps to `frontend/src/`.

### Backend

**Entry point**: `backend/src/index.ts` — Express + HTTP + Socket.io server. Database connects *after* server starts listening (non-blocking health check at `/api/health`).

**Request flow**: Route → Auth middleware (JWT + Redis blacklist) → Joi validation → Handler → Error middleware

**Key services**:
- `aiService.ts` — `AIService` class with 6 methods: `chatWith{OpenAI|Anthropic|OpenRouter}()` × {sync, streaming}. Streaming uses `AsyncGenerator`. 3-minute timeout on AI requests.
- `tokenService.ts` — Per-model pricing lookup (`MODEL_PRICING`), idempotency keys (5 min TTL via Redis) to prevent duplicate token tracking.
- `socketHandler.ts` — Room-based Socket.io (join-project, new-message, typing-update).

**Models** use raw SQL queries against the pg Pool (no ORM). Each model file exports static methods (e.g., `User.findByEmail()`, `Thread.findByProjectId()`).

**Migrations** run inline in `database/connection.ts` → `runMigrations()` — not separate migration files. All table creation is in that function.

**Error handling**: Custom `AppError` class hierarchy in `utils/errors.ts` with `ErrorCode` enum. Key status codes: 401 (auth), 402 (token limit exceeded), 403 (forbidden), 429 (rate limited).

### TypeScript Strictness

Backend has `strict: false` — implicit `any` is allowed, unused variables don't error. Frontend has `strict: true` with `noUnusedLocals` and `noUnusedParameters`. Write backend code accordingly (don't assume strict null checks).

### Frontend

**API layer** (`src/lib/api.ts`): Singleton `ApiClient` with axios interceptors — auto-injects Bearer token, auto-refreshes on 401. Streaming chat uses native `fetch()` with SSE parsing (not axios).

**State management** (Zustand): `authStore` and `uiStore` are persisted to localStorage. Other stores (`projectStore`, `agentStore`, `chatStore`, `threadStore`, `fileStore`, `conversationStore`) are ephemeral.

**Routing** (`src/App.tsx`): `/` public landing, `/login` + `/register` in AuthLayout, `/dashboard` + `/projects/:projectId` + `/settings` + `/usage` in DashboardLayout, `/admin` admin-only.

**Internationalization**: 20 languages via i18next. Namespaces: common, auth, dashboard, chat, files, agents, admin, settings, errors, project, landing. `__MISSING__` sentinel marks untranslated keys.

**Types**: `TextFile` (not `File`) to avoid collision with browser native File API.

### Database Schema

Tables: `users`, `projects`, `agents` (global, not per-user), `conversations` (JSONB messages), `threads`, `files` (text in DB), `project_files` (binary on disk at `./uploads`), `token_usage`. All use UUID primary keys and auto-updated `updated_at` triggers.

Two distinct file systems:
1. **Text files** (`files` table) — content stored in DB, editable in Monaco Editor
2. **Uploaded files** (`project_files` table) — binary on disk, included in AI chat context

### Authentication Flow

JWT-based with refresh tokens. Backend checks tokens against a Redis blacklist on every request (`middleware/auth.ts`). Frontend interceptor catches 401, uses refresh token to get new access token, retries original request. Auto-logout on refresh failure.

### Token Limit System

- Global limit (default 1M) and monthly limit (default 100K) per user
- Admin-configurable via `PUT /api/admin/limits`
- Pre-validated client-side via `usageApi.getCurrentUsage()`
- Token tracking uses idempotency keys to prevent double-counting
- PostgreSQL `numeric` type returns strings via JSON — use `Number()` coercion in frontend formatters

### Observability

Three analytics systems (all optional, enabled by env vars):
- **Sentry**: Error tracking + APM (backend + frontend with source maps)
- **PostHog**: Product analytics and event tracking
- **Prometheus**: Custom metrics at `/metrics` endpoint

## Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgres://user:pass@localhost:5432/claude_projects
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
ADMIN_EMAIL=admin@example.com
CORS_ORIGIN=http://localhost:3000
ENABLE_SWAGGER=true
# Optional: SENTRY_DSN, POSTHOG_API_KEY, METRICS_ENABLED
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## API Documentation
Interactive Swagger docs at `/api-docs` when `ENABLE_SWAGGER=true`.
