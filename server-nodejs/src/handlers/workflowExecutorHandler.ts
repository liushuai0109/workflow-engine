import { Context } from 'koa';
import { Logger } from '../pkg/logger';
import { WorkflowEngineService } from '../services/workflowEngineService';
import { WorkflowService } from '../services/workflowService';
import { WorkflowInstanceService } from '../services/workflowInstanceService';
import { Workflow } from '../models/workflow';
import { WorkflowInstance } from '../models/workflowInstance';
import {
  WorkflowError,
  WorkflowInstanceNotFoundError,
  WorkflowNotFoundError,
  NodeNotFoundError,
  InvalidRequestError,
} from '../errors/workflowErrors';
import { getInterceptorContext } from '../middleware/interceptor';
import { InterceptorContext } from '../interceptor/interceptor';

export class WorkflowExecutorHandler {
  constructor(
    private engineService: WorkflowEngineService,
    private workflowService: WorkflowService,
    private instanceService: WorkflowInstanceService,
    private logger: Logger
  ) {}

  /**
   * Execute workflow from a specific node
   * POST /api/workflow-instances/:workflowInstanceId/execute
   */
  executeWorkflow = async (ctx: Context): Promise<void> => {
    const workflowInstanceId = ctx.params.workflowInstanceId;

    if (!workflowInstanceId) {
      ctx.status = 400;
      ctx.body = {
        error: 'INVALID_REQUEST',
        message: 'workflowInstanceId is required',
      };
      return;
    }

    const body = ctx.request.body as any;
    const fromNodeId = body.fromNodeId || '';
    const businessParams = body.businessParams || {};
    const workflow = body.workflow as Workflow | undefined;
    const workflowInstance = body.workflowInstance as WorkflowInstance | undefined;

    // Get interceptor context from middleware
    const interceptorCtx = getInterceptorContext(ctx) || new InterceptorContext();

    try {
      let result;

      if (workflow && workflowInstance) {
        // Mock mode: use provided data directly
        this.logger.info({
          workflowInstanceId,
          msg: 'Executing with provided data (mock mode)',
        });

        result = await this.engineService.executeFromNode(
          interceptorCtx,
          workflow,
          workflowInstance,
          fromNodeId,
          businessParams
        );
      } else {
        // Normal mode: fetch from database
        this.logger.info({
          workflowInstanceId,
          msg: 'Fetching workflow and instance from database',
        });

        // Get workflow instance from database
        const instance = await this.instanceService.getWorkflowInstanceById(workflowInstanceId);
        if (!instance) {
          throw new WorkflowInstanceNotFoundError(workflowInstanceId);
        }

        // Get workflow from database
        const wf = await this.workflowService.getWorkflowById(instance.workflowId);
        if (!wf) {
          throw new WorkflowNotFoundError(instance.workflowId);
        }

        // Call execution engine
        result = await this.engineService.executeFromNode(
          interceptorCtx,
          wf,
          instance,
          fromNodeId,
          businessParams
        );
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          ...result,
          interceptorCalls: ctx.state.interceptorCalls,
        },
      };
    } catch (error) {
      this.logger.error({
        workflowInstanceId,
        fromNodeId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        msg: 'Failed to execute workflow',
      });

      // Handle specific error types with appropriate status codes
      if (error instanceof WorkflowInstanceNotFoundError || error instanceof WorkflowNotFoundError) {
        ctx.status = 404;
        ctx.body = {
          error: (error as WorkflowError).code,
          message: error.message,
          details: (error as WorkflowError).details,
        };
        return;
      }

      if (
        error instanceof NodeNotFoundError ||
        error instanceof InvalidRequestError ||
        error instanceof WorkflowError
      ) {
        const workflowError = error as WorkflowError;
        ctx.status = 400;
        ctx.body = {
          error: workflowError.code,
          message: workflowError.message,
          details: workflowError.details,
        };
        return;
      }

      // Generic error
      ctx.status = 500;
      ctx.body = {
        error: 'INTERNAL_ERROR',
        message: 'Failed to execute workflow',
      };
    }
  };

  /**
   * Execute workflow in mock mode (workflow and instance from request body)
   * POST /api/workflow-instances/execute-mock
   */
  executeWorkflowMock = async (ctx: Context): Promise<void> => {
    const body = ctx.request.body as any;
    const fromNodeId = body.fromNodeId || '';
    const businessParams = body.businessParams || {};
    const workflow = body.workflow as Workflow | undefined;
    const workflowInstance = body.workflowInstance as WorkflowInstance | undefined;

    if (!workflow || !workflowInstance) {
      throw new InvalidRequestError('workflow and workflowInstance are required for mock mode');
    }

    const workflowInstanceId = workflowInstance.id;

    // Get interceptor context from middleware
    const interceptorCtx = getInterceptorContext(ctx) || new InterceptorContext();

    this.logger.info({
      workflowInstanceId,
      workflowId: workflow.id,
      msg: 'Executing workflow in mock mode (full data from request body)',
    });

    try {
      const result = await this.engineService.executeFromNode(
        interceptorCtx,
        workflow,
        workflowInstance,
        fromNodeId,
        businessParams
      );

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          ...result,
          interceptorCalls: ctx.state.interceptorCalls,
        },
      };
    } catch (error) {
      this.logger.error({
        workflowInstanceId,
        fromNodeId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        msg: 'Failed to execute workflow in mock mode',
      });

      if (error instanceof NodeNotFoundError) {
        ctx.status = 400;
        ctx.body = {
          error: (error as WorkflowError).code,
          message: error.message,
          details: (error as WorkflowError).details,
        };
        return;
      }

      if (error instanceof WorkflowError) {
        const workflowError = error as WorkflowError;
        ctx.status = 400;
        ctx.body = {
          error: workflowError.code,
          message: workflowError.message,
          details: workflowError.details,
        };
        return;
      }

      ctx.status = 500;
      ctx.body = {
        error: 'INTERNAL_ERROR',
        message: 'Failed to execute workflow in mock mode',
      };
    }
  };
}
