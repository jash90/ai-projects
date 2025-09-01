import { pool } from '../database/connection';
import { File, FileCreate, FileUpdate } from '../types';

export class FileModel {
  static async create(
    projectId: string,
    fileData: FileCreate,
    userId: string
  ): Promise<File> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const { name, content, type } = fileData;

    const query = `
      INSERT INTO files (project_id, name, content, type)
      VALUES ($1, $2, $3, $4)
      RETURNING id, project_id, name, content, type, created_at, updated_at
    `;

    const result = await pool.query(query, [projectId, name, content, type]);
    return result.rows[0];
  }

  static async findById(id: string, userId: string): Promise<File | null> {
    const query = `
      SELECT f.id, f.project_id, f.name, f.content, f.type, f.created_at, f.updated_at
      FROM files f
      JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND p.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  static async findByProjectId(
    projectId: string,
    userId: string
  ): Promise<File[]> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, name, content, type, created_at, updated_at
      FROM files
      WHERE project_id = $1
      ORDER BY name ASC
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  static async updateById(
    id: string,
    updates: FileUpdate,
    userId: string
  ): Promise<File | null> {
    // First verify user owns the file through project ownership
    const checkQuery = `
      SELECT f.id FROM files f
      JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND p.user_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rowCount === 0) {
      throw new Error('File not found or access denied');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.type) {
      fields.push(`type = $${paramCount++}`);
      values.push(updates.type);
    }

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    values.push(id);
    const query = `
      UPDATE files
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, project_id, name, content, type, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM files
      USING projects
      WHERE files.id = $1 
        AND files.project_id = projects.id 
        AND projects.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  static async findByName(
    projectId: string,
    name: string,
    userId: string
  ): Promise<File | null> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, name, content, type, created_at, updated_at
      FROM files
      WHERE project_id = $1 AND name = $2
    `;

    const result = await pool.query(query, [projectId, name]);
    return result.rows[0] || null;
  }

  static async searchFiles(
    projectId: string,
    searchQuery: string,
    userId: string
  ): Promise<File[]> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, name, content, type, created_at, updated_at
      FROM files
      WHERE project_id = $1 
        AND (name ILIKE $2 OR content ILIKE $2)
      ORDER BY name ASC
    `;

    const result = await pool.query(query, [projectId, `%${searchQuery}%`]);
    return result.rows;
  }

  static async getFilesByType(
    projectId: string,
    type: string,
    userId: string
  ): Promise<File[]> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, name, content, type, created_at, updated_at
      FROM files
      WHERE project_id = $1 AND type = $2
      ORDER BY name ASC
    `;

    const result = await pool.query(query, [projectId, type]);
    return result.rows;
  }

  static async getProjectFileStats(
    projectId: string,
    userId: string
  ): Promise<{
    total_files: number;
    file_types: { type: string; count: number }[];
  }> {
    // First verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const totalQuery = `
      SELECT COUNT(*) as total_files
      FROM files
      WHERE project_id = $1
    `;

    const typesQuery = `
      SELECT type, COUNT(*) as count
      FROM files
      WHERE project_id = $1
      GROUP BY type
      ORDER BY count DESC
    `;

    const [totalResult, typesResult] = await Promise.all([
      pool.query(totalQuery, [projectId]),
      pool.query(typesQuery, [projectId])
    ]);

    return {
      total_files: parseInt(totalResult.rows[0].total_files, 10),
      file_types: typesResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count, 10)
      }))
    };
  }
}
