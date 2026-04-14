# AGENTS.md — Backend Rules
<!-- Scope: backend/ package. Source: CLAUDE.md, project memory (critical NestJS patterns). -->

## Architecture

This backend uses an **Express + NestJS bridge pattern**:

- **Entry point**: `backend/src/index.ts` (Express app bootstraps NestJS)
- **NestJS standalone**: `backend/src/nest/main.ts`
- **Bridge module**: `backend/src/nest/bridge.ts`
- **Config files**: `backend/src/nest/config/*.config.ts` (use `registerAs` namespaces)

### CRITICAL: NestJS + tsx/esbuild Incompatibility

Never use `tsx` (esbuild-based) to run NestJS code. `tsx` does NOT support `emitDecoratorMetadata`, causing NestJS dependency injection to fail silently.

- Always use `ts-node --transpile-only` instead of `tsx` for NestJS apps.
- Always add `import 'reflect-metadata'` at the top of entry files.
- Check `backend/nodemon.json` `exec` field when debugging startup issues.

### CRITICAL: Express Bridge Middleware Ordering

When using NestJS `ExpressAdapter`, Express middleware registered BEFORE `bootstrapNestApp()` intercepts requests before NestJS routes can handle them.

- Never register `notFoundHandler` or catch-all `app.use('*', ...)` before NestJS bootstrap — NestJS handles 404s via `AllExceptionsFilter`.
- Always pass `bodyParser: false` to `NestFactory.create()` when Express already has body parsers — prevents the `'app.router' is deprecated!` error.

## Path Aliases

Use `@/` prefix for all imports from `backend/src/`:

```typescript
import { aiService } from '@/services/aiService';
import { User } from '@/types';
```

Never use relative paths that go more than two levels up (e.g., `../../../`).

## AI Service Architecture

`backend/src/services/aiService.ts` — Multi-provider AI integration:

- `AIService.chat()` is the main entry point; it routes to the correct provider.
- Provider methods: `chatWithOpenAI()`, `chatWithAnthropic()`, `chatWithOpenRouter()`
- Streaming variants: `streamChatWithOpenAI()`, `streamChatWithAnthropic()`, `streamChatWithOpenRouter()`
- Streaming uses `AsyncGenerator` — always handle generator cleanup on client disconnect.
- 3 AI providers are configured: OpenAI, Anthropic, OpenRouter.
- 29 AI agents are seeded in the database.

## Database

### Tables
- `users` — Accounts with roles and token limits
- `projects` — User projects
- `agents` — AI agent configurations (provider, model, system prompt)
- `conversations` — Chat history with JSONB messages
- `files` — Text-based project files (editable in Monaco Editor)
- `project_files` — Uploaded binary files (included in AI context)
- `token_usage` — API usage tracking with costs

### Conventions
- Always use database migrations (`pnpm db:migrate`), never modify schema manually.
- Use JSONB for flexible data structures (e.g., conversation messages).
- Always validate input at the API boundary before database operations.

## Real-time Communication

Socket.io with room-based project collaboration:

```typescript
socket.emit('join-project', { projectId });
socket.on('new-message', handleMessage);
```

Always scope socket events to project rooms. Never broadcast globally.

## Testing

Tests live in `backend/src/__tests__/` organized by domain:

```
__tests__/
├── core/          # Core business logic tests
├── integration/   # Integration tests
├── middleware/     # Middleware tests
├── models/        # Model tests
├── routes/        # Route/controller tests
├── services/      # Service tests
├── setup.ts       # Test setup/teardown
└── utils/         # Utility tests
```

- Run all tests: `pnpm test`
- Test token limits: `pnpm run test:token-limits`
- Debug user: `pnpm run check:user <email>`

## Error Handling

- Use NestJS `AllExceptionsFilter` for global error handling.
- Return consistent error shapes: `{ error: string, statusCode: number }`.
- Log errors with context (user ID, request ID, endpoint).
