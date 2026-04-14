# AGENTS.md — Backend
<!-- Scope: backend/ package. Source: .claude/rules/backend.md, .claude/rules/error-handling.md -->

## Architecture

Express + NestJS bridge pattern:

- **Entry point**: `backend/src/index.ts` (Express bootstraps NestJS).
- **NestJS standalone**: `backend/src/nest/main.ts`.
- **Bridge**: `backend/src/nest/bridge.ts`.
- **Config**: `backend/src/nest/config/*.config.ts` (use `registerAs` namespaces).

### CRITICAL: NestJS + tsx/esbuild Incompatibility

Never use `tsx` (esbuild-based) to run NestJS. It does NOT support `emitDecoratorMetadata` — DI fails silently.

- Always use `ts-node --transpile-only`.
- Always add `import 'reflect-metadata'` at the top of entry files.
- Check `backend/nodemon.json` `exec` field when debugging startup issues.

### CRITICAL: Express Bridge Middleware Ordering

Express middleware registered BEFORE `bootstrapNestApp()` intercepts requests before NestJS routes.

- Never register `notFoundHandler` or catch-all `app.use('*', ...)` before NestJS bootstrap — NestJS handles 404s via `AllExceptionsFilter`.
- Always pass `bodyParser: false` to `NestFactory.create()` when Express already has body parsers — prevents the `'app.router' is deprecated!` error.

## Path Aliases

Use `@/` for imports from `backend/src/`. Never use relative paths more than two levels up (`../../../`).

```typescript
import { aiService } from '@/services/aiService';
```

## AI Service

`backend/src/services/aiService.ts` — multi-provider (OpenAI, Anthropic, OpenRouter):

- `AIService.chat()` routes to the correct provider.
- Provider methods: `chatWithOpenAI()`, `chatWithAnthropic()`, `chatWithOpenRouter()`.
- Streaming variants: `streamChatWithOpenAI()`, `streamChatWithAnthropic()`, `streamChatWithOpenRouter()`.
- Streaming uses `AsyncGenerator` — always handle cleanup on client disconnect.
- 29 AI agents seeded, 3 providers configured.

## Real-time

Socket.io with room-based project collaboration. Always scope events to project rooms — never broadcast globally.

## Database

Tables: `users`, `projects`, `agents`, `conversations` (JSONB messages), `files`, `project_files`, `token_usage`.

- Always use migrations (`pnpm db:migrate`), never modify schema manually.
- Use JSONB for flexible data structures (e.g., conversation messages).
- Always validate input at the API boundary before database operations.

## Error Handling

- Use NestJS `AllExceptionsFilter` for global error handling.
- Return consistent error shapes: `{ error: string, statusCode: number }`.
- Log errors with context (user ID, request ID, endpoint).

## Testing

Tests in `backend/src/__tests__/` — see `backend/src/__tests__/AGENTS.md` for structure and conventions.

```bash
pnpm test                   # All backend tests
pnpm run test:token-limits  # Token limit enforcement
pnpm run check:user <email> # Debug specific user
```
