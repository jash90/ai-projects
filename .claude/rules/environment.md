---
description: "Environment variables and secrets management"
globs: ["**/.env*", "**/env.example", "**/docker-compose*"]
---

# Environment

## Backend (`backend/.env`)

Required: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `CORS_ORIGIN`, `ENABLE_SWAGGER`.

## Frontend (`frontend/.env`)

Required: `VITE_API_URL`, `VITE_WS_URL`.

## Rules

- Never commit `.env` files. Use `env.example` as the template.
- Never hardcode secrets in source code.
- Swagger docs at `/api-docs` when `ENABLE_SWAGGER=true`.
