# AGENTS.md — Frontend
<!-- Scope: frontend/ package. Source: .claude/rules/frontend.md, frontend/CLAUDE.md -->

## Architecture

React 18 + Vite + TailwindCSS + Zustand. Dev server on port 3000.

## Commands

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # TypeScript check + Vite build
pnpm type-check       # TypeScript only (no emit)
pnpm lint             # ESLint with strict warnings

# i18n
pnpm i18n:extract     # Extract translation keys from source
pnpm i18n:sync        # Sync keys across all 20 languages
pnpm i18n:translate --key <OPENAI_KEY> --sync  # AI-translate missing keys
```

## Path Aliases

Use `@/` prefix for imports from `src/`:

```typescript
import { authApi } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
```

## API Client

Singleton `ApiClient` class with axios interceptors for auth token injection and automatic refresh. All backend calls go through typed modules in `frontend/src/lib/api.ts`:

| Module | Domain |
|--------|--------|
| `authApi` | Authentication |
| `projectsApi` | Project CRUD |
| `agentsApi` | AI agent management |
| `chatApi` | AI chat (including streaming) |
| `filesApi` | Project files (text-based, editing) |
| `uploadedFilesApi` | Uploaded files (binary, agent context) |
| `conversationsApi` | Chat history |
| `threadsApi` | Thread management |
| `adminApi` | Admin panel operations |
| `usageApi` | Token usage tracking |
| `modelsApi` | AI model configuration |
| `settingsApi` | User settings |

- Never call `fetch` or `axios` directly — always use the typed API modules.
- Exception: streaming chat uses native `fetch()` with SSE parsing, not axios.
- Add new endpoints to the appropriate module in `api.ts`.

## State Management (Zustand)

Stores in `frontend/src/stores/`:

| Store | Persisted |
|-------|-----------|
| `authStore.ts` — authentication & tokens | Yes (localStorage) |
| `projectStore.ts` — project management | No |
| `agentStore.ts` — AI agents | No |
| `conversationStore.ts` — conversations | No |
| `chatStore.ts` — chat state | No |
| `threadStore.ts` — thread state | No |
| `fileStore.ts` — file management | No |
| `uiStore.ts` — theme/UI | Yes (localStorage) |

Store consumption pattern:

```typescript
// Hook export for components
export const useAuth = () => authStore();
// Direct access for services
authStore.getState().logout();
```

## Auth Tokens

- Current tokens: `auth-storage.state.tokens.access_token` (Zustand persisted, HS256).
- Legacy tokens may exist at `localStorage.accessToken` (old RS256 system) — ignore them.
- Clear both locations on logout.

## Routing (`src/App.tsx`)

| Path | Access | Layout |
|------|--------|--------|
| `/` | Public | Landing page |
| `/login`, `/register` | Public | `AuthLayout` |
| `/dashboard`, `/projects/:projectId`, `/settings`, `/usage` | Protected | `DashboardLayout` |
| `/admin` | Admin-only | Role-gated |

## Components

- Place in `frontend/src/components/`, organized by feature.
- Use TailwindCSS utility classes — avoid custom CSS.
- Extract reusable logic into hooks (`frontend/src/hooks/`).
- Pages in `frontend/src/pages/` — one file per route.
- Clean up Socket.io listeners in `useEffect` cleanup functions.

## Real-time (`src/hooks/useSocket.ts`)

Socket.io with auto-reconnect. Events: `join-project`, `leave-project`, `new-message`, `typing-update`. Auto-joins project when `projectId` prop provided.

## Internationalization

20 European languages with i18next. Namespaces: common, auth, dashboard, chat, files, agents, admin, settings, errors, project, landing.

Translation workflow:
1. `pnpm i18n:extract` — Extract keys from `src/**/*.{ts,tsx}`.
2. `pnpm i18n:sync` — Sync structure across all locales.
3. `pnpm i18n:translate --key <KEY> --sync` — AI-translate `__MISSING__` values.

Config in `i18next.config.mjs`, runtime init in `src/lib/i18n.ts`.

## Build Optimization

Vite chunking in `vite.config.ts`:
- `vendor`: react, react-dom
- `router`: react-router-dom
- `ui`: @headlessui/react, framer-motion
- `utils`: axios, zustand, @tanstack/react-query

## Types (`src/types/index.ts`)

All shared types exported from single file. Note: `TextFile` used instead of `File` to avoid collision with browser's native File API.

### Chat Attachments

Constants in `src/types/index.ts`:
- `SUPPORTED_CHAT_FILE_TYPES`: images (png, jpeg, gif, webp) + PDF.
- `MAX_CHAT_FILE_SIZE`: 20MB.
- `MAX_CHAT_FILES_COUNT`: 5 per message.

## Environment Variables

All frontend env vars must use `VITE_` prefix. Access via `import.meta.env.VITE_*` — never use `process.env`.
