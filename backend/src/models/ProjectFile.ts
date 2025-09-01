import { pool } from '../database/connection';
import { ProjectFile, PaginatedResponse } from '../types';

export class ProjectFileModel {
  static async create(fileData: Omit<ProjectFile, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectFile> {
    const { project_id, filename, original_name, mimetype, size, path, uploaded_by } = fileData;

    const query = `
      INSERT INTO project_files (project_id, filename, original_name, mimetype, size, path, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, project_id, filename, original_name, mimetype, size, path, uploaded_by, created_at, updated_at
    `;

    const result = await pool.query(query, [
      project_id,
      filename,
      original_name,
      mimetype,
      size,
      path,
      uploaded_by
    ]);

    return result.rows[0];
  }

  static async findById(id: string, userId: string): Promise<ProjectFile | null> {
    const query = `
      SELECT f.id, f.project_id, f.filename, f.original_name, f.mimetype, f.size, f.path, 
             f.uploaded_by, f.created_at, f.updated_at
      FROM project_files f
      JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND p.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  static async findByProjectId(
    projectId: string,
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<ProjectFile>> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM project_files
      WHERE project_id = $1
    `;

    const dataQuery = `
      SELECT id, project_id, filename, original_name, mimetype, size, path, 
             uploaded_by, created_at, updated_at
      FROM project_files
      WHERE project_id = $1
      ORDER BY created_at DESC
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

  static async deleteById(id: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM project_files
      USING projects
      WHERE project_files.id = $1 
        AND project_files.project_id = projects.id 
        AND projects.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  static async deleteByProjectId(projectId: string, userId: string): Promise<number> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = 'DELETE FROM project_files WHERE project_id = $1';
    const result = await pool.query(query, [projectId]);
    return result.rowCount;
  }

  static async getFilesByMimetype(
    projectId: string,
    userId: string,
    mimetype: string
  ): Promise<ProjectFile[]> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, filename, original_name, mimetype, size, path, 
             uploaded_by, created_at, updated_at
      FROM project_files
      WHERE project_id = $1 AND mimetype LIKE $2
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [projectId, `${mimetype}%`]);
    return result.rows;
  }

  static async searchFiles(
    projectId: string,
    userId: string,
    searchQuery: string,
    limit = 20
  ): Promise<ProjectFile[]> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, filename, original_name, mimetype, size, path, 
             uploaded_by, created_at, updated_at
      FROM project_files
      WHERE project_id = $1 
        AND (original_name ILIKE $2 OR filename ILIKE $2)
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [projectId, `%${searchQuery}%`, limit]);
    return result.rows;
  }

  static async getProjectStats(projectId: string, userId: string): Promise<{
    total_files: number;
    total_size: number;
    file_types: { mimetype: string; count: number; total_size: number }[];
  }> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(size), 0) as total_size
      FROM project_files
      WHERE project_id = $1
    `;

    const typesQuery = `
      SELECT 
        mimetype,
        COUNT(*) as count,
        COALESCE(SUM(size), 0) as total_size
      FROM project_files
      WHERE project_id = $1
      GROUP BY mimetype
      ORDER BY count DESC
    `;

    const [statsResult, typesResult] = await Promise.all([
      pool.query(statsQuery, [projectId]),
      pool.query(typesQuery, [projectId])
    ]);

    const stats = statsResult.rows[0];

    return {
      total_files: parseInt(stats.total_files, 10),
      total_size: parseInt(stats.total_size, 10),
      file_types: typesResult.rows.map(row => ({
        mimetype: row.mimetype,
        count: parseInt(row.count, 10),
        total_size: parseInt(row.total_size, 10),
      })),
    };
  }

  static async getRecentFiles(
    projectId: string,
    userId: string,
    limit = 10
  ): Promise<ProjectFile[]> {
    // Verify user owns the project
    const projectQuery = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const projectResult = await pool.query(projectQuery, [projectId, userId]);
    
    if (projectResult.rowCount === 0) {
      throw new Error('Project not found or access denied');
    }

    const query = `
      SELECT id, project_id, filename, original_name, mimetype, size, path, 
             uploaded_by, created_at, updated_at
      FROM project_files
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [projectId, limit]);
    return result.rows;
  }

  static async checkFileExists(filename: string, projectId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM project_files WHERE filename = $1 AND project_id = $2 LIMIT 1';
    const result = await pool.query(query, [filename, projectId]);
    return result.rowCount > 0;
  }

  static async getFilePath(id: string, userId: string): Promise<string | null> {
    const query = `
      SELECT f.path
      FROM project_files f
      JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND p.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows[0]?.path || null;
  }
}