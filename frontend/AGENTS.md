# AGENTS.md — Frontend Rules
<!-- Scope: frontend/ package. Source: CLAUDE.md, project memory (auth token patterns). -->

## Architecture

React 18 + Vite + TailwindCSS + Zustand.

- Dev server runs on port 3000.
- All API calls go through `frontend/src/lib/api.ts`.
- State management uses Zustand stores in `frontend/src/stores/`.
- Real-time communication via Socket.io (`useSocket` hook).

## API Client Pattern

All backend communication goes through typed API modules in `frontend/src/lib/api.ts`:

| Module              | Domain                                |
|---------------------|---------------------------------------|
| `authApi`           | Authentication                        |
| `projectsApi`       | Project CRUD                          |
| `agentsApi`         | AI agent management                   |
| `chatApi`           | AI chat (including streaming)         |
| `filesApi`          | Project files (text-based, editing)   |
| `uploadedFilesApi`  | Uploaded files (binary, agent context)|
| `conversationsApi`  | Chat history                          |
| `adminApi`          | Admin panel operations                |
| `usageApi`          | Token usage tracking                  |

- Always use these typed modules. Never call `fetch` or `axios` directly.
- Always add new API endpoints to the appropriate module in `api.ts`.

## State Management (Zustand)

Stores in `frontend/src/stores/`:

| Store                  | Responsibility                     | Persisted |
|------------------------|------------------------------------|-----------|
| `authStore.ts`         | Authentication & tokens            | Yes (localStorage) |
| `projectStore.ts`      | Project management                 | No        |
| `agentStore.ts`        | AI agents                          | No        |
| `conversationStore.ts` | Chat conversations                 | No        |
| `fileStore.ts`         | File management                    | No        |
| `uiStore.ts`           | Theme/UI preferences               | Yes (localStorage) |

### Auth Token Storage

- Tokens are stored in Zustand persisted store: `auth-storage.state.tokens.access_token`.
- Stale tokens from a previous auth system (RS256) may exist in `localStorage.accessToken` — the current NestJS backend uses HS256. Ignore legacy keys.
- Always clear both old and new token locations on logout.

## Component Guidelines

- Place components in `frontend/src/components/`, organized by feature or domain.
- Use TailwindCSS for styling. Prefer utility classes over custom CSS.
- Keep components focused — one responsibility per component.
- Extract reusable logic into hooks in `frontend/src/hooks/`.
- Pages go in `frontend/src/pages/`, one file per route.

## Real-time Communication

```typescript
// useSocket hook manages the connection lifecycle
socket.emit('join-project', { projectId });
socket.on('new-message', handleMessage);
```

Always clean up socket listeners in `useEffect` cleanup functions.

## Environment Variables

All frontend env vars must be prefixed with `VITE_`:

```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Access via `import.meta.env.VITE_*`. Never use `process.env` in frontend code.
