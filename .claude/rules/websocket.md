---
description: "WebSocket/Socket.io conventions — rooms, events, real-time patterns"
globs: ["backend/src/websocket/**/*", "backend/src/**/*socket*", "frontend/src/**/*socket*", "frontend/src/hooks/useSocket*"]
---

# WebSocket

## Backend (Socket.io)

- Socket.io server configured in `backend/src/websocket/`.
- Always scope events to **project rooms** — never broadcast globally.
- Use `socket.join(projectId)` / `socket.leave(projectId)` for room management.
- Validate authentication on socket connection (JWT handshake).

## Frontend

- Socket.io client hooks in `frontend/src/hooks/`.
- Always clean up listeners in `useEffect` cleanup functions to prevent memory leaks.
- Reconnect logic should be handled by the socket client configuration.

## Event Naming

- Use `namespace:action` format: `project:updated`, `chat:message`, `file:changed`.
- Keep event payloads typed — share types via `shared-types/`.
