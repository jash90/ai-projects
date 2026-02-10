import { Pool, Client } from 'pg';
import { createClient, RedisClientType } from 'redis';
import config from '../utils/config';
import logger from '../utils/logger';

// PostgreSQL connection
export const pool = new Pool({
  connectionString: config.database_url,
  max: 20,
  idleTimeoutMillis: 60000, // 60 seconds
  connectionTimeoutMillis: 30000, // 30 seconds - increased for Railway cold starts
  query_timeout: 120000, // 2 minutes for long queries
  statement_timeout: 120000, // 2 minutes for long statements
});

// Redis connection
export const redis: RedisClientType = createClient({
  url: config.redis_url,
  socket: {
    connectTimeout: 30000, // 30 seconds - increased for Railway cold starts
    keepAlive: 30000, // 30 seconds
  },
});

// Database initialization
export async function initializeDatabase(): Promise<void> {
  try {
    // Test PostgreSQL connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connected successfully');

    // Connect to Redis
    if (!redis.isOpen) {
      await redis.connect();
    }
    logger.info('Redis connected successfully');

    // Run migrations
    await runMigrations();
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Run database migrations
async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
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

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
      CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    const tables = ['users', 'projects', 'conversations', 'files', 'project_files', 'agents'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // Create user_management_view for admin panel
    await client.query(`DROP VIEW IF EXISTS user_management_view`);
    await client.query(`
      CREATE VIEW user_management_view AS
      SELECT
        u.id,
        u.email,
        u.username,
        u.role,
        u.is_active,
        u.token_limit_global,
        u.token_limit_monthly,
        u.created_at,
        u.updated_at,
        COALESCE(p.project_count, 0) as project_count,
        COALESCE(tu.total_tokens, 0) as total_tokens,
        COALESCE(tu.monthly_tokens, 0) as monthly_tokens,
        COALESCE(tu.total_cost, 0) as total_cost
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as project_count
        FROM projects
        GROUP BY user_id
      ) p ON u.id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          SUM(total_tokens) as total_tokens,
          SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN total_tokens ELSE 0 END) as monthly_tokens,
          SUM(estimated_cost) as total_cost
        FROM token_usage
        GROUP BY user_id
      ) tu ON u.id = tu.user_id
    `);

    // Ensure default agent descriptions are in English
    await client.query(`
      UPDATE agents SET description = 'A versatile AI assistant that can help with a wide range of tasks including writing, analysis, problem-solving, and general conversation.' WHERE name = 'General Assistant';
      UPDATE agents SET description = 'A specialized AI assistant focused on programming, software development, debugging, and technical problem-solving.' WHERE name = 'Code Expert';
      UPDATE agents SET description = 'An AI assistant specialized in creative writing, storytelling, content creation, and literary analysis.' WHERE name = 'Creative Writer';
    `);

    await client.query('COMMIT');
    logger.info('Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    await redis.quit();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}