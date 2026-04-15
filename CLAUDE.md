# CLAUDE.md

AI Projects Platform — full-stack TypeScript monorepo (**bun** workspaces + Nx).
Users create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and converse with AI.

## Commands

```bash
bun install && bun dev                # Install + start frontend (3000) & backend (3001)
bun run build                         # Build monorepo (Nx-cached)
bun run type-check && bun run lint    # Type-check + lint all packages
bun run db:migrate && bun run db:seed # Database migrations + seed
cd backend && bun test                # Backend tests
cd frontend && bun test               # Frontend tests
bun nx affected -t build              # Build only affected packages
```

## Workspace Layout

| Package | Stack | Port |
|---------|-------|------|
| `backend/` | Express + NestJS bridge, PostgreSQL, Redis, Socket.io | 3001 |
| `frontend/` | React 18, Vite, TailwindCSS, Zustand | 3000 |
| `mobile/` | Expo / React Native (standalone) | — |
| `shared-types/` | Shared types & constants (workspace dep) | — |

## Rules

Domain-specific guidance lives in `.claude/rules/` (SOLID — one file per concern).
Glob-scoped rules activate automatically when editing matching files.
See `AGENTS.md` for full rule index.
