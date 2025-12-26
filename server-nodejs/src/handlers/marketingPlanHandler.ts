import { Context } from 'koa';
import { MarketingPlanService } from '../services/marketingPlanService';
import { Logger } from '../pkg/logger';
import { MarketingPlan, MarketingPlanStatus } from '../models/marketingPlan';

export class MarketingPlanHandler {
  constructor(
    private service: MarketingPlanService,
    private logger: Logger
  ) {}

  // POST /api/marketing-plans - Create marketing plan
  createPlan = async (ctx: Context): Promise<void> => {
    try {
      const planData: Partial<MarketingPlan> = ctx.request.body as any;

      if (!planData.conversationId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: { message: 'conversationId is required' },
        };
        return;
      }

      const plan = await this.service.createPlan(planData.conversationId, planData);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: plan,
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to create marketing plan');
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: { message: error.message || 'Internal server error' },
      };
    }
  };

  // GET /api/marketing-plans - List marketing plans
  listPlans = async (ctx: Context): Promise<void> => {
    try {
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = parseInt(ctx.query.pageSize as string) || 20;
      const status = ctx.query.status as MarketingPlanStatus | undefined;
      const conversationId = ctx.query.conversationId as string | undefined;

      const result = await this.service.listPlans(page, pageSize, {
        status,
        conversationId,
      });

      ctx.body = {
        success: true,
        data: result.data,
        metadata: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          hasMore: result.page * result.pageSize < result.total,
        },
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to list marketing plans');
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: { message: error.message || 'Internal server error' },
      };
    }
  };

  // GET /api/marketing-plans/:id - Get marketing plan by ID
  getPlan = async (ctx: Context): Promise<void> => {
    try {
      const { id } = ctx.params;

      const plan = await this.service.getPlanById(id);

      if (!plan) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: { message: 'Marketing plan not found' },
        };
        return;
      }

      ctx.body = {
        success: true,
        data: plan,
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to get marketing plan');
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: { message: error.message || 'Internal server error' },
      };
    }
  };

  // PUT /api/marketing-plans/:id - Update marketing plan
  updatePlan = async (ctx: Context): Promise<void> => {
    try {
      const { id } = ctx.params;
      const updates: Partial<MarketingPlan> = ctx.request.body as any;

      const plan = await this.service.updatePlan(id, updates);

      ctx.body = {
        success: true,
        data: plan,
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to update marketing plan');

      if (error.message === 'Marketing plan not found') {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: { message: error.message },
        };
        return;
      }

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: { message: error.message || 'Internal server error' },
      };
    }
  };

  // DELETE /api/marketing-plans/:id - Delete marketing plan
  deletePlan = async (ctx: Context): Promise<void> => {
    try {
      const { id } = ctx.params;

      await this.service.deletePlan(id);

      ctx.body = {
        success: true,
        message: 'Marketing plan deleted successfully',
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to delete marketing plan');
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: { message: error.message || 'Internal server error' },
      };
    }
  };

  // GET /api/conversations/:id/plan - Get plan by conversation ID
  getPlanByConversation = async (ctx: Context): Promise<void> => {
    try {
      const { id } = ctx.params;

      const plan = await this.service.getPlanByConversationId(id);

      if (!plan) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: { message: 'No marketing plan found for this conversation' },
        };
        return;
      }

      ctx.body = {
        success: true,
        data: plan,
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to get marketing plan by conversation');
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: { message: error.message || 'Internal server error' },
      };
    }
  };
}
