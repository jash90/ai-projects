---
description: "Monorepo workspace boundaries and shared-types contract — applies to all files"
alwaysApply: true
---

# Architecture

## Workspace Boundaries

- `backend/`, `frontend/`, `mobile/`, `shared-types/` are independent pnpm workspace packages.
- Never import directly between `backend/` and `frontend/`. Shared types go through `shared-types/`.
- Never duplicate a type that already exists in `shared-types/` — always import from there.
- `shared-types/` must contain only pure type definitions — no runtime code, no side effects, no imports from other packages.

## Two File Systems

The platform has two distinct file storage mechanisms — never confuse them:

1. **Project files** (`files` table): Text content in DB, editable in Monaco Editor, managed via `filesApi`.
2. **Uploaded files** (`project_files` table): Binary files on disk, included as AI agent context, managed via `uploadedFilesApi`.

## Token Limit System

- Global and monthly token limits per user, admin-configurable via `/api/admin/limits`.
- Client-side pre-validation in `usageApi.getCurrentUsage()`.
- Always check limits before making AI API calls.
