import dotenv from 'dotenv';
import { pool, redis } from '../database/connection';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://claude_user:claude_password@localhost:5432/claude_projects_test';

// Global test setup
beforeAll(async () => {
  // Wait for database connection
  try {
    await pool.query('SELECT 1');
    console.log('Test database connected');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  // Clear Redis cache
  try {
    await redis.flushAll();
    console.log('Redis cache cleared');
  } catch (error) {
    console.warn('Redis not available for tests:', error.message);
  }
});

// Clean up after each test
afterEach(async () => {
  // Clean up database tables (in reverse order of dependencies)
  try {
    await pool.query('TRUNCATE conversations, files, project_files, projects, users, agents RESTART IDENTITY CASCADE');
  } catch (error) {
    console.warn('Failed to clean up database:', error.message);
  }

  // Clear Redis
  try {
    await redis.flushAll();
  } catch (error) {
    console.warn('Redis cleanup failed:', error.message);
  }
});

// Global test teardown
afterAll(async () => {
  // Close database connection
  await pool.end();
  
  // Close Redis connection
  try {
    await redis.quit();
  } catch (error) {
    console.warn('Redis quit failed:', error.message);
  }
});

// Mock external services
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response'
            }
          }]
        })
      }
    }
  }))
}));

jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          text: 'Mock Anthropic response'
        }]
      })
    }
  }))
}));
