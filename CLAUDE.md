# CLAUDE.md

AI Projects Platform — full-stack TypeScript monorepo (pnpm workspaces + Nx).
Users create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and converse with AI.

## Commands

```bash
pnpm install && pnpm dev          # Install + start frontend (3000) & backend (3001)
pnpm build                        # Build monorepo (Nx-cached)
pnpm type-check && pnpm lint      # Type-check + lint all packages
pnpm db:migrate && pnpm db:seed   # Database migrations + seed
cd backend && pnpm test           # Backend tests
pnpm exec nx affected -t build    # Build only affected packages
```

## Workspace Layout

| Package | Stack | Port |
|---------|-------|------|
| `backend/` | Express + NestJS bridge, PostgreSQL, Redis, Socket.io | 3001 |
| `frontend/` | React 18, Vite, TailwindCSS, Zustand | 3000 |
| `mobile/` | Expo / React Native | — |
| `shared-types/` | Pure TypeScript types (workspace dep) | — |

## Rules

Domain-specific guidance lives in `.claude/rules/` (SOLID — one file per concern).
Glob-scoped rules activate automatically when editing matching files.
