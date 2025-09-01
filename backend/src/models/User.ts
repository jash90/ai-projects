import { pool } from '../database/connection';
import { User, UserCreate } from '../types';
import bcrypt from 'bcryptjs';

export class UserModel {
  static async create(userData: UserCreate): Promise<User> {
    const { email, username, password } = userData;
    const passwordHash = await bcrypt.hash(password, 12);

    const query = `
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, username, created_at, updated_at
    `;

    const result = await pool.query(query, [email, username, passwordHash]);
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findByEmailWithPassword(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updateById(id: string, updates: Partial<UserCreate>): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }

    if (updates.username) {
      fields.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }

    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 12);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async emailExists(email: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE email = $1 LIMIT 1';
    const result = await pool.query(query, [email]);
    return result.rowCount > 0;
  }

  static async usernameExists(username: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE username = $1 LIMIT 1';
    const result = await pool.query(query, [username]);
    return result.rowCount > 0;
  }

  static async getProjectCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM projects WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }
}