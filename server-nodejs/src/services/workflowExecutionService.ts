import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';
import { WorkflowExecution, ExecutionStatus } from '../models/workflowExecution';
import { PaginationMetadata } from '../models/response';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowExecutionService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async createWorkflowExecution(
    instanceId: string,
    workflowId: string,
    variables: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const id = uuidv4();

    // Get instance version for execution version
    const instanceQuery = 'SELECT instance_version FROM workflow_instances WHERE id = $1';
    const instanceResult = await this.db.query<any>(instanceQuery, [instanceId]);

    if (instanceResult.rows.length === 0) {
      throw new Error('Workflow instance not found');
    }

    const instanceVersion = instanceResult.rows[0].instance_version;
    const now = new Date();

    const query = `
      INSERT INTO workflow_executions (id, instance_id, workflow_id, status, variables, execution_version, started_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        instanceId,
        workflowId,
        ExecutionStatus.PENDING,
        JSON.stringify(variables),
        instanceVersion,
        now,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Failed to create workflow execution');
      }

      this.logger.info({ executionId: id, instanceId }, 'Workflow execution created');
      return this.mapDbToExecution(result.rows[0]);
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to create workflow execution');
      if (err.code === '23503') {
        // Foreign key violation
        throw new Error(`Foreign key violation: ${err.message}`);
      }
      throw err;
    }
  }

  async getWorkflowExecutionById(id: string): Promise<WorkflowExecution | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
      FROM workflow_executions
      WHERE id = $1
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToExecution(result.rows[0]);
  }

  async updateWorkflowExecution(
    id: string,
    status?: string,
    variables?: Record<string, any>,
    errorMessage?: string
  ): Promise<WorkflowExecution | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const setClauses: string[] = ['updated_at = $1'];
    const values: any[] = [new Date()];
    let paramCount = 2;

    if (status !== undefined) {
      setClauses.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;

      // Set completed_at if status is completed or failed
      if (status === ExecutionStatus.COMPLETED || status === ExecutionStatus.FAILED) {
        setClauses.push(`completed_at = $${paramCount}`);
        values.push(new Date());
        paramCount++;
      }
    }

    if (variables !== undefined) {
      setClauses.push(`variables = variables || $${paramCount}::jsonb`);
      values.push(JSON.stringify(variables));
      paramCount++;
    }

    if (errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramCount}`);
      values.push(errorMessage);
      paramCount++;
    }

    values.push(id);

    const query = `
      UPDATE workflow_executions
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
    `;

    const result = await this.db.query<any>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    this.logger.info({ executionId: id }, 'Workflow execution updated');
    return this.mapDbToExecution(result.rows[0]);
  }

  async listWorkflowExecutions(
    page: number = 1,
    pageSize: number = 20,
    instanceId?: string,
    workflowId?: string,
    status?: string
  ): Promise<{
    executions: WorkflowExecution[];
    metadata: PaginationMetadata;
  }> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    // Validate pagination
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    let whereClause = '1=1';
    const args: any[] = [];
    let argIndex = 1;

    if (instanceId) {
      whereClause += ` AND instance_id = $${argIndex}`;
      args.push(instanceId);
      argIndex++;
    }
    if (workflowId) {
      whereClause += ` AND workflow_id = $${argIndex}`;
      args.push(workflowId);
      argIndex++;
    }
    if (status) {
      whereClause += ` AND status = $${argIndex}`;
      args.push(status);
      argIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM workflow_executions WHERE ${whereClause}`;
    const countResult = await this.db.query(countQuery, args);
    const total = parseInt(countResult.rows[0].count);

    // Get executions
    const query = `
      SELECT id, instance_id, workflow_id, status, variables, execution_version, started_at, completed_at, error_message
      FROM workflow_executions
      WHERE ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${argIndex} OFFSET $${argIndex + 1}
    `;

    const result = await this.db.query<any>(query, [...args, pageSize, offset]);

    const executions = result.rows.map(this.mapDbToExecution);
    const hasMore = page * pageSize < total;

    return {
      executions,
      metadata: {
        page,
        pageSize,
        total,
        hasMore,
      },
    };
  }

  private mapDbToExecution(row: any): WorkflowExecution {
    let variables = {};
    if (row.variables) {
      if (typeof row.variables === 'string') {
        variables = JSON.parse(row.variables);
      } else {
        variables = row.variables;
      }
    }

    return {
      id: row.id,
      instanceId: row.instance_id,
      workflowId: row.workflow_id,
      status: row.status as ExecutionStatus,
      variables,
      executionVersion: row.execution_version,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message || undefined,
    };
  }
}
