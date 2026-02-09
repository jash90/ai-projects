import { pool } from '../database/connection';

export interface Thread {
  id: string;
  project_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  message_count?: number;
  last_message?: string;
  last_agent_id?: string;
  last_agent_name?: string;
  total_tokens?: number;
  total_cost?: number;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  agent_id: string | null;
  agent_name?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface ThreadCreate {
  project_id: string;
  title?: string;
}

export interface ThreadUpdate {
  title?: string;
}

export interface MessageCreate {
  thread_id: string;
  agent_id?: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export class ThreadModel {
  /**
   * Create a new thread
   */
  static async create(data: ThreadCreate, userId: string): Promise<Thread> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [data.project_id, userId]);

    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      INSERT INTO threads (project_id, title)
      VALUES ($1, $2)
      RETURNING id, project_id, title, created_at, updated_at
    `;

    const result = await pool.query(query, [
      data.project_id,
      data.title || 'New conversation'
    ]);

    return result.rows[0];
  }

  /**
   * Find thread by ID
   */
  static async findById(threadId: string, userId: string): Promise<Thread | null> {
    const query = `
      SELECT t.id, t.project_id, t.title, t.created_at, t.updated_at,
             (SELECT COUNT(*)::int FROM thread_messages WHERE thread_id = t.id) as message_count,
             (SELECT COALESCE(SUM(total_tokens), 0)::int FROM token_usage WHERE conversation_id = t.id) as total_tokens,
             (SELECT COALESCE(SUM(estimated_cost), 0)::numeric FROM token_usage WHERE conversation_id = t.id) as total_cost
      FROM threads t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `;

    const result = await pool.query(query, [threadId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Get all threads for a project with summary info
   */
  static async findByProjectId(projectId: string, userId: string): Promise<Thread[]> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);

    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT
        t.id,
        t.project_id,
        t.title,
        t.created_at,
        t.updated_at,
        (SELECT COUNT(*)::int FROM thread_messages WHERE thread_id = t.id) as message_count,
        (
          SELECT content
          FROM thread_messages
          WHERE thread_id = t.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT tm.agent_id
          FROM thread_messages tm
          WHERE tm.thread_id = t.id AND tm.role = 'assistant'
          ORDER BY tm.created_at DESC
          LIMIT 1
        ) as last_agent_id,
        (
          SELECT a.name
          FROM thread_messages tm
          JOIN agents a ON tm.agent_id = a.id
          WHERE tm.thread_id = t.id AND tm.role = 'assistant'
          ORDER BY tm.created_at DESC
          LIMIT 1
        ) as last_agent_name,
        (SELECT COALESCE(SUM(total_tokens), 0)::int FROM token_usage WHERE conversation_id = t.id) as total_tokens,
        (SELECT COALESCE(SUM(estimated_cost), 0)::numeric FROM token_usage WHERE conversation_id = t.id) as total_cost
      FROM threads t
      WHERE t.project_id = $1
      ORDER BY t.updated_at DESC
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Update thread
   */
  static async update(threadId: string, data: ThreadUpdate, userId: string): Promise<Thread | null> {
    // Verify user owns the project
    const verifyQuery = `
      SELECT t.id FROM threads t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [threadId, userId]);

    if (verifyResult.rowCount === 0) {
      throw new Error('Thread not found or access denied');
    }

    const query = `
      UPDATE threads
      SET title = COALESCE($1, title),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, project_id, title, created_at, updated_at
    `;

    const result = await pool.query(query, [data.title, threadId]);
    return result.rows[0] || null;
  }

  /**
   * Delete thread
   */
  static async delete(threadId: string, userId: string): Promise<boolean> {
    // Verify user owns the project
    const verifyQuery = `
      SELECT t.id FROM threads t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [threadId, userId]);

    if (verifyResult.rowCount === 0) {
      throw new Error('Thread not found or access denied');
    }

    const query = 'DELETE FROM threads WHERE id = $1';
    const result = await pool.query(query, [threadId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Auto-generate title from first message (only if user owns the thread via project)
   */
  static async updateTitleFromFirstMessage(threadId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE threads t
      SET title = (
        SELECT CASE
          WHEN LENGTH(content) > 50 THEN SUBSTRING(content, 1, 47) || '...'
          ELSE content
        END
        FROM thread_messages
        WHERE thread_id = $1 AND role = 'user'
        ORDER BY created_at ASC
        LIMIT 1
      )
      FROM projects p
      WHERE t.id = $1
        AND t.title = 'New conversation'
        AND t.project_id = p.id
        AND p.user_id = $2
    `;

    const result = await pool.query(query, [threadId, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export class ThreadMessageModel {
  /**
   * Add a message to a thread
   */
  static async create(data: MessageCreate, userId: string): Promise<ThreadMessage> {
    // Verify user owns the project that contains this thread
    const verifyQuery = `
      SELECT t.id FROM threads t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [data.thread_id, userId]);

    if (verifyResult.rowCount === 0) {
      throw new Error('Thread not found or access denied');
    }

    const query = `
      INSERT INTO thread_messages (thread_id, agent_id, role, content, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, thread_id, agent_id, role, content, metadata, created_at
    `;

    const result = await pool.query(query, [
      data.thread_id,
      data.agent_id || null,
      data.role,
      data.content,
      JSON.stringify(data.metadata || {})
    ]);

    // Update thread's updated_at timestamp
    await pool.query(
      'UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [data.thread_id]
    );

    const message = result.rows[0];
    return {
      ...message,
      metadata: typeof message.metadata === 'string'
        ? JSON.parse(message.metadata)
        : message.metadata
    };
  }

  /**
   * Get all messages for a thread
   */
  static async findByThreadId(threadId: string, userId: string): Promise<ThreadMessage[]> {
    // Verify user owns the project that contains this thread
    const verifyQuery = `
      SELECT t.id FROM threads t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [threadId, userId]);

    if (verifyResult.rowCount === 0) {
      throw new Error('Thread not found or access denied');
    }

    const query = `
      SELECT
        m.id,
        m.thread_id,
        m.agent_id,
        a.name as agent_name,
        m.role,
        m.content,
        m.metadata,
        m.created_at
      FROM thread_messages m
      LEFT JOIN agents a ON m.agent_id = a.id
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(query, [threadId]);
    return result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
    }));
  }

  /**
   * Get message by ID
   */
  static async findById(messageId: string, userId: string): Promise<ThreadMessage | null> {
    const query = `
      SELECT
        m.id,
        m.thread_id,
        m.agent_id,
        a.name as agent_name,
        m.role,
        m.content,
        m.metadata,
        m.created_at
      FROM thread_messages m
      LEFT JOIN agents a ON m.agent_id = a.id
      JOIN threads t ON m.thread_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE m.id = $1 AND p.user_id = $2
    `;

    const result = await pool.query(query, [messageId, userId]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      ...row,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
    };
  }

  /**
   * Delete a message
   */
  static async delete(messageId: string, userId: string): Promise<boolean> {
    // Verify user owns the project
    const verifyQuery = `
      SELECT m.id FROM thread_messages m
      JOIN threads t ON m.thread_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE m.id = $1 AND p.user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [messageId, userId]);

    if (verifyResult.rowCount === 0) {
      throw new Error('Message not found or access denied');
    }

    const query = 'DELETE FROM thread_messages WHERE id = $1';
    const result = await pool.query(query, [messageId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get recent messages for context (for AI)
   */
  static async getRecentMessages(
    threadId: string,
    userId: string,
    limit: number = 20
  ): Promise<ThreadMessage[]> {
    // Verify user owns the project that contains this thread
    const verifyQuery = `
      SELECT t.id FROM threads t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [threadId, userId]);

    if (verifyResult.rowCount === 0) {
      throw new Error('Thread not found or access denied');
    }

    const query = `
      SELECT
        m.id,
        m.thread_id,
        m.agent_id,
        a.name as agent_name,
        m.role,
        m.content,
        m.metadata,
        m.created_at
      FROM thread_messages m
      LEFT JOIN agents a ON m.agent_id = a.id
      WHERE m.thread_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [threadId, limit]);

    // Reverse to get chronological order
    return result.rows.reverse().map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
    }));
  }
}
