---
description: "Backend patterns — Express+NestJS bridge, path aliases, AI service, Socket.io, database"
globs: ["backend/**/*"]
---

# Backend

## Express + NestJS Bridge

- Entry point: `backend/src/index.ts` (Express bootstraps NestJS).
- NestJS standalone: `backend/src/nest/main.ts`.
- Bridge: `backend/src/nest/bridge.ts`.
- Config: `backend/src/nest/config/*.config.ts` (use `registerAs` namespaces).

### CRITICAL: NestJS + tsx/esbuild

Never use `tsx` (esbuild-based) to run NestJS. It does NOT support `emitDecoratorMetadata` — DI fails silently.

- Always use `ts-node --transpile-only` (or `bun` for non-NestJS scripts).
- Always add `import 'reflect-metadata'` at the top of entry files.
- Check `backend/nodemon.json` `exec` field when debugging startup issues.

### CRITICAL: Middleware Ordering

Express middleware registered BEFORE `bootstrapNestApp()` intercepts requests before NestJS routes.

- Never register `notFoundHandler` or `app.use('*', ...)` before NestJS bootstrap.
- Always pass `bodyParser: false` to `NestFactory.create()` when Express already has body parsers.

## Path Aliases

Use `@/` for imports from `backend/src/`. Never use relative paths more than two levels up (`../../../`).

```typescript
import { aiService } from '@/services/aiService';
```

## AI Service

`backend/src/services/aiService.ts` — multi-provider (OpenAI, Anthropic, OpenRouter):

- `AIService.chat()` routes to the correct provider.
- Streaming uses `AsyncGenerator` — always handle cleanup on client disconnect.
- 29 AI agents seeded, 3 providers configured.

## Real-time

Socket.io with room-based project collaboration. Always scope events to project rooms — never broadcast globally.

## Database Tables

`users`, `projects`, `agents`, `conversations` (JSONB messages), `files`, `project_files`, `token_usage`.

- Always use migrations (`bun run db:migrate`), never modify schema manually.
- Always validate input at the API boundary before database operations.
