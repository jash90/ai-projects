---
description: "Frontend patterns — API client, Zustand state management, auth tokens, component conventions"
globs: ["frontend/**/*"]
---

# Frontend

## API Client

All backend calls go through typed modules in `frontend/src/lib/api.ts`:

`authApi`, `projectsApi`, `agentsApi`, `chatApi`, `filesApi`, `uploadedFilesApi`, `conversationsApi`, `adminApi`, `usageApi`.

- Never call `fetch` or `axios` directly — always use the typed API modules.
- Add new endpoints to the appropriate module in `api.ts`.

## State Management (Zustand)

Stores in `frontend/src/stores/`:

| Store | Persisted |
|-------|-----------|
| `authStore.ts` — authentication & tokens | Yes (localStorage) |
| `projectStore.ts` — project management | No |
| `agentStore.ts` — AI agents | No |
| `conversationStore.ts` — conversations | No |
| `fileStore.ts` — file management | No |
| `uiStore.ts` — theme/UI | Yes (localStorage) |

## Auth Tokens

- Current tokens: `auth-storage.state.tokens.access_token` (Zustand persisted, HS256).
- Legacy tokens may exist at `localStorage.accessToken` (old RS256 system) — ignore them.
- Clear both locations on logout.

## Components

- Place in `frontend/src/components/`, organized by feature.
- Use TailwindCSS utility classes — avoid custom CSS.
- Extract reusable logic into hooks (`frontend/src/hooks/`).
- Pages in `frontend/src/pages/` — one file per route.
- Clean up Socket.io listeners in `useEffect` cleanup functions.

## Environment Variables

All frontend env vars must use `VITE_` prefix. Access via `import.meta.env.VITE_*` — never use `process.env`.
