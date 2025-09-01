import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/connection';
import { User, Agent, Project } from '../../types';

export interface TestUser extends User {
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export class TestHelpers {
  static async createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
    const defaultUser = {
      id: uuidv4(),
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const user = { ...defaultUser, ...userData };
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const query = `
      INSERT INTO users (id, email, username, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, username, created_at, updated_at
    `;

    const result = await pool.query(query, [
      user.id,
      user.email,
      user.username,
      hashedPassword
    ]);

    return {
      ...result.rows[0],
      password: user.password
    };
  }

  static generateTokens(userId: string): AuthTokens {
    const access_token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    const refresh_token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );

    return { access_token, refresh_token };
  }

  static async createTestAgent(agentData?: Partial<Agent>): Promise<Agent> {
    const defaultAgent = {
      id: uuidv4(),
      name: 'Test Agent',
      description: 'A test AI agent',
      system_prompt: 'You are a helpful test assistant.',
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const agent = { ...defaultAgent, ...agentData };

    const query = `
      INSERT INTO agents (id, name, description, system_prompt, provider, model, temperature, max_tokens)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      agent.id,
      agent.name,
      agent.description,
      agent.system_prompt,
      agent.provider,
      agent.model,
      agent.temperature,
      agent.max_tokens
    ]);

    return result.rows[0];
  }

  static async createTestProject(userId: string, projectData?: Partial<Project>): Promise<Project> {
    const defaultProject = {
      id: uuidv4(),
      name: 'Test Project',
      description: 'A test project',
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const project = { ...defaultProject, ...projectData };

    const query = `
      INSERT INTO projects (id, name, description, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      project.id,
      project.name,
      project.description,
      project.user_id
    ]);

    return result.rows[0];
  }

  static async authenticatedRequest(app: any, tokens: AuthTokens) {
    return request(app).set('Authorization', `Bearer ${tokens.access_token}`);
  }

  static async seedDatabase() {
    // Create default agents if they don't exist
    const agents = [
      {
        id: uuidv4(),
        name: 'General Assistant',
        description: 'A versatile AI assistant for general tasks',
        system_prompt: 'You are a helpful, knowledgeable, and friendly AI assistant.',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        id: uuidv4(),
        name: 'Code Expert',
        description: 'Specialized in programming and software development',
        system_prompt: 'You are an expert programmer and software architect.',
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.3,
        max_tokens: 3000
      }
    ];

    for (const agent of agents) {
      const existingAgent = await pool.query('SELECT id FROM agents WHERE name = $1', [agent.name]);
      if (existingAgent.rowCount === 0) {
        await pool.query(`
          INSERT INTO agents (id, name, description, system_prompt, provider, model, temperature, max_tokens)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          agent.id,
          agent.name,
          agent.description,
          agent.system_prompt,
          agent.provider,
          agent.model,
          agent.temperature,
          agent.max_tokens
        ]);
      }
    }
  }

  static async cleanDatabase() {
    const tables = ['conversations', 'files', 'project_files', 'projects', 'users'];
    for (const table of tables) {
      await pool.query(`TRUNCATE ${table} RESTART IDENTITY CASCADE`);
    }
  }

  static expectValidationError(response: any, field?: string) {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
    if (field) {
      expect(response.body.details).toContain(expect.stringContaining(field));
    }
  }

  static expectAuthError(response: any) {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('token');
  }

  static expectNotFoundError(response: any) {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  }
}
