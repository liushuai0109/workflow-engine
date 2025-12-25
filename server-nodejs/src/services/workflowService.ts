import { Database } from '../pkg/database';
import { Workflow, WorkflowStatus } from '../models/workflow';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowService {
  constructor(
    private db: Database
  ) {}

  async createWorkflow(
    name: string,
    description: string,
    bpmnXml: string
  ): Promise<Workflow> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO workflows (id, name, description, bpmn_xml, version, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query<Workflow>(query, [
      id,
      name,
      description || '',
      bpmnXml,
      '1.0',
      WorkflowStatus.DRAFT,
      now,
      now,
    ]);

    return this.mapDbToWorkflow(result.rows[0]);
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = 'SELECT * FROM workflows WHERE id = $1';
    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToWorkflow(result.rows[0]);
  }

  async updateWorkflow(
    id: string,
    updates: Partial<Pick<Workflow, 'name' | 'description' | 'bpmnXml' | 'status'>>
  ): Promise<Workflow> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    // Check if workflow exists
    const existing = await this.getWorkflowById(id);

    if (existing) {
      // Update existing workflow
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.bpmnXml !== undefined) {
        setClauses.push(`bpmn_xml = $${paramCount++}`);
        values.push(updates.bpmnXml);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }

      setClauses.push(`updated_at = $${paramCount++}`);
      values.push(new Date());

      values.push(id);

      const query = `
        UPDATE workflows
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.db.query<any>(query, values);
      return this.mapDbToWorkflow(result.rows[0]);
    } else {
      // Create new workflow with specified ID
      const now = new Date();
      const name = updates.name || 'Untitled Workflow';
      const description = updates.description || '';
      const bpmnXml = updates.bpmnXml || '';
      const status = updates.status || WorkflowStatus.DRAFT;

      const query = `
        INSERT INTO workflows (id, name, description, bpmn_xml, version, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await this.db.query<any>(query, [
        id,
        name,
        description,
        bpmnXml,
        '1.0',
        status,
        now,
        now,
      ]);

      return this.mapDbToWorkflow(result.rows[0]);
    }
  }

  async listWorkflows(page: number = 1, pageSize: number = 20): Promise<{
    workflows: Workflow[];
    total: number;
    hasMore: boolean;
  }> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const offset = (page - 1) * pageSize;

    const countQuery = 'SELECT COUNT(*) as count FROM workflows';
    const countResult = await this.db.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM workflows
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.db.query<any>(query, [pageSize, offset]);
    const workflows = result.rows.map(this.mapDbToWorkflow);

    return {
      workflows,
      total,
      hasMore: offset + workflows.length < total,
    };
  }

  private mapDbToWorkflow(row: any): Workflow {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      bpmnXml: row.bpmn_xml,
      version: row.version,
      status: row.status as WorkflowStatus,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
