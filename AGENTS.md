# AGENTS.md — AI Projects Platform

## Project Overview

Full-stack TypeScript monorepo (**bun** workspaces + Nx). Users create projects, manage AI agents (OpenAI/Anthropic/OpenRouter), upload files, and converse with AI assistants.

## Package Manager

**bun** — always use `bun` for install, run, and script execution. No `pnpm`, `npm`, or `yarn`.

## Workspace Layout

| Package | Stack | Port |
|---------|-------|------|
| `backend/` | Express + NestJS bridge, PostgreSQL, Redis, Socket.io | 3001 |
| `frontend/` | React 18, Vite, TailwindCSS, Zustand | 3000 |
| `mobile/` | Expo / React Native (standalone — not in Nx workspace) | — |
| `shared-types/` | Shared types & constants (workspace dep) | — |

> `mobile/` is an independent Expo project. It is **not** part of the bun/Nx workspace — manage it separately with `cd mobile && npx expo ...`.

## Development Commands

```bash
bun install && bun dev            # Install + start frontend & backend
bun run build                     # Build monorepo (Nx-cached)
bun run type-check && bun run lint  # Type-check + lint all packages
bun run db:migrate && bun run db:seed  # Database migrations + seed
cd backend && bun test            # Backend tests (Jest)
cd frontend && bun test           # Frontend tests (Vitest)
bun nx affected -t build          # Build only affected packages
bun nx graph                      # Visual dependency graph
```

## Rules

Domain-specific rules live in `.claude/rules/` — auto-applied by file glob:

| Rule | Scope | Covers |
|------|-------|--------|
| `architecture.md` | All files | Workspace boundaries, file systems, token limits |
| `backend.md` | `backend/**` | NestJS, path aliases, AI service, Socket.io, database |
| `frontend.md` | `frontend/**` | API client, Zustand stores, auth, components |
| `code-style.md` | All files | Language, file size, clean code conventions |
| `environment.md` | `.env*`, docker-compose | Env vars and secrets management |
| `error-handling.md` | `backend/**`, `frontend/**` | HTTP status codes, error response shape |
| `testing.md` | Test files | Test structure and conventions |
