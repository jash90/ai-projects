# Code Style and Conventions

## TypeScript Patterns
- **Strict TypeScript**: Full type safety with strict mode enabled
- **Interface-first**: Comprehensive interfaces in `types/index.ts` 
- **Path aliases**: Backend uses `@/` for imports (`@/services/aiService`)
- **Relative imports**: Frontend uses relative imports
- **Type exports**: Shared types between frontend/backend

## Backend Patterns
- **Express middleware**: Structured middleware pipeline (auth, validation, rate limiting)
- **Service layer**: Business logic separated into services (aiService, tokenService, etc.)
- **Model classes**: TypeScript classes for data models with validation
- **Error handling**: Structured error responses with proper HTTP codes
- **Logging**: Winston structured logging with different levels
- **Database**: PostgreSQL with connection pooling, JSONB for metadata

## Frontend Patterns  
- **Zustand state**: Zustand stores with persistence for auth/UI data
- **React Query**: TanStack Query for server state management and caching
- **Component organization**: UI primitives in `/ui`, feature components grouped by domain
- **Hook patterns**: Custom hooks for complex logic (useSocket, useAuth)
- **Type safety**: Props interfaces for all components

## File Organization
- **Backend**: `src/routes`, `src/services`, `src/middleware`, `src/models`
- **Frontend**: `src/components`, `src/stores`, `src/hooks`, `src/pages`
- **Shared types**: Both use comprehensive TypeScript interfaces
- **Configuration**: Environment-based config with validation

## Security Patterns
- **JWT authentication**: Access + refresh token pattern
- **Role-based access**: Admin middleware and authorization checks
- **Input validation**: Joi schemas for request validation
- **Rate limiting**: Redis-backed rate limiting
- **File uploads**: Multer with security validation (10MB limit)

## Testing Patterns
- **Backend**: Jest + Supertest for API testing
- **Database**: Isolated test database for safe testing
- **Type checking**: TypeScript strict mode for compile-time safety
- **Error scenarios**: Comprehensive error handling tests