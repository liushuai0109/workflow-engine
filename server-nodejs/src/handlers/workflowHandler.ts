import { Context } from 'koa';
import { WorkflowService } from '../services/workflowService';
import { Logger } from '../pkg/logger';
import { ApiResponse, PaginationMetadata } from '../models/response';

export class WorkflowHandler {
  constructor(
    private service: WorkflowService,
    private logger: Logger
  ) {}

  createWorkflow = async (ctx: Context) => {
    const { name, description, bpmnXml } = ctx.request.body as any;

    if (!name || !bpmnXml) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required fields: name and bpmnXml',
      } as ApiResponse;
      return;
    }

    try {
      const workflow = await this.service.createWorkflow(name, description, bpmnXml);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: workflow,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to create workflow');

      if (err.message.includes('database not available')) {
        ctx.status = 503;
        ctx.body = {
          success: false,
          error: 'Database is not available. Please ensure PostgreSQL is running and configured.',
        } as ApiResponse;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: 'Failed to create workflow',
        } as ApiResponse;
      }
    }
  };

  getWorkflow = async (ctx: Context) => {
    const { workflowId } = ctx.params;

    try {
      const workflow = await this.service.getWorkflowById(workflowId);

      if (!workflow) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Workflow not found',
        } as ApiResponse;
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: workflow,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, workflowId }, 'Failed to get workflow');

      if (err.message.includes('database not available')) {
        ctx.status = 503;
        ctx.body = {
          success: false,
          error: 'Database is not available',
        } as ApiResponse;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: 'Failed to get workflow',
        } as ApiResponse;
      }
    }
  };

  updateWorkflow = async (ctx: Context) => {
    const { workflowId } = ctx.params;
    const updates = ctx.request.body as any;

    try {
      const workflow = await this.service.updateWorkflow(workflowId, updates);

      if (!workflow) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Workflow not found',
        } as ApiResponse;
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: workflow,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, workflowId }, 'Failed to update workflow');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to update workflow',
      } as ApiResponse;
    }
  };

  listWorkflows = async (ctx: Context) => {
    const page = parseInt(ctx.query.page as string) || 1;
    const pageSize = parseInt(ctx.query.pageSize as string) || 20;

    try {
      const { workflows, total, hasMore } = await this.service.listWorkflows(page, pageSize);

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: workflows,
        metadata: {
          page,
          pageSize,
          total,
          hasMore,
        } as PaginationMetadata,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to list workflows');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to list workflows',
      } as ApiResponse;
    }
  };
}
