# AGENTS.md — Global Project Rules
<!-- Scope: Entire monorepo. Source: CLAUDE.md, project memory. -->
<!-- This file is the universal agent configuration for all AI coding agents. -->

## Project Overview

AI Projects Platform — a full-stack TypeScript monorepo using pnpm workspaces and Nx build orchestration. Users create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and converse with AI assistants.

## Workspace Structure

```
project-root/
├── backend/       # Express + NestJS bridge API, PostgreSQL, Redis, Socket.io (port 3001)
├── frontend/      # React 18 + Vite + TailwindCSS + Zustand (port 3000)
├── mobile/        # Expo/React Native mobile app
├── shared-types/  # Shared TypeScript types (workspace dependency)
├── scripts/       # Utility scripts
├── k8s/           # Kubernetes manifests
├── monitoring/    # Grafana + Prometheus configs
└── docs/          # Project documentation
```

## Development Commands

```bash
# Root — full monorepo
pnpm install              # Install all dependencies
pnpm dev                  # Start frontend + backend in parallel
pnpm build                # Build entire monorepo with Nx caching
pnpm type-check           # Type check all packages
pnpm lint                 # Lint all packages

# Database
pnpm db:migrate           # Run database migrations
pnpm db:seed              # Seed initial data

# Individual packages
cd backend && pnpm dev    # Backend only (port 3001)
cd frontend && pnpm dev   # Frontend only (port 3000)

# Testing
cd backend && pnpm test                   # Run all backend tests
cd backend && pnpm run test:token-limits  # Test token limit enforcement
cd backend && pnpm run check:user <email> # Debug specific user account

# Nx
pnpm exec nx graph                  # Visual dependency graph
pnpm exec nx affected -t build      # Build only affected projects
```

## Language & Style

- Always respond and comment in English.
- Use TypeScript for all source code across all packages.
- Keep files under 500 lines. Split when a file grows beyond that.
- Never hardcode secrets or credentials. Always use environment variables.
- Prefer editing existing files over creating new ones.
- Never create documentation files (*.md) unless explicitly requested.
- Never save working files, text files, or tests to the root folder. Use appropriate subdirectories.

## Architecture Principles

- **Monorepo**: pnpm workspaces + Nx caching. Always respect workspace boundaries.
- **Shared types**: Import shared types from the `shared-types` package, never duplicate type definitions across packages.
- **Clean separation**: Backend handles business logic, data access, and AI integration. Frontend handles UI, state, and user interaction. Mobile is a separate Expo app consuming the same backend API.

## Error Handling Conventions

Use these HTTP status codes consistently across all API endpoints:
- `401` — Unauthorized (missing or invalid auth)
- `402` — Token limits exceeded
- `403` — Forbidden (insufficient permissions)
- `429` — Rate limited

## Two File Systems

The platform has two distinct file storage mechanisms. Never confuse them:

1. **Project files** (`files` table): Text content stored in the database, editable in Monaco Editor. Managed via `filesApi`.
2. **Uploaded files** (`project_files` table): Binary files stored on disk, included as AI agent context. Managed via `uploadedFilesApi`.

## Token Limit System

- Global and monthly token limits per user.
- Admin-configurable via `/api/admin/limits`.
- Client-side pre-validation in `usageApi.getCurrentUsage()`.
- Always check limits before making AI API calls.

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL, REDIS_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY,
OPENROUTER_API_KEY, JWT_SECRET, ADMIN_EMAIL, CORS_ORIGIN, ENABLE_SWAGGER
```

### Frontend (`frontend/.env`)
```
VITE_API_URL, VITE_WS_URL
```

Never commit `.env` files. Use `env.example` as the template.

## API Documentation

Interactive Swagger docs at `/api-docs` when `ENABLE_SWAGGER=true`.
