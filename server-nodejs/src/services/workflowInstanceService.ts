import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';
import { WorkflowInstance, InstanceStatus } from '../models/workflowInstance';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowInstanceService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async createWorkflowInstance(
    workflowId: string,
    name: string
  ): Promise<WorkflowInstance> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO workflow_instances (id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        workflowId,
        name,
        InstanceStatus.PENDING,
        [],
        1,
        now,
        now,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Failed to create workflow instance');
      }

      return this.mapDbToInstance(result.rows[0]);
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to create workflow instance');
      if (err.code === '23503') {
        // Foreign key violation
        throw new Error(`Foreign key violation: ${err.message}`);
      }
      throw err;
    }
  }

  async getWorkflowInstanceById(id: string): Promise<WorkflowInstance | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      SELECT id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at
      FROM workflow_instances
      WHERE id = $1
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToInstance(result.rows[0]);
  }

  async updateWorkflowInstance(
    id: string,
    status?: string,
    currentNodeIds?: string[]
  ): Promise<WorkflowInstance | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const setClauses: string[] = ['instance_version = instance_version + 1', 'updated_at = $1'];
    const values: any[] = [new Date()];
    let paramCount = 2;

    if (status !== undefined) {
      setClauses.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (currentNodeIds !== undefined) {
      setClauses.push(`current_node_ids = $${paramCount}`);
      values.push(currentNodeIds);
      paramCount++;
    }

    values.push(id);

    const query = `
      UPDATE workflow_instances
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, workflow_id, name, status, current_node_ids, instance_version, created_at, updated_at
    `;

    const result = await this.db.query<any>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    this.logger.info({ instanceId: id }, 'Workflow instance updated');
    return this.mapDbToInstance(result.rows[0]);
  }

  private mapDbToInstance(row: any): WorkflowInstance {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      name: row.name,
      status: row.status as InstanceStatus,
      currentNodeIds: row.current_node_ids || [],
      instanceVersion: row.instance_version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
