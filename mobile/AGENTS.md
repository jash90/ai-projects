# AGENTS.md — Mobile
<!-- Scope: mobile/ package. Source: .claude/rules/architecture.md, git history -->

## Architecture

Expo / React Native app consuming the same backend API as the frontend.

- Uses Expo Router for navigation.
- API client generated via Orval from `mobile/openapi.json`.
- Orval config: `mobile/orval.config.ts`.

## Conventions

- Always use the generated API client from `mobile/src/api/`. Never call `fetch` directly.
- Place shared providers in `mobile/src/providers/`.
- Place shared utilities in `mobile/src/lib/`.
- Expo config plugins go in `mobile/plugins/`.
- Always test on both iOS and Android before considering a mobile change complete.

## Workspace Boundaries

- This is an independent pnpm workspace package.
- Never import directly from `backend/` or `frontend/`.
- Shared types must come from `shared-types/` — never duplicate types locally.

## Known Issues

- Duplicate file names in chat messages — fixed in commit `2b583ff`.
- Orval `customInstance` path params require split imports by tag — see commit `3a81853`.
- Expo Config Plugin needed for Xcode 26 fmt fix — see commit `39af511`.
