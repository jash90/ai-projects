import { pool } from '../database/connection';
import { Agent, AgentCreate, AgentUpdate } from '../types';

export class AgentModel {
  static async findAll(): Promise<Agent[]> {
    const query = `
      SELECT id, name, description, system_prompt, provider, model, temperature, max_tokens, created_at, updated_at
      FROM agents
      ORDER BY name ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id: string): Promise<Agent | null> {
    const query = `
      SELECT id, name, description, system_prompt, provider, model, temperature, max_tokens, created_at, updated_at
      FROM agents
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async create(agentData: AgentCreate): Promise<Agent> {
    const { 
      name, 
      description, 
      system_prompt, 
      provider, 
      model, 
      temperature = 0.7, 
      max_tokens = 2000 
    } = agentData;

    const query = `
      INSERT INTO agents (name, description, system_prompt, provider, model, temperature, max_tokens)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, system_prompt, provider, model, temperature, max_tokens, created_at, updated_at
    `;

    const result = await pool.query(query, [
      name, 
      description, 
      system_prompt, 
      provider, 
      model, 
      temperature, 
      max_tokens
    ]);
    return result.rows[0];
  }

  static async updateById(id: string, updates: AgentUpdate): Promise<Agent | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    if (updates.system_prompt) {
      fields.push(`system_prompt = $${paramCount++}`);
      values.push(updates.system_prompt);
    }

    if (updates.provider) {
      fields.push(`provider = $${paramCount++}`);
      values.push(updates.provider);
    }

    if (updates.model) {
      fields.push(`model = $${paramCount++}`);
      values.push(updates.model);
    }

    if (updates.temperature !== undefined) {
      fields.push(`temperature = $${paramCount++}`);
      values.push(updates.temperature);
    }

    if (updates.max_tokens !== undefined) {
      fields.push(`max_tokens = $${paramCount++}`);
      values.push(updates.max_tokens);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE agents
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, system_prompt, provider, model, temperature, max_tokens, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: string): Promise<boolean> {
    // Check if agent is being used by any conversations
    const checkQuery = 'SELECT 1 FROM conversations WHERE agent_id = $1 LIMIT 1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount && checkResult.rowCount > 0) {
      throw new Error('Cannot delete agent that is being used in conversations');
    }

    const query = 'DELETE FROM agents WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async getUsageCount(agentId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM conversations WHERE agent_id = $1';
    const result = await pool.query(query, [agentId]);
    return parseInt(result.rows[0].count, 10);
  }
}