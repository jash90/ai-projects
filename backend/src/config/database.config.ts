import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgres://claude_user:claude_password@localhost:5432/claude_projects',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  pool: {
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    queryTimeout: 120000,
    statementTimeout: 120000,
  },
}));
