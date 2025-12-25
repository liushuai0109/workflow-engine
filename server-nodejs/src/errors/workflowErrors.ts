/**
 * Custom error classes for workflow engine
 */

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WorkflowError';
    Object.setPrototypeOf(this, WorkflowError.prototype);
  }
}

export class BPMNParseError extends WorkflowError {
  constructor(message: string, details?: any) {
    super(message, 'BPMN_PARSE_ERROR', details);
    this.name = 'BPMNParseError';
    Object.setPrototypeOf(this, BPMNParseError.prototype);
  }
}

export class NodeNotFoundError extends WorkflowError {
  constructor(nodeId: string) {
    super(`Node ${nodeId} not found in workflow definition`, 'NODE_NOT_FOUND', { nodeId });
    this.name = 'NodeNotFoundError';
    Object.setPrototypeOf(this, NodeNotFoundError.prototype);
  }
}

export class WorkflowInstanceNotFoundError extends WorkflowError {
  constructor(instanceId: string) {
    super(`Workflow instance ${instanceId} not found`, 'INSTANCE_NOT_FOUND', { instanceId });
    this.name = 'WorkflowInstanceNotFoundError';
    Object.setPrototypeOf(this, WorkflowInstanceNotFoundError.prototype);
  }
}

export class WorkflowNotFoundError extends WorkflowError {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} not found`, 'WORKFLOW_NOT_FOUND', { workflowId });
    this.name = 'WorkflowNotFoundError';
    Object.setPrototypeOf(this, WorkflowNotFoundError.prototype);
  }
}

export class RollbackError extends WorkflowError {
  constructor(message: string, details?: any) {
    super(message, 'ROLLBACK_ERROR', details);
    this.name = 'RollbackError';
    Object.setPrototypeOf(this, RollbackError.prototype);
  }
}

export class FallbackNotAllowedError extends RollbackError {
  constructor(nodeId: string) {
    super(`Node ${nodeId} does not allow fallback`, { nodeId });
    this.name = 'FallbackNotAllowedError';
    Object.setPrototypeOf(this, FallbackNotAllowedError.prototype);
  }
}

export class SkippedStepError extends RollbackError {
  constructor(fromNodeId: string, currentNodeIds: string[]) {
    super(
      `Cannot skip from current nodes to node ${fromNodeId}`,
      { fromNodeId, currentNodeIds }
    );
    this.name = 'SkippedStepError';
    Object.setPrototypeOf(this, SkippedStepError.prototype);
  }
}

export class BoundaryEventError extends WorkflowError {
  constructor(message: string, nodeId: string) {
    super(message, 'BOUNDARY_EVENT_ERROR', { nodeId });
    this.name = 'BoundaryEventError';
    Object.setPrototypeOf(this, BoundaryEventError.prototype);
  }
}

export class ServiceTaskError extends WorkflowError {
  constructor(message: string, nodeId: string, url?: string) {
    super(message, 'SERVICE_TASK_ERROR', { nodeId, url });
    this.name = 'ServiceTaskError';
    Object.setPrototypeOf(this, ServiceTaskError.prototype);
  }
}

export class ConditionEvaluationError extends WorkflowError {
  constructor(expression: string, error: Error) {
    super(
      `Failed to evaluate condition: ${expression}`,
      'CONDITION_EVALUATION_ERROR',
      { expression, originalError: error.message }
    );
    this.name = 'ConditionEvaluationError';
    Object.setPrototypeOf(this, ConditionEvaluationError.prototype);
  }
}

export class NoMatchingFlowError extends WorkflowError {
  constructor(gatewayId: string) {
    super(
      `No matching sequence flow found for ExclusiveGateway ${gatewayId}`,
      'NO_MATCHING_FLOW',
      { gatewayId }
    );
    this.name = 'NoMatchingFlowError';
    Object.setPrototypeOf(this, NoMatchingFlowError.prototype);
  }
}

export class InvalidRequestError extends WorkflowError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_REQUEST', details);
    this.name = 'InvalidRequestError';
    Object.setPrototypeOf(this, InvalidRequestError.prototype);
  }
}

export class ExecutionError extends WorkflowError {
  constructor(message: string, executionId?: string, details?: any) {
    super(message, 'EXECUTION_ERROR', { executionId, ...details });
    this.name = 'ExecutionError';
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}
