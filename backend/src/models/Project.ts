import { pool } from '../database/connection';
import { Project, ProjectCreate, ProjectUpdate, PaginatedResponse } from '../types';

export class ProjectModel {
  static async create(projectData: ProjectCreate & { user_id: string }): Promise<Project> {
    const { name, description, user_id } = projectData;

    const query = `
      INSERT INTO projects (name, description, user_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, user_id, created_at, updated_at
    `;

    const result = await pool.query(query, [
      name,
      description || '',
      user_id
    ]);

    return result.rows[0];
  }

  static async findById(id: string, userId: string): Promise<Project | null> {
    const query = `
      SELECT p.id, p.name, p.description, p.user_id,
             p.created_at, p.updated_at,
             COUNT(DISTINCT f.id) as file_count
      FROM projects p
      LEFT JOIN files f ON p.id = f.project_id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id, p.name, p.description, p.user_id, p.created_at, p.updated_at
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  static async findByUserId(
    userId: string, 
    page = 1, 
    limit = 10,
    search?: string
  ): Promise<PaginatedResponse<Project>> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.user_id = $1';
    let params: any[] = [userId];
    let paramCount = 2;

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause}
    `;

    const dataQuery = `
      SELECT p.id, p.name, p.description, p.user_id,
             p.created_at, p.updated_at,
             COUNT(DISTINCT f.id) as file_count
      FROM projects p
      LEFT JOIN files f ON p.id = f.project_id
      ${whereClause}
      GROUP BY p.id, p.name, p.description, p.user_id, p.created_at, p.updated_at
      ORDER BY p.updated_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params)
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

  static async updateById(id: string, userId: string, updates: ProjectUpdate): Promise<Project | null> {
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

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    values.push(id, userId);
    const query = `
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING id, name, description, user_id, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }



  static async getRecentActivity(userId: string, limit = 5): Promise<Project[]> {
    const query = `
      SELECT p.id, p.name, p.description, p.user_id,
             p.created_at, p.updated_at
      FROM projects p
      WHERE p.user_id = $1
      ORDER BY p.updated_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async searchProjects(userId: string, query: string, limit = 10): Promise<Project[]> {
    const searchQuery = `
      SELECT p.id, p.name, p.description, p.user_id,
             p.created_at, p.updated_at,
             COUNT(DISTINCT f.id) as file_count
      FROM projects p
      LEFT JOIN files f ON p.id = f.project_id
      WHERE p.user_id = $1 
        AND (p.name ILIKE $2 OR p.description ILIKE $2)
      GROUP BY p.id, p.name, p.description, p.user_id, p.created_at, p.updated_at
      ORDER BY p.updated_at DESC
      LIMIT $3
    `;

    const result = await pool.query(searchQuery, [userId, `%${query}%`, limit]);
    return result.rows;
  }
}