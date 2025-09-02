import { Pool, Client } from 'pg';
import { createClient, RedisClientType } from 'redis';
import config from '../utils/config';
import logger from '../utils/logger';

// Test database configuration
const testConfig = {
  ...config,
  database_url: process.env.TEST_DATABASE_URL || 'postgres://claude_user:claude_password@localhost:5432/claude_projects_test',
  redis_url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1' // Use different Redis DB
};

// Test PostgreSQL connection pool
export const testPool = new Pool({
  connectionString: testConfig.database_url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  query_timeout: 60000,
  statement_timeout: 60000,
});

// Test Redis connection
export const testRedis: RedisClientType = createClient({
  url: testConfig.redis_url,
  socket: {
    connectTimeout: 5000,
    keepAlive: 30000,
  },
});

// Initialize test database
export async function initializeTestDatabase(): Promise<void> {
  try {
    // Create test database if it doesn't exist
    await createTestDatabase();
    
    // Test PostgreSQL connection
    const client = await testPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Test PostgreSQL connected successfully');

    // Connect to test Redis
    if (!testRedis.isOpen) {
      await testRedis.connect();
    }
    logger.info('Test Redis connected successfully');

    // Clean existing test data
    await cleanTestData();
    logger.info('Test database cleaned');

    // Run migrations on test database
    await runTestMigrations();
    logger.info('Test database migrations completed');

    // Seed test data
    await seedTestDatabase();
    logger.info('Test database seeded successfully');

  } catch (error) {
    logger.error('Test database initialization failed:', error);
    throw error;
  }
}

// Create test database if it doesn't exist
async function createTestDatabase(): Promise<void> {
  const mainDbUrl = config.database_url;
  const testDbName = 'claude_projects_test';
  
  // Connect to main database to create test database
  const mainPool = new Pool({ connectionString: mainDbUrl });
  
  try {
    const client = await mainPool.connect();
    
    // Check if test database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDbName]
    );
    
    if (result.rowCount === 0) {
      // Create test database
      await client.query(`CREATE DATABASE ${testDbName}`);
      logger.info(`Test database ${testDbName} created successfully`);
    } else {
      logger.info(`Test database ${testDbName} already exists`);
    }
    
    client.release();
  } catch (error) {
    logger.error('Error creating test database:', error);
    throw error;
  } finally {
    await mainPool.end();
  }
}

// Run migrations on test database
async function runTestMigrations(): Promise<void> {
  const client = await testPool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create base tables first (from connection.ts)
    await createBaseTables(client);

    // Get list of migration files
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    // Check which migrations have been run
    const executedResult = await client.query('SELECT filename FROM migrations');
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));

    // Run pending migrations
    for (const filename of migrationFiles) {
      if (!executedMigrations.has(filename)) {
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        logger.info(`Running test migration: ${filename}`);
        await client.query(migrationSQL);
        
        // Record migration as executed
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
      }
    }
  } catch (error) {
    logger.error('Error running test migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Create base tables (copied from connection.ts)
async function createBaseTables(client: any): Promise<void> {
  // Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      username VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create agents table
  await client.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic')),
      model VARCHAR(50) NOT NULL,
      temperature REAL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
      max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create projects table
  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, user_id)
    )
  `);

  // Create conversations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      messages JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, agent_id, user_id)
    )
  `);

  // Create messages table
  await client.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create files table
  await client.query(`
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      content TEXT,
      size INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create ai_models table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      provider VARCHAR(20) NOT NULL,
      description TEXT,
      max_tokens INTEGER DEFAULT 4000,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info('Base tables created in test database');
}

// Clean existing test data
async function cleanTestData(): Promise<void> {
  const client = await testPool.connect();
  
  try {
    // Delete in order to respect foreign key constraints
    await client.query('DELETE FROM token_usage');
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM conversations');
    await client.query('DELETE FROM files');
    await client.query('DELETE FROM admin_activity_log');
    await client.query('DELETE FROM global_token_limits');
    await client.query('DELETE FROM projects');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM agents');
    await client.query('DELETE FROM ai_models');
    
    logger.info('Test data cleaned successfully');
  } catch (error) {
    logger.error('Error cleaning test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Seed test database with test data
async function seedTestDatabase(): Promise<void> {
  const client = await testPool.connect();
  
  try {
    // Create test user: test1234@gmail.com
    const testUserQuery = `
      INSERT INTO users (email, password_hash, username, is_active, role, token_limit_global, token_limit_monthly)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        token_limit_global = EXCLUDED.token_limit_global,
        token_limit_monthly = EXCLUDED.token_limit_monthly
      RETURNING id
    `;
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test1234', 12);
    
    const userResult = await client.query(testUserQuery, [
      'test1234@gmail.com',
      hashedPassword,
      'testuser1234',
      true, // is_active
      'user', // role
      100000, // 100K global token limit
      10000   // 10K monthly token limit
    ]);
    
    const userId = userResult.rows[0].id;
    logger.info(`Test user created/updated with ID: ${userId}`);

    // Create test project for the user
    const projectQuery = `
      INSERT INTO projects (name, description, user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (name, user_id) DO UPDATE SET
        description = EXCLUDED.description
      RETURNING id
    `;
    
    const projectResult = await client.query(projectQuery, [
      'Test Project',
      'A test project for debugging',
      userId
    ]);
    
    const projectId = projectResult.rows[0].id;
    logger.info(`Test project created/updated with ID: ${projectId}`);

    // Create test agent (agents are not tied to specific projects)
    let agentId;
    try {
      const agentResult = await client.query(`
        INSERT INTO agents (name, description, system_prompt, provider, model)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'Test Assistant',
        'A test AI assistant for debugging',
        'You are a helpful AI assistant for testing purposes.',
        'anthropic',
        'claude-3-sonnet-20240229'
      ]);
      agentId = agentResult.rows[0].id;
    } catch (error) {
      // Agent might already exist, try to find it
      const existingAgent = await client.query(
        'SELECT id FROM agents WHERE name = $1 AND provider = $2 AND model = $3',
        ['Test Assistant', 'anthropic', 'claude-3-sonnet-20240229']
      );
      if (existingAgent.rowCount > 0) {
        agentId = existingAgent.rows[0].id;
      } else {
        throw error;
      }
    }
    
    logger.info(`Test agent created/updated with ID: ${agentId}`);

    // Set global token limits
    await client.query(`DELETE FROM global_token_limits`);
    await client.query(`
      INSERT INTO global_token_limits (limit_type, limit_value, updated_by)
      VALUES ('global', $1, 'test-system'), ('monthly', $2, 'test-system')
    `, [1000000, 100000]); // 1M global, 100K monthly

    logger.info('Test database seeded with test data');
    
  } catch (error) {
    logger.error('Error seeding test database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Clean up test database
export async function cleanupTestDatabase(): Promise<void> {
  try {
    await testPool.end();
    if (testRedis.isOpen) {
      await testRedis.quit();
    }
    logger.info('Test database connections closed');
  } catch (error) {
    logger.error('Error cleaning up test database:', error);
  }
}

// Check specific user account
export async function checkUserAccount(email: string): Promise<any> {
  const client = await testPool.connect();
  
  try {
    // Get user details
    const userQuery = `
      SELECT 
        id, email, username, is_active, role, 
        token_limit_global, token_limit_monthly,
        created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await client.query(userQuery, [email]);
    
    if (userResult.rowCount === 0) {
      return { error: `User ${email} not found` };
    }
    
    const user = userResult.rows[0];
    
    // Get user's token usage
    const usageQuery = `
      SELECT 
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(CASE 
          WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN total_tokens 
          ELSE 0 
        END), 0) as monthly_tokens,
        COUNT(*) as total_requests
      FROM token_usage
      WHERE user_id = $1
    `;
    
    const usageResult = await client.query(usageQuery, [user.id]);
    const usage = usageResult.rows[0];
    
    // Get global limits
    const { UserModel } = await import('../models/User');
    const globalLimits = await UserModel.getGlobalTokenLimits();
    
    // Get user's projects and agents
    const projectsQuery = `
      SELECT p.id, p.name, p.description, COUNT(a.id) as agent_count
      FROM projects p
      LEFT JOIN agents a ON p.id = a.project_id
      WHERE p.user_id = $1
      GROUP BY p.id, p.name, p.description
      ORDER BY p.created_at DESC
    `;
    
    const projectsResult = await client.query(projectsQuery, [user.id]);
    const projects = projectsResult.rows;
    
    return {
      user: {
        ...user,
        effective_global_limit: user.token_limit_global || globalLimits.global,
        effective_monthly_limit: user.token_limit_monthly || globalLimits.monthly
      },
      usage: {
        total_tokens: parseInt(usage.total_tokens),
        monthly_tokens: parseInt(usage.monthly_tokens),
        total_requests: parseInt(usage.total_requests)
      },
      global_limits: globalLimits,
      projects: projects,
      can_send_messages: user.is_active && 
        (user.token_limit_global === null || user.token_limit_global === 0 || parseInt(usage.total_tokens) < user.token_limit_global) &&
        (user.token_limit_monthly === null || user.token_limit_monthly === 0 || parseInt(usage.monthly_tokens) < user.token_limit_monthly)
    };
    
  } catch (error) {
    logger.error('Error checking user account:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { testConfig };
