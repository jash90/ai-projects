import { pool } from '../database/connection';
import { Message, MessageCreate, PaginatedResponse } from '../types';

export class MessageModel {
  static async create(projectId: string, messageData: MessageCreate): Promise<Message> {
    const { role, content, metadata } = messageData;

    const query = `
      INSERT INTO messages (project_id, role, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, project_id, role, content, metadata, created_at, updated_at
    `;

    const result = await pool.query(query, [
      projectId,
      role,
      content,
      metadata ? JSON.stringify(metadata) : '{}'
    ]);

    return result.rows[0];
  }

  static async findByProjectId(
    projectId: string,
    userId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Message>> {
    // First verify the user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages
      WHERE project_id = $1
    `;

    const dataQuery = `
      SELECT id, project_id, role, content, metadata, created_at, updated_at
      FROM messages
      WHERE project_id = $1
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, [projectId]),
      pool.query(dataQuery, [projectId, limit, offset])
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return {
      items: dataResult.rows,
      total,
      page,
      limit,
      totalPages,
    };
  }

  static async findById(id: string, userId: string): Promise<Message | null> {
    const query = `
      SELECT m.id, m.project_id, m.role, m.content, m.metadata, m.created_at, m.updated_at
      FROM messages m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = $1 AND p.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  static async updateById(id: string, userId: string, updates: Partial<MessageCreate>): Promise<Message | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.content) {
      fields.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    values.push(id, userId);
    const query = `
      UPDATE messages
      SET ${fields.join(', ')}
      FROM projects
      WHERE messages.id = $${paramCount} 
        AND messages.project_id = projects.id 
        AND projects.user_id = $${paramCount + 1}
      RETURNING messages.id, messages.project_id, messages.role, messages.content, 
                messages.metadata, messages.created_at, messages.updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM messages
      USING projects
      WHERE messages.id = $1 
        AND messages.project_id = projects.id 
        AND projects.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return (result.rowCount || 0) > 0;
  }

  static async getRecentMessages(projectId: string, userId: string, limit = 10): Promise<Message[]> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, role, content, metadata, created_at, updated_at
      FROM messages
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [projectId, limit]);
    return result.rows.reverse(); // Return in chronological order
  }

  static async searchMessages(
    projectId: string,
    userId: string,
    searchQuery: string,
    limit = 20
  ): Promise<Message[]> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, role, content, metadata, created_at, updated_at
      FROM messages
      WHERE project_id = $1 AND content ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [projectId, `%${searchQuery}%`, limit]);
    return result.rows;
  }

  static async getConversationContext(
    projectId: string,
    userId: string,
    messageLimit = 20
  ): Promise<Message[]> {
    return this.getRecentMessages(projectId, userId, messageLimit);
  }

  static async deleteByProjectId(projectId: string, userId: string): Promise<number> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = 'DELETE FROM messages WHERE project_id = $1';
    const result = await pool.query(query, [projectId]);
    return result.rowCount || 0;
  }

  static async getMessageStats(projectId: string, userId: string): Promise<{
    total: number;
    user_messages: number;
    assistant_messages: number;
    first_message: Date | null;
    last_message: Date | null;
  }> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE role = 'user') as user_messages,
        COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM messages
      WHERE project_id = $1
    `;

    const result = await pool.query(query, [projectId]);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total, 10),
      user_messages: parseInt(stats.user_messages, 10),
      assistant_messages: parseInt(stats.assistant_messages, 10),
      first_message: stats.first_message,
      last_message: stats.last_message,
    };
  }
}