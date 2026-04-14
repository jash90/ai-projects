# AGENTS.md — Backend Tests
<!-- Scope: backend/src/__tests__/. Source: .claude/rules/testing.md -->

## Commands

```bash
cd backend && pnpm test                   # All backend tests
cd backend && pnpm run test:token-limits  # Token limit enforcement
cd backend && pnpm run check:user <email> # Debug specific user
```

## Directory Structure

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

## Conventions

- Write tests before implementation (TDD).
- Place test files next to the code they test, or in the `__tests__/` directory structure above.
- Never save test files to the repository root.
