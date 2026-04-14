# AGENTS.md — AI Projects Platform
<!-- Scope: entire monorepo (global rules). Source: CLAUDE.md, .claude/rules/architecture.md, .claude/rules/code-style.md, .claude/rules/environment.md -->

## Project Overview

Full-stack TypeScript monorepo (pnpm workspaces + Nx). Users create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and converse with AI assistants.

## Workspace Layout

```
project-root/
├── backend/       # Express + NestJS bridge, PostgreSQL, Redis, Socket.io (port 3001)
├── frontend/      # React 18, Vite, TailwindCSS, Zustand (port 3000)
├── mobile/        # Expo / React Native
├── shared-types/  # Pure TypeScript types (workspace dependency)
├── scripts/       # Utility scripts
├── k8s/           # Kubernetes manifests
├── monitoring/    # Grafana + Prometheus configs
└── docs/          # Project documentation
```

## Development Commands

```bash
pnpm install && pnpm dev          # Install + start frontend (3000) & backend (3001)
pnpm build                        # Build monorepo (Nx-cached)
pnpm type-check && pnpm lint      # Type-check + lint all packages
pnpm db:migrate && pnpm db:seed   # Database migrations + seed
cd backend && pnpm test           # Backend tests
pnpm exec nx affected -t build    # Build only affected packages
pnpm exec nx graph                # Visual dependency graph
```

## Workspace Boundaries

- `backend/`, `frontend/`, `mobile/`, `shared-types/` are independent pnpm workspace packages.
- Never import directly between `backend/` and `frontend/`. Shared types go through `shared-types/`.
- Never duplicate a type that already exists in `shared-types/` — always import from there.
- `shared-types/` must contain only pure type definitions — no runtime code, no side effects, no imports from other packages.

## Code Style

- Always respond and comment in English.
- Use TypeScript for all source code across all packages.
- Keep files under 500 lines. Split when approaching the limit.
- Never hardcode secrets or credentials — always use environment variables.
- Prefer editing existing files over creating new ones.
- Never create documentation files (*.md) unless explicitly requested.
- Never save working files, text files, or tests to the repository root — use appropriate subdirectories.

## Two File Systems

The platform has two distinct file storage mechanisms — never confuse them:

1. **Project files** (`files` table): Text content in DB, editable in Monaco Editor, managed via `filesApi`.
2. **Uploaded files** (`project_files` table): Binary files on disk, included as AI agent context, managed via `uploadedFilesApi`.

## Token Limit System

- Global and monthly token limits per user, admin-configurable via `/api/admin/limits`.
- Client-side pre-validation in `usageApi.getCurrentUsage()`.
- Always check limits before making AI API calls.

## Error Handling

Use these HTTP status codes consistently across all API endpoints:

| Code | Meaning |
|------|---------|
| `401` | Unauthorized (missing or invalid auth) |
| `402` | Token limits exceeded |
| `403` | Forbidden (insufficient permissions) |
| `429` | Rate limited |

Always return: `{ error: string, statusCode: number }`. Log errors with context (user ID, request ID, endpoint).

## Environment Variables

- Never commit `.env` files. Use `env.example` as the template.
- Never hardcode secrets in source code.
- Swagger docs available at `/api-docs` when `ENABLE_SWAGGER=true`.

### Backend (`backend/.env`)

Required: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `CORS_ORIGIN`, `ENABLE_SWAGGER`.

### Frontend (`frontend/.env`)

Required: `VITE_API_URL`, `VITE_WS_URL`.

All frontend env vars must use `VITE_` prefix. Access via `import.meta.env.VITE_*` — never use `process.env`.
