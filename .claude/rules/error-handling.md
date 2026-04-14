---
description: "HTTP error codes and error response conventions"
globs: ["backend/**/*.ts", "frontend/**/*.ts"]
---

# Error Handling

## HTTP Status Codes

Use these consistently across all API endpoints:

- `401` — Unauthorized (missing or invalid auth)
- `402` — Token limits exceeded
- `403` — Forbidden (insufficient permissions)
- `429` — Rate limited

## Error Response Shape

Always return: `{ error: string, statusCode: number }`.

Log errors with context (user ID, request ID, endpoint).
