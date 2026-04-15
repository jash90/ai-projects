---
description: "Database conventions — migrations, schema, and query patterns"
globs: ["backend/src/database/**/*", "backend/src/**/*migration*", "backend/drizzle/**/*"]
---

# Database

## Conventions

- Always use migrations (`bun run db:migrate`), never modify schema manually.
- Migration files are in `backend/src/database/migrations/` — sequential, timestamped.
- Seed data in `backend/src/database/seed.ts`.
- Tables: `users`, `projects`, `agents`, `conversations` (JSONB messages), `files`, `project_files`, `token_usage`.

## Query Patterns

- Always validate input at the API boundary before database operations.
- Use parameterized queries — never interpolate user input into SQL.
- Use transactions for operations that touch multiple tables.

## Two File Systems

1. **Project files** (`files` table): Text content in DB, editable in Monaco Editor, managed via `filesApi`.
2. **Uploaded files** (`project_files` table): Binary files on disk, included as AI agent context, managed via `uploadedFilesApi`.
