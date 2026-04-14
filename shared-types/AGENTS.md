# AGENTS.md — Shared Types Rules
<!-- Scope: shared-types/ package. Source: CLAUDE.md architecture section. -->

## Purpose

This package contains TypeScript type definitions shared between backend, frontend, and mobile packages. It is a workspace dependency consumed by all other packages.

## Conventions

- Never duplicate types that exist here in another package. Always import from `shared-types`.
- Keep types pure — no runtime code, no side effects, no imports from other workspace packages.
- Export all public types from the package entry point.
- When adding a new entity type (e.g., a new database table), define its type here first, then use it in backend and frontend.
- Keep types in sync with database schema. If a migration changes a table, update the corresponding type here.
