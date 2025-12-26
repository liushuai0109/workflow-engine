import Router from '@koa/router';
import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';
import { WorkflowHandler } from '../handlers/workflowHandler';
import { UserHandler } from '../handlers/userHandler';
import { ChatConversationHandler } from '../handlers/chatConversationHandler';
import { ClaudeHandler } from '../handlers/claudeHandler';
import { healthCheck } from '../handlers/health';
import { WorkflowService } from '../services/workflowService';
import { UserService } from '../services/userService';
import { ChatConversationService } from '../services/chatConversationService';
import { ChatMessageService } from '../services/chatMessageService';
import { WorkflowInstanceService } from '../services/workflowInstanceService';
import { WorkflowExecutionService } from '../services/workflowExecutionService';
import { WorkflowEngineService } from '../services/workflowEngineService';
import { WorkflowExecutorHandler } from '../handlers/workflowExecutorHandler';
import { MarketingPlanService } from '../services/marketingPlanService';
import { MarketingPlanHandler } from '../handlers/marketingPlanHandler';

export function setupRoutes(db: Database, logger: Logger): Router {
  const router = new Router();

  // Initialize services
  const workflowService = new WorkflowService(db);
  const userService = new UserService(db);
  const chatConversationService = new ChatConversationService(db, logger);
  const chatMessageService = new ChatMessageService(db, logger);
  const workflowInstanceService = new WorkflowInstanceService(db, logger);
  const workflowExecutionService = new WorkflowExecutionService(db, logger);
  const workflowEngineService = new WorkflowEngineService(
    logger,
    workflowInstanceService,
    workflowExecutionService
  );
  const marketingPlanService = new MarketingPlanService(db, logger);

  // Initialize handlers
  const workflowHandler = new WorkflowHandler(workflowService, logger);
  const userHandler = new UserHandler(userService, logger);
  const chatHandler = new ChatConversationHandler(
    chatConversationService,
    chatMessageService,
    logger
  );
  const claudeHandler = new ClaudeHandler(logger);
  const workflowExecutorHandler = new WorkflowExecutorHandler(
    workflowEngineService,
    workflowService,
    workflowInstanceService,
    logger
  );
  const marketingPlanHandler = new MarketingPlanHandler(marketingPlanService, logger);

  // Health check
  router.get('/health', async (ctx) => {
    await healthCheck(ctx, db, logger);
  });

  // API routes
  const api = '/api';

  // User routes
  router.post(`${api}/users`, userHandler.createUser);
  router.get(`${api}/users/:userId`, userHandler.getUser);
  router.put(`${api}/users/:userId`, userHandler.updateUser);

  // Workflow routes
  router.post(`${api}/workflows`, workflowHandler.createWorkflow);
  router.get(`${api}/workflows/:workflowId`, workflowHandler.getWorkflow);
  router.put(`${api}/workflows/:workflowId`, workflowHandler.updateWorkflow);
  router.get(`${api}/workflows`, workflowHandler.listWorkflows);

  // Chat conversation routes
  router.post(`${api}/chat/conversations`, chatHandler.createConversation);
  router.get(`${api}/chat/conversations`, chatHandler.getConversations);
  router.get(`${api}/chat/conversations/:id`, chatHandler.getConversation);
  router.put(`${api}/chat/conversations/:id`, chatHandler.updateConversation);
  router.delete(`${api}/chat/conversations/:id`, chatHandler.deleteConversation);
  router.post(`${api}/chat/conversations/:id/messages`, chatHandler.addMessage);
  router.post(`${api}/chat/conversations/:id/messages/batch`, chatHandler.batchAddMessages);

  // Claude API proxy routes
  router.post(`${api}/claude/v1/messages`, claudeHandler.proxyMessages);

  // Workflow execution routes
  router.post(`${api}/workflow-instances/:workflowInstanceId/execute`, workflowExecutorHandler.executeWorkflow);
  router.post(`${api}/workflow-instances/execute-mock`, workflowExecutorHandler.executeWorkflowMock);

  // Legacy workflow execution routes (for backward compatibility)
  router.post(`${api}/execute`, workflowExecutorHandler.executeWorkflowMock);
  router.post(`${api}/execute/:workflowInstanceId`, workflowExecutorHandler.executeWorkflow);

  // Marketing plan routes
  router.post(`${api}/marketing-plans`, marketingPlanHandler.createPlan);
  router.get(`${api}/marketing-plans`, marketingPlanHandler.listPlans);
  router.get(`${api}/marketing-plans/:id`, marketingPlanHandler.getPlan);
  router.put(`${api}/marketing-plans/:id`, marketingPlanHandler.updatePlan);
  router.delete(`${api}/marketing-plans/:id`, marketingPlanHandler.deletePlan);
  router.get(`${api}/conversations/:id/plan`, marketingPlanHandler.getPlanByConversation);

  return router;
}

