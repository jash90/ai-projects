# Suggested Commands for AI Projects Platform

## Development Commands

### Root Level (pnpm workspace)
```bash
# Install all dependencies across workspace
pnpm install

# Start both frontend and backend in parallel
pnpm run dev

# Build entire project
pnpm run build

# Type check all packages
pnpm run type-check

# Lint all packages
pnpm run lint

# Clean all build artifacts
pnpm run clean
```

### Backend Commands
```bash
cd backend

# Development with hot reload
pnpm run dev

# Build TypeScript to JavaScript
pnpm run build

# Start production server
pnpm start

# Database operations
pnpm run db:migrate
pnpm run db:seed

# Testing
pnpm test                    # Run all tests
pnpm run test:all           # Include normally ignored tests
pnpm run test:token-limits  # Test token limit enforcement

# Type checking and linting
pnpm run type-check
pnpm run lint
pnpm run lint:fix

# Debug and utility scripts
pnpm run check:user <email>          # Analyze specific user account
pnpm run debug:token-limits          # Debug token calculations
pnpm run inspect:test-db            # Inspect test database
```

### Frontend Commands
```bash
cd frontend

# Development server (runs on port 3000, proxies API to :3001)
pnpm run dev

# Production build
pnpm run build

# Type checking only
pnpm run type-check

# Linting with ESLint
pnpm run lint

# Preview production build
pnpm preview

# Clean build artifacts
pnpm run clean
```

## Database Commands
```bash
# Run database migrations
pnpm run db:migrate

# Seed database with initial data
pnpm run db:seed
```

## Docker Commands
```bash
# Start all services in containers
pnpm run docker:up

# Stop all services
pnpm run docker:down
```

## Useful System Commands (macOS)
```bash
# Find files
find . -name "*.ts" -type f

# Search in files
grep -r "searchterm" src/

# List processes on ports
lsof -i :3000
lsof -i :3001

# Kill process on port
kill -9 $(lsof -t -i:3000)
```