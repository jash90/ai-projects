// Manual mock for database/connection
// This will be used when jest.mock('../database/connection') is called

import { Pool } from 'pg';

// Create pool directly with test database URL
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgres://claude_user:claude_password@localhost:5432/claude_projects_test';

export const pool = new Pool({
  connectionString: testDatabaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Mock Redis client
export const redis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  flushAll: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue('OK'),
  isOpen: true,
  isReady: true,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

// Create base tables for testing
async function createBaseTables(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        token_limit_global BIGINT DEFAULT 10000000000,
        token_limit_monthly BIGINT DEFAULT 1000000000,
        is_active BOOLEAN DEFAULT true,
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
        provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'openrouter')),
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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, agent_id)
      )
    `);

    // Create files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, name)
      )
    `);

    // Create project_files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        path VARCHAR(500) NOT NULL,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ai_models table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_models (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'openrouter')),
        description TEXT,
        max_tokens INTEGER NOT NULL DEFAULT 4096,
        supports_vision BOOLEAN NOT NULL DEFAULT FALSE,
        supports_function_calling BOOLEAN NOT NULL DEFAULT FALSE,
        cost_per_1k_input_tokens DECIMAL(10,4) NOT NULL DEFAULT 0,
        cost_per_1k_output_tokens DECIMAL(10,4) NOT NULL DEFAULT 0,
        context_window INTEGER NOT NULL DEFAULT 4096,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create global_token_limits table (needed by User model)
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_token_limits (
        id SERIAL PRIMARY KEY,
        limit_type VARCHAR(50) UNIQUE NOT NULL,
        limit_value BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create token_usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        model VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost NUMERIC(10, 6) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default global token limits
    await client.query(`
      INSERT INTO global_token_limits (limit_type, limit_value)
      VALUES ('global', 10000000000), ('monthly', 1000000000)
      ON CONFLICT (limit_type) DO NOTHING
    `);
  } finally {
    client.release();
  }
}

// Mock initialization function - creates tables for tests
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
  } finally {
    client.release();
  }
  await createBaseTables();
}

// Mock close function
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
