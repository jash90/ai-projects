import { pool } from '../database/connection';
import { Conversation, ConversationMessage } from '../types';

export class ConversationModel {
  static async findByProjectAndAgent(
    projectId: string, 
    agentId: string, 
    userId: string
  ): Promise<Conversation | null> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, agent_id, messages, created_at, updated_at
      FROM conversations
      WHERE project_id = $1 AND agent_id = $2
    `;

    const result = await pool.query(query, [projectId, agentId]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      messages: Array.isArray(row.messages) ? row.messages : JSON.parse(row.messages || '[]')
    };
  }

  static async createOrUpdate(
    projectId: string,
    agentId: string,
    messages: ConversationMessage[],
    userId: string
  ): Promise<Conversation> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      INSERT INTO conversations (project_id, agent_id, messages)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, agent_id)
      DO UPDATE SET messages = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING id, project_id, agent_id, messages, created_at, updated_at
    `;

    const result = await pool.query(query, [
      projectId,
      agentId,
      JSON.stringify(messages)
    ]);

    const row = result.rows[0];
    return {
      ...row,
      messages: Array.isArray(row.messages) ? row.messages : JSON.parse(row.messages || '[]')
    };
  }

  static async addMessage(
    projectId: string,
    agentId: string,
    message: ConversationMessage,
    userId: string
  ): Promise<Conversation> {
    // Get existing conversation or create empty one
    const existing = await this.findByProjectAndAgent(projectId, agentId, userId);
    const messages = existing ? existing.messages : [];
    
    messages.push(message);
    
    return this.createOrUpdate(projectId, agentId, messages, userId);
  }

  static async clearConversation(
    projectId: string,
    agentId: string,
    userId: string
  ): Promise<boolean> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = 'DELETE FROM conversations WHERE project_id = $1 AND agent_id = $2';
    const result = await pool.query(query, [projectId, agentId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async getProjectConversations(
    projectId: string,
    userId: string
  ): Promise<Conversation[]> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT c.id, c.project_id, c.agent_id, c.messages, c.created_at, c.updated_at,
             a.name as agent_name
      FROM conversations c
      JOIN agents a ON c.agent_id = a.id
      WHERE c.project_id = $1
      ORDER BY c.updated_at DESC
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows.map(row => ({
      ...row,
      messages: Array.isArray(row.messages) ? row.messages : JSON.parse(row.messages || '[]')
    }));
  }

  static async getConversationStats(
    projectId: string,
    agentId: string,
    userId: string
  ): Promise<{
    message_count: number;
    last_activity: Date | null;
  }> {
    const conversation = await this.findByProjectAndAgent(projectId, agentId, userId);
    
    if (!conversation) {
      return {
        message_count: 0,
        last_activity: null
      };
    }

    return {
      message_count: conversation.messages.length,
      last_activity: conversation.updated_at
    };
  }
}
