---
description: "Test structure, commands, and conventions"
globs: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"]
---

# Testing

## Commands

```bash
cd backend && bun test                   # All backend tests
bun run test:token-limits                # Token limit enforcement
bun run check:user <email>               # Debug specific user
cd frontend && bun test                  # All frontend tests
```

## Structure

### Backend

Tests in `backend/src/__tests__/`:

```
__tests__/
├── core/          # Core business logic
├── integration/   # Integration tests
├── middleware/     # Middleware
├── models/        # Models
├── routes/        # Routes/controllers
├── services/      # Services
├── setup.ts       # Setup/teardown
└── utils/         # Utilities
```

### Frontend

Tests co-located with source or in `frontend/src/__tests__/`. Uses **Vitest** + `@testing-library/react`.

```
frontend/src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx      # Co-located test
└── __tests__/
    └── integration/          # Integration tests
```

## Conventions

- Write tests before implementation (TDD).
- Place test files next to the code they test, or in the `__tests__/` directory.
- Never save test files to the repository root.
- Backend: Jest. Frontend: Vitest.
