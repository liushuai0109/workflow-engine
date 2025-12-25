import { Logger } from '../pkg/logger';
import { WorkflowInstanceService } from './workflowInstanceService';
import { WorkflowExecutionService } from './workflowExecutionService';
import { Workflow } from '../models/workflow';
import { WorkflowInstance, InstanceStatus } from '../models/workflowInstance';
import { WorkflowExecution, ExecutionStatus } from '../models/workflowExecution';
import axios, { AxiosInstance } from 'axios';
import { parseBPMN } from '../parser/bpmnParser';
import {
  NodeNotFoundError,
  InvalidRequestError,
  FallbackNotAllowedError,
  SkippedStepError,
  BoundaryEventError,
  ServiceTaskError,
  ConditionEvaluationError,
  NoMatchingFlowError,
  ExecutionError,
} from '../errors/workflowErrors';
import { InterceptorContext, intercept } from '../interceptor/interceptor';

// Interfaces for execution results
export interface BusinessResponse {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

export interface EngineResponse {
  instanceId: string;
  currentNodeIds: string[];
  nextNodeIds?: string[];
  status: string;
  executionId: string;
  variables: Record<string, any>;
}

export interface ExecuteResult {
  businessResponse?: BusinessResponse;
  engineResponse: EngineResponse;
  requestParams?: Record<string, any>;
}

// Node types from BPMN parser (matching Go implementation)
export enum NodeType {
  TASK = 1,
  SERVICE_TASK = 2,
  USER_TASK = 3,
  EXCLUSIVE_GATEWAY = 4,
  PARALLEL_GATEWAY = 5,
  EVENT_BASED_GATEWAY = 6,
  START_EVENT = 7,
  END_EVENT = 8,
  INTERMEDIATE_CATCH_EVENT = 9,
  BOUNDARY_EVENT = 10,
}

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  businessApiUrl?: string;
  outgoingSequenceFlowIds: string[];
  incomingSequenceFlowIds: string[];
  attachedNodeId?: string;
  canFallback: boolean;
}

export interface SequenceFlow {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionExpression?: string;
}

export interface WorkflowDefinition {
  processId: string;
  startEvents: string[];
  nodes: Record<string, Node>;
  sequenceFlows: Record<string, SequenceFlow>;
  adjacencyList: Record<string, string[]>;
  reverseAdjacencyList: Record<string, string[]>;
}

export class WorkflowEngineService {
  private httpClient: AxiosInstance;

  constructor(
    private logger: Logger,
    private instanceService: WorkflowInstanceService,
    private executionService: WorkflowExecutionService
  ) {
    this.httpClient = axios.create({
      timeout: 30000,
    });
  }

  // --- Interceptor wrapper methods ---

  private updateInstance = async (params: {
    instanceId: string;
    status: string;
    nextNodes: string[];
  }): Promise<WorkflowInstance | null> => {
    return await this.instanceService.updateWorkflowInstance(
      params.instanceId,
      params.status,
      params.nextNodes
    );
  };

  private createExecution = async (params: {
    instanceId: string;
    workflowId: string;
    variables: Record<string, any>;
  }): Promise<WorkflowExecution | null> => {
    return await this.executionService.createWorkflowExecution(
      params.instanceId,
      params.workflowId,
      params.variables
    );
  };

  private updateExecution = async (params: {
    executionId: string;
    status: string;
    variables: Record<string, any>;
    errorMessage: string;
  }): Promise<WorkflowExecution | null> => {
    return await this.executionService.updateWorkflowExecution(
      params.executionId,
      params.status as ExecutionStatus,
      params.variables,
      params.errorMessage
    );
  };

  private executeNodeWrapper = async (params: {
    node: Node;
    businessParams?: Record<string, any>;
    variables?: Record<string, any>;
  }): Promise<ExecuteResult | null> => {
    return await this.executeNode(params.node, params.businessParams, params.variables);
  };

  /**
   * Execute workflow from a specific node
   */
  async executeFromNode(
    interceptorCtx: InterceptorContext,
    workflow: Workflow,
    instance: WorkflowInstance,
    fromNodeId: string,
    businessParams?: Record<string, any>
  ): Promise<ExecuteResult> {
    this.logger.info({
      workflowId: workflow.id,
      instanceId: instance.id,
      fromNodeId,
      msg: 'Starting workflow execution',
    });

    // Store request params for response
    const requestParams = {
      workflowId: workflow.id,
      instanceId: instance.id,
      fromNodeId,
      businessParams,
    };

    // Parse BPMN XML
    const workflowDef = await this.parseBPMN(workflow.bpmnXml);

    // Handle empty fromNodeId: use current_node_ids
    let actualFromNodeId = fromNodeId;
    if (!actualFromNodeId) {
      if (!instance.currentNodeIds || instance.currentNodeIds.length === 0) {
        throw new InvalidRequestError('No current nodes in workflow instance');
      }
      actualFromNodeId = instance.currentNodeIds[0];
      this.logger.info({
        instanceId: instance.id,
        fromNodeId: actualFromNodeId,
        msg: 'Empty fromNodeId provided, using first current node',
      });
    }

    // Initialize current_node_ids if empty
    if (!instance.currentNodeIds || instance.currentNodeIds.length === 0) {
      if (!workflowDef.startEvents || workflowDef.startEvents.length === 0) {
        throw new InvalidRequestError('Workflow has no start events');
      }

      this.logger.info({
        instanceId: instance.id,
        startEvents: workflowDef.startEvents,
        msg: 'Initializing current_node_ids with start events',
      });

      // Use interceptor to update database (or use mock data if configured)
      const updatedInstance = await intercept(
        interceptorCtx,
        'UpdateInstance',
        this.updateInstance,
        {
          instanceId: instance.id,
          status: instance.status,
          nextNodes: workflowDef.startEvents,
        }
      );

      if (updatedInstance) {
        instance.currentNodeIds = updatedInstance.currentNodeIds;
      }
    }

    // Validate fromNodeId exists
    const node = workflowDef.nodes[actualFromNodeId];
    if (!node) {
      throw new NodeNotFoundError(actualFromNodeId);
    }

    // Check and handle rollback
    const rollbackAction = this.checkAndHandleRollback(
      workflowDef,
      node,
      instance.currentNodeIds
    );

    if (rollbackAction.needsRollback) {
      this.logger.info({
        fromNodeId: actualFromNodeId,
        currentNodeIds: instance.currentNodeIds,
        targetNodeIds: rollbackAction.targetNodeIds,
        msg: 'Rollback needed, updating current node IDs',
      });
      // Update instance's current node IDs to rollback target nodes
      instance.currentNodeIds = rollbackAction.targetNodeIds;
    }

    // Create execution record
    const variables = businessParams || {};

    // Use interceptor to create execution (or use mock data if configured)
    const createdExecution = await intercept(
      interceptorCtx,
      'CreateExecution',
      this.createExecution,
      {
        instanceId: instance.id,
        workflowId: workflow.id,
        variables,
      }
    );

    if (!createdExecution) {
      throw new ExecutionError('Failed to create workflow execution');
    }

    // Update to Running status (using interceptor)
    const execution = await intercept(
      interceptorCtx,
      'UpdateExecution',
      this.updateExecution,
      {
        executionId: createdExecution.id,
        status: ExecutionStatus.RUNNING,
        variables: {},
        errorMessage: '',
      }
    );

    if (!execution) {
      throw new ExecutionError('Failed to update execution status', createdExecution.id);
    }

    this.logger.info({
      executionId: execution.id,
      msg: 'Created execution record with Running status',
    });

    // Execute nodes until we hit a waiting node
    let businessResponse: BusinessResponse | undefined;
    let nextNodeIds: string[] = [];
    let currentNode = node;
    let currentNodeId = actualFromNodeId;
    let currentBusinessParams = businessParams;

    while (true) {
      this.logger.info({
        nodeId: currentNodeId,
        nodeType: currentNode.type,
        msg: 'Executing node',
      });

      // Execute current node (using interceptor)
      const nodeResult = await intercept(
        interceptorCtx,
        'ExecuteNode',
        this.executeNodeWrapper,
        {
          node: currentNode,
          businessParams: currentBusinessParams,
          variables: execution.variables,
        }
      );

      if (nodeResult && nodeResult.businessResponse) {
        businessResponse = nodeResult.businessResponse;
      }

      // Check if should auto-advance
      if (!this.shouldAutoAdvance(currentNode.type)) {
        nextNodeIds = [currentNodeId];
        this.logger.info({
          nodeId: currentNodeId,
          nodeType: currentNode.type,
          msg: 'Node type does not auto-advance, staying at current node',
        });
        break;
      }

      // Advance to next node
      nextNodeIds = await this.advanceToNextNode(
        workflowDef,
        currentNode,
        execution.variables
      );

      if (nextNodeIds.length === 0) {
        this.logger.info({
          nodeId: currentNodeId,
          msg: 'No next node, workflow may be completed',
        });
        break;
      }

      // Check if next node is EndEvent
      const nextNode = workflowDef.nodes[nextNodeIds[0]];
      if (!nextNode) {
        throw new NodeNotFoundError(nextNodeIds[0]);
      }

      if (nextNode.type === NodeType.END_EVENT) {
        this.logger.info({
          currentNodeId,
          nextNodeId: nextNodeIds[0],
          msg: 'Next node is EndEvent, stopping execution loop',
        });
        break;
      }

      // Continue to next node
      this.logger.info({
        fromNodeId: currentNodeId,
        toNodeId: nextNodeIds[0],
        msg: 'Auto-advancing to next node',
      });

      currentNode = nextNode;
      currentNodeId = nextNodeIds[0];
      currentBusinessParams = undefined; // Clear for subsequent nodes
    }

    // Check if workflow completed
    let instanceStatus = instance.status;
    let executionStatus = ExecutionStatus.RUNNING;

    if (currentNode.type === NodeType.END_EVENT) {
      instanceStatus = InstanceStatus.COMPLETED;
      executionStatus = ExecutionStatus.COMPLETED;
      nextNodeIds = [];
    } else if (nextNodeIds.length > 0) {
      const nextNode = workflowDef.nodes[nextNodeIds[0]];
      if (nextNode && nextNode.type === NodeType.END_EVENT) {
        instanceStatus = InstanceStatus.COMPLETED;
        executionStatus = ExecutionStatus.COMPLETED;
        nextNodeIds = [];
      }
    }

    // Update execution status (using interceptor)
    await intercept(
      interceptorCtx,
      'UpdateExecution',
      this.updateExecution,
      {
        executionId: execution.id,
        status: executionStatus,
        variables: execution.variables,
        errorMessage: '',
      }
    );

    this.logger.info({
      executionId: execution.id,
      status: executionStatus,
      msg: 'Updated execution status',
    });

    // Update instance status (using interceptor)
    const updatedInstance = await intercept(
      interceptorCtx,
      'UpdateInstance',
      this.updateInstance,
      {
        instanceId: instance.id,
        status: instanceStatus,
        nextNodes: nextNodeIds,
      }
    );

    if (!updatedInstance) {
      throw new ExecutionError('Failed to update workflow instance');
    }

    // Build response
    const result: ExecuteResult = {
      businessResponse,
      engineResponse: {
        instanceId: updatedInstance.id,
        currentNodeIds: updatedInstance.currentNodeIds,
        nextNodeIds,
        status: updatedInstance.status,
        executionId: execution.id,
        variables: execution.variables,
      },
      requestParams,
    };

    return result;
  }

  /**
   * Execute a workflow node based on its type
   */
  private async executeNode(
    node: Node,
    businessParams?: Record<string, any>,
    variables?: Record<string, any>
  ): Promise<ExecuteResult | null> {
    const nodeId = node.id;

    switch (node.type) {
      case NodeType.TASK:
        this.logger.info({ nodeId, msg: 'Task executed (no operation)' });
        return null;

      case NodeType.SERVICE_TASK:
        const businessResponse = await this.executeServiceTask(
          node,
          businessParams,
          variables
        );
        return { businessResponse, engineResponse: {} as any };

      case NodeType.USER_TASK:
        this.logger.info({ nodeId, msg: 'UserTask encountered, returning pending status' });
        return null;

      case NodeType.INTERMEDIATE_CATCH_EVENT:
        this.logger.info({
          nodeId,
          msg: 'IntermediateCatchEvent encountered, waiting for external event',
        });
        return null;

      case NodeType.EVENT_BASED_GATEWAY:
        this.logger.info({
          nodeId,
          msg: 'EventBasedGateway encountered, waiting for event branch',
        });
        return null;

      case NodeType.EXCLUSIVE_GATEWAY:
        this.logger.info({ nodeId, msg: 'ExclusiveGateway encountered, evaluating conditions' });
        return null;

      case NodeType.END_EVENT:
        this.logger.info({ nodeId, msg: 'EndEvent encountered, workflow completed' });
        return null;

      default:
        this.logger.info({
          nodeId,
          nodeType: node.type,
          msg: 'Node type not requiring special execution',
        });
        return null;
    }
  }

  /**
   * Execute a ServiceTask node by calling business API
   */
  private async executeServiceTask(
    node: Node,
    businessParams?: Record<string, any>,
    _variables?: Record<string, any>
  ): Promise<BusinessResponse> {
    if (!node.businessApiUrl) {
      throw new ServiceTaskError(
        `Business API URL not configured for ServiceTask ${node.id}`,
        node.id
      );
    }

    const requestBody = businessParams || {};

    try {
      const response = await this.httpClient.post(node.businessApiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const headers: Record<string, string> = {};
      Object.keys(response.headers).forEach((key) => {
        headers[key] = response.headers[key];
      });

      return {
        statusCode: response.status,
        body: response.data,
        headers,
      };
    } catch (error: any) {
      this.logger.error({
        nodeId: node.id,
        url: node.businessApiUrl,
        error: error.message,
        msg: 'Failed to call business API',
      });
      throw new ServiceTaskError(
        `Failed to call business API: ${error.message}`,
        node.id,
        node.businessApiUrl
      );
    }
  }

  /**
   * Advance workflow to the next node based on sequence flows and conditions
   */
  private async advanceToNextNode(
    workflowDef: WorkflowDefinition,
    currentNode: Node,
    variables: Record<string, any>
  ): Promise<string[]> {
    if (currentNode.outgoingSequenceFlowIds.length === 0) {
      return [];
    }

    const nextNodeIds: string[] = [];

    switch (currentNode.type) {
      case NodeType.EXCLUSIVE_GATEWAY:
        // Evaluate conditions for exclusive gateway
        for (const flowId of currentNode.outgoingSequenceFlowIds) {
          const flow = workflowDef.sequenceFlows[flowId];
          if (!flow) continue;

          // If no condition, use as default flow
          if (!flow.conditionExpression) {
            nextNodeIds.push(flow.targetNodeId);
            break;
          }

          // Evaluate condition
          const matched = await this.evaluateCondition(flow.conditionExpression, variables);
          if (matched) {
            nextNodeIds.push(flow.targetNodeId);
            break;
          }
        }

        if (nextNodeIds.length === 0) {
          throw new NoMatchingFlowError(currentNode.id);
        }
        break;

      default:
        // For other node types, take the first outgoing flow
        if (currentNode.outgoingSequenceFlowIds.length > 0) {
          const flowId = currentNode.outgoingSequenceFlowIds[0];
          const flow = workflowDef.sequenceFlows[flowId];
          if (flow) {
            nextNodeIds.push(flow.targetNodeId);
          }
        }
    }

    return nextNodeIds;
  }

  /**
   * Evaluate a condition expression using workflow variables
   * Note: This is a simplified implementation. For production, consider using a proper expression library.
   */
  private async evaluateCondition(
    conditionExpr: string,
    variables: Record<string, any>
  ): Promise<boolean> {
    if (!conditionExpr) {
      return true;
    }

    try {
      // Simple evaluation using Function constructor
      // WARNING: This is not safe for untrusted input. Use a proper expression library in production.
      const func = new Function(...Object.keys(variables), `return ${conditionExpr};`);
      const result = func(...Object.values(variables));
      return Boolean(result);
    } catch (error) {
      this.logger.error({
        conditionExpr,
        error: error instanceof Error ? error.message : String(error),
        msg: 'Failed to evaluate condition expression',
      });
      throw new ConditionEvaluationError(conditionExpr, error as Error);
    }
  }

  /**
   * Check if the node type should automatically advance to the next node
   */
  private shouldAutoAdvance(nodeType: NodeType): boolean {
    switch (nodeType) {
      case NodeType.USER_TASK:
      case NodeType.INTERMEDIATE_CATCH_EVENT:
      case NodeType.EVENT_BASED_GATEWAY:
        return false;
      default:
        return true;
    }
  }

  /**
   * Parse BPMN XML to workflow definition
   */
  private async parseBPMN(bpmnXml: string): Promise<WorkflowDefinition> {
    return parseBPMN(bpmnXml);
  }

  /**
   * Rollback action result
   */
  private checkAndHandleRollback(
    wd: WorkflowDefinition,
    fromNode: Node,
    currentNodeIds: string[]
  ): { needsRollback: boolean; targetNodeIds: string[] } {
    switch (fromNode.type) {
      case NodeType.BOUNDARY_EVENT:
        return this.handleBoundaryEventRollback(wd, fromNode, currentNodeIds);
      case NodeType.INTERMEDIATE_CATCH_EVENT:
        return this.handleIntermediateCatchEventRollback(wd, fromNode, currentNodeIds);
      default:
        return this.handleOtherNodeRollback(wd, fromNode, currentNodeIds);
    }
  }

  /**
   * Handle rollback logic for BoundaryEvent nodes
   * Rules:
   * 1. attached_node_id cannot be empty
   * 2. If attached_node_id is in current_node_ids, no rollback needed
   * 3. Otherwise rollback needed
   */
  private handleBoundaryEventRollback(
    _wd: WorkflowDefinition,
    fromNode: Node,
    currentNodeIds: string[]
  ): { needsRollback: boolean; targetNodeIds: string[] } {
    // Check if attachedNodeId is empty
    if (!fromNode.attachedNodeId) {
      throw new BoundaryEventError(`BoundaryEvent has no attached node`, fromNode.id);
    }

    // Check if attached_node_id is in current_node_ids
    if (currentNodeIds.includes(fromNode.attachedNodeId)) {
      // Attached node is current node, no rollback needed
      return { needsRollback: false, targetNodeIds: [] };
    }

    // Rollback needed: check can_fallback
    if (!fromNode.canFallback) {
      throw new FallbackNotAllowedError(fromNode.id);
    }

    // Rollback to attached_node
    return {
      needsRollback: true,
      targetNodeIds: [fromNode.attachedNodeId],
    };
  }

  /**
   * Handle rollback logic for IntermediateCatchEvent nodes
   * Rules:
   * 1. If from_node_id is in current_node_ids, no rollback needed
   * 2. Check if predecessor is EVENT_BASED_GATEWAY and in current_node_ids
   * 3. Otherwise rollback needed
   * 4. Check for skipped steps
   */
  private handleIntermediateCatchEventRollback(
    wd: WorkflowDefinition,
    fromNode: Node,
    currentNodeIds: string[]
  ): { needsRollback: boolean; targetNodeIds: string[] } {
    // Check if from_node_id is in current_node_ids
    if (currentNodeIds.includes(fromNode.id)) {
      // From node is current node, no rollback needed
      return { needsRollback: false, targetNodeIds: [] };
    }

    // Check if predecessor is EVENT_BASED_GATEWAY and in current_node_ids
    const predecessors = wd.reverseAdjacencyList[fromNode.id] || [];
    for (const predId of predecessors) {
      const predNode = wd.nodes[predId];
      if (predNode && predNode.type === NodeType.EVENT_BASED_GATEWAY) {
        // Predecessor is EVENT_BASED_GATEWAY, check if in current_node_ids
        if (currentNodeIds.includes(predId)) {
          // EVENT_BASED_GATEWAY is current node, no rollback needed
          return { needsRollback: false, targetNodeIds: [] };
        }
      }
    }

    // Check for skipped steps
    if (this.isNodeAfterCurrentNodes(wd, fromNode.id, currentNodeIds)) {
      throw new SkippedStepError(fromNode.id, currentNodeIds);
    }

    // Rollback needed: check can_fallback
    if (!fromNode.canFallback) {
      throw new FallbackNotAllowedError(fromNode.id);
    }

    // Rollback to from_node
    return {
      needsRollback: true,
      targetNodeIds: [fromNode.id],
    };
  }

  /**
   * Handle rollback logic for other node types
   * Rules:
   * 1. If from_node_id is in current_node_ids, no rollback needed
   * 2. Otherwise rollback needed
   * 3. Check for skipped steps
   */
  private handleOtherNodeRollback(
    wd: WorkflowDefinition,
    fromNode: Node,
    currentNodeIds: string[]
  ): { needsRollback: boolean; targetNodeIds: string[] } {
    // Check if from_node_id is in current_node_ids
    if (currentNodeIds.includes(fromNode.id)) {
      // From node is current node, no rollback needed
      return { needsRollback: false, targetNodeIds: [] };
    }

    // Check for skipped steps
    if (this.isNodeAfterCurrentNodes(wd, fromNode.id, currentNodeIds)) {
      throw new SkippedStepError(fromNode.id, currentNodeIds);
    }

    // Rollback needed: check can_fallback
    if (!fromNode.canFallback) {
      throw new FallbackNotAllowedError(fromNode.id);
    }

    // Rollback to from_node
    return {
      needsRollback: true,
      targetNodeIds: [fromNode.id],
    };
  }

  /**
   * Check if the target node is after all current nodes in the workflow
   * Uses BFS to traverse forward from current nodes
   */
  private isNodeAfterCurrentNodes(
    wd: WorkflowDefinition,
    targetNodeId: string,
    currentNodeIds: string[]
  ): boolean {
    // BFS from current_nodes
    const visited = new Set<string>();
    const queue: string[] = [];

    // Initialize queue
    for (const nodeId of currentNodeIds) {
      queue.push(nodeId);
      visited.add(nodeId);
    }

    // BFS traversal
    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // Get successor nodes
      const successors = wd.adjacencyList[currentId] || [];
      for (const succId of successors) {
        if (succId === targetNodeId) {
          // Found target node, it's after current_nodes
          return true;
        }
        if (!visited.has(succId)) {
          visited.add(succId);
          queue.push(succId);
        }
      }
    }

    return false;
  }
}
