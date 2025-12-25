import { Database } from '../pkg/database';
import { User } from '../models/user';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(
    private db: Database
  ) {}

  async createUser(username: string, email: string, fullName?: string): Promise<User> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO users (id, username, email, full_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [
      id,
      username,
      email,
      fullName || '',
      now,
      now,
    ]);

    return this.mapDbToUser(result.rows[0]);
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToUser(result.rows[0]);
  }

  async updateUser(
    id: string,
    updates: Partial<Pick<User, 'username' | 'email' | 'fullName'>>
  ): Promise<User | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.username !== undefined) {
      setClauses.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.fullName !== undefined) {
      setClauses.push(`full_name = $${paramCount++}`);
      values.push(updates.fullName);
    }

    setClauses.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query<any>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToUser(result.rows[0]);
  }

  private mapDbToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.full_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
