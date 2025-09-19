# Task Completion Checklist

## Before Completing Any Task

### Code Quality
- [ ] **Type checking**: Run `pnpm run type-check` (both frontend and backend)
- [ ] **Linting**: Run `pnpm run lint` and fix any issues
- [ ] **Build**: Ensure `pnpm run build` succeeds without errors

### Testing Requirements
- [ ] **Backend tests**: Run existing tests with `pnpm test`
- [ ] **Token limit tests**: Run `pnpm run test:token-limits` if token-related changes
- [ ] **Database integrity**: Verify migrations and seed data work correctly

### Security Validation
- [ ] **Authentication**: Verify JWT token handling and role-based access
- [ ] **Input validation**: Ensure Joi schemas validate all inputs
- [ ] **Rate limiting**: Check rate limiting is properly applied
- [ ] **File uploads**: Validate file security constraints

### Database Changes
- [ ] **Migrations**: Create and test database migrations if schema changes
- [ ] **Seed data**: Update seed scripts if default data changes
- [ ] **TypeScript types**: Update interfaces to match schema changes

### Frontend Specific
- [ ] **Socket.io**: Verify WebSocket functionality works correctly
- [ ] **State management**: Test Zustand store persistence and state updates
- [ ] **API integration**: Ensure axios client handles authentication properly

### Documentation
- [ ] **Code comments**: Add TSDoc comments for complex logic
- [ ] **Type annotations**: Ensure comprehensive TypeScript typing
- [ ] **Error handling**: Document error scenarios and recovery

### Performance
- [ ] **Bundle size**: Check frontend build size hasn't grown significantly
- [ ] **Database queries**: Verify efficient database access patterns
- [ ] **Memory usage**: Check for potential memory leaks in long-running operations

### Production Readiness
- [ ] **Environment variables**: Verify all required env vars are documented
- [ ] **Error logging**: Ensure proper error logging and monitoring
- [ ] **Security headers**: Check security middleware is applied correctly