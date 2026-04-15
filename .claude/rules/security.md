---
description: "Security patterns — auth, JWT, CORS, rate limiting, input validation"
globs: ["backend/src/auth/**/*", "backend/src/middleware/**/*", "backend/src/**/*guard*", "backend/src/**/*intercept*"]
---

# Security

## Authentication

- JWT-based auth with `passport-jwt` strategy.
- Tokens: HS256, stored in Zustand persisted state (`auth-storage.state.tokens.access_token`).
- Legacy tokens at `localStorage.accessToken` (RS256) — ignore, clear on logout.
- Always clear both token locations on logout.

## API Protection

- Use NestJS guards for route protection (`@UseGuards(AuthGuard)`).
- Rate limiting via `@nestjs/throttler` — configure limits per route when needed.
- Helmet middleware for HTTP security headers.

## Input Validation

- Validate all input at the API boundary using `class-validator` decorators.
- Use DTOs for request bodies — never accept raw `any` types.
- Sanitize file uploads — check `ALLOWED_FILE_TYPES` and `MAX_FILE_SIZE`.

## CORS

- Configure via `CORS_ORIGIN` env var.
- Never use `*` in production.

## Token Limits

- Global and monthly token limits per user, admin-configurable via `/api/admin/limits`.
- Client-side pre-validation in `usageApi.getCurrentUsage()`.
- Always check limits before making AI API calls.
