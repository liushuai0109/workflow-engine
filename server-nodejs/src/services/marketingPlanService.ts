import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';
import { MarketingPlan, MarketingPlanStatus } from '../models/marketingPlan';
import { v4 as uuidv4 } from 'uuid';

export class MarketingPlanService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async createPlan(conversationId: string, plan: Partial<MarketingPlan>): Promise<MarketingPlan> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const id = uuidv4();
    const version = 1;
    const status = plan.status || MarketingPlanStatus.DRAFT;

    const query = `
      INSERT INTO marketing_plans (
        id, conversation_id, version, status,
        title, description,
        timeline, objectives, channels, target_audience, strategies,
        budget, raw_content,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [
      id,
      conversationId,
      version,
      status,
      plan.title || '',
      plan.description || null,
      JSON.stringify(plan.timeline || {}),
      JSON.stringify(plan.objectives || {}),
      JSON.stringify(plan.channels || []),
      JSON.stringify(plan.targetAudience || {}),
      JSON.stringify(plan.strategies || []),
      JSON.stringify(plan.budget || null),
      plan.rawContent || null,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create marketing plan');
    }

    this.logger.info({ planId: id }, 'Marketing plan created');
    return this.mapDbToPlan(result.rows[0]);
  }

  async getPlanById(id: string): Promise<MarketingPlan | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      SELECT * FROM marketing_plans WHERE id = $1
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToPlan(result.rows[0]);
  }

  async getPlanByConversationId(conversationId: string): Promise<MarketingPlan | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      SELECT * FROM marketing_plans
      WHERE conversation_id = $1
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await this.db.query<any>(query, [conversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToPlan(result.rows[0]);
  }

  async listPlans(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: MarketingPlanStatus;
      conversationId?: string;
    }
  ): Promise<{
    data: MarketingPlan[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.conversationId) {
      conditions.push(`conversation_id = $${paramIndex++}`);
      params.push(filters.conversationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM marketing_plans ${whereClause}`;
    const countResult = await this.db.query<any>(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated data
    const query = `
      SELECT * FROM marketing_plans
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(pageSize, offset);

    const result = await this.db.query<any>(query, params);

    return {
      data: result.rows.map((row) => this.mapDbToPlan(row)),
      total,
      page,
      pageSize,
    };
  }

  async updatePlan(id: string, updates: Partial<MarketingPlan>): Promise<MarketingPlan> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }

    if (updates.timeline !== undefined) {
      fields.push(`timeline = $${paramIndex++}`);
      params.push(JSON.stringify(updates.timeline));
    }

    if (updates.objectives !== undefined) {
      fields.push(`objectives = $${paramIndex++}`);
      params.push(JSON.stringify(updates.objectives));
    }

    if (updates.channels !== undefined) {
      fields.push(`channels = $${paramIndex++}`);
      params.push(JSON.stringify(updates.channels));
    }

    if (updates.targetAudience !== undefined) {
      fields.push(`target_audience = $${paramIndex++}`);
      params.push(JSON.stringify(updates.targetAudience));
    }

    if (updates.strategies !== undefined) {
      fields.push(`strategies = $${paramIndex++}`);
      params.push(JSON.stringify(updates.strategies));
    }

    if (updates.budget !== undefined) {
      fields.push(`budget = $${paramIndex++}`);
      params.push(JSON.stringify(updates.budget));
    }

    if (updates.rawContent !== undefined) {
      fields.push(`raw_content = $${paramIndex++}`);
      params.push(updates.rawContent);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`version = version + 1`);

    params.push(id);
    const query = `
      UPDATE marketing_plans
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query<any>(query, params);

    if (result.rows.length === 0) {
      throw new Error('Marketing plan not found');
    }

    this.logger.info({ planId: id }, 'Marketing plan updated');
    return this.mapDbToPlan(result.rows[0]);
  }

  async deletePlan(id: string): Promise<void> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `DELETE FROM marketing_plans WHERE id = $1`;
    await this.db.query(query, [id]);

    this.logger.info({ planId: id }, 'Marketing plan deleted');
  }

  private mapDbToPlan(row: any): MarketingPlan {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      version: row.version,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      title: row.title,
      description: row.description,
      timeline: typeof row.timeline === 'string' ? JSON.parse(row.timeline) : row.timeline,
      objectives: typeof row.objectives === 'string' ? JSON.parse(row.objectives) : row.objectives,
      channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels,
      targetAudience:
        typeof row.target_audience === 'string'
          ? JSON.parse(row.target_audience)
          : row.target_audience,
      strategies: typeof row.strategies === 'string' ? JSON.parse(row.strategies) : row.strategies,
      budget: row.budget ? (typeof row.budget === 'string' ? JSON.parse(row.budget) : row.budget) : undefined,
      rawContent: row.raw_content,
    };
  }
}
