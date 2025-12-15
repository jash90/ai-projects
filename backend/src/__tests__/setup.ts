import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://claude_user:claude_password@localhost:5432/claude_projects_test';

// Mock Redis via manual mock in __mocks__/connection.ts
// Jest will automatically use the mock when this module is mocked
jest.mock('../database/connection');

// Mock OpenAI (default export)
jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      }
    }
  }));
  return {
    __esModule: true,
    default: mockOpenAI
  };
});

// Mock Anthropic (default export)
jest.mock('@anthropic-ai/sdk', () => {
  const mockAnthropic = jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Mock Anthropic response'
        }],
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      })
    }
  }));
  return {
    __esModule: true,
    default: mockAnthropic
  };
});

// Import pool and initializeDatabase AFTER mock is set up (jest.mock is hoisted)
import { pool, initializeDatabase } from '../database/connection';

// Global test setup
beforeAll(async () => {
  // Initialize database (creates tables if they don't exist)
  try {
    await initializeDatabase();
    console.log('Test database initialized');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  // Clean up database tables (in reverse order of dependencies)
  try {
    await pool.query('TRUNCATE token_usage, conversations, files, project_files, projects, users, agents, ai_models RESTART IDENTITY CASCADE');
  } catch (error) {
    console.warn('Failed to clean up database:', (error as Error).message);
  }
});

// Global test teardown
afterAll(async () => {
  // Close database connection
  await pool.end();
});
