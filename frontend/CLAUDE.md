# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See also: [Root CLAUDE.md](../CLAUDE.md) for full-stack context and backend details.

## Development Commands

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # TypeScript check + Vite build
pnpm type-check       # TypeScript only (no emit)
pnpm lint             # ESLint with strict warnings

# i18n Commands
pnpm i18n:extract     # Extract translation keys from source
pnpm i18n:sync        # Sync keys across all 20 languages
pnpm i18n:translate --key <OPENAI_KEY> --sync  # AI-translate missing keys
```

## Architecture

### Path Aliases
Uses `@/` prefix for imports from `src/`:
```typescript
import { authApi } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
```

### API Layer (`src/lib/api.ts`)
Singleton `ApiClient` class with axios interceptors for auth token injection and automatic refresh. All API modules are typed and exported:
- `authApi`, `projectsApi`, `agentsApi`, `chatApi`, `filesApi`
- `uploadedFilesApi`, `conversationsApi`, `threadsApi`
- `adminApi`, `usageApi`, `modelsApi`, `settingsApi`

Streaming chat uses native `fetch()` with SSE parsing, not axios.

### State Management (Zustand)
Stores in `src/stores/`:
- `authStore.ts` - Auth state (persisted to localStorage)
- `uiStore.ts` - Theme/UI preferences (persisted)
- `projectStore.ts`, `agentStore.ts`, `fileStore.ts` - Domain data
- `chatStore.ts`, `conversationStore.ts`, `threadStore.ts` - Chat state
- `adminStore.ts` - Admin panel state

Pattern for consuming stores:
```typescript
// Hook export for components
export const useAuth = () => authStore();
// Direct access for services
authStore.getState().logout();
```

### Routing (`src/App.tsx`)
- `/` - Landing page (public)
- `/login`, `/register` - Auth pages wrapped in `AuthLayout`
- `/dashboard`, `/projects/:projectId`, `/settings`, `/usage` - Protected, wrapped in `DashboardLayout`
- `/admin` - Admin-only route (role-gated)

### Real-time (`src/hooks/useSocket.ts`)
Socket.io connection with auto-reconnect. Events:
- `join-project`, `leave-project` - Room management
- `new-message`, `typing-update` - Chat updates
- Auto-joins project when `projectId` prop provided

### Internationalization
20 European languages with i18next. Namespaces: common, auth, dashboard, chat, files, agents, admin, settings, errors, project, landing.

Translation workflow:
1. `pnpm i18n:extract` - Extract keys from `src/**/*.{ts,tsx}`
2. `pnpm i18n:sync` - Sync structure across all locales
3. `pnpm i18n:translate --key <KEY> --sync` - AI-translate `__MISSING__` values

Config in `i18next.config.mjs`, runtime init in `src/lib/i18n.ts`.

### Build Optimization
Vite chunking in `vite.config.ts`:
- `vendor`: react, react-dom
- `router`: react-router-dom
- `ui`: @headlessui/react, framer-motion
- `utils`: axios, zustand, @tanstack/react-query
- `analytics`: @sentry/react, posthog-js

### Dev Server Proxy
Vite proxies `/api/*` → `http://localhost:3001` and `/socket.io` → WebSocket in dev mode (`vite.config.ts`). No need to configure CORS locally.

## Key Patterns

### Types (`src/types/index.ts`)
All shared types exported from single file. Note: `TextFile` used instead of `File` to avoid collision with browser's native File API.

### File Systems
Two distinct systems - see root CLAUDE.md for details:
1. **Text files** (`filesApi`): Stored in DB, editable in Monaco
2. **Uploaded files** (`uploadedFilesApi`): Binary on disk, included in AI context

### Chat Attachments
Constants in `src/types/index.ts`:
- `SUPPORTED_CHAT_FILE_TYPES`: images (png, jpeg, gif, webp) + PDF
- `MAX_CHAT_FILE_SIZE`: 20MB
- `MAX_CHAT_FILES_COUNT`: 5 per message
