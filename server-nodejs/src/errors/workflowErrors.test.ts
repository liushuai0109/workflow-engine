import {
  WorkflowError,
  BPMNParseError,
  NodeNotFoundError,
  WorkflowInstanceNotFoundError,
  WorkflowNotFoundError,
  FallbackNotAllowedError,
  SkippedStepError,
  BoundaryEventError,
  ServiceTaskError,
  ConditionEvaluationError,
  NoMatchingFlowError,
  InvalidRequestError,
  ExecutionError,
} from '../workflowErrors';

describe('Workflow Errors', () => {
  describe('WorkflowError', () => {
    it('should create error with code and details', () => {
      const error = new WorkflowError('Test error', 'TEST_CODE', { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ key: 'value' });
      expect(error.name).toBe('WorkflowError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WorkflowError);
    });
  });

  describe('BPMNParseError', () => {
    it('should create error with BPMN_PARSE_ERROR code', () => {
      const error = new BPMNParseError('Failed to parse XML', { line: 10 });

      expect(error.message).toBe('Failed to parse XML');
      expect(error.code).toBe('BPMN_PARSE_ERROR');
      expect(error.details).toEqual({ line: 10 });
      expect(error.name).toBe('BPMNParseError');
    });
  });

  describe('NodeNotFoundError', () => {
    it('should create error with node ID in details', () => {
      const error = new NodeNotFoundError('Node123');

      expect(error.message).toBe('Node Node123 not found in workflow definition');
      expect(error.code).toBe('NODE_NOT_FOUND');
      expect(error.details).toEqual({ nodeId: 'Node123' });
      expect(error.name).toBe('NodeNotFoundError');
    });
  });

  describe('WorkflowInstanceNotFoundError', () => {
    it('should create error with instance ID in details', () => {
      const error = new WorkflowInstanceNotFoundError('Instance123');

      expect(error.message).toBe('Workflow instance Instance123 not found');
      expect(error.code).toBe('INSTANCE_NOT_FOUND');
      expect(error.details).toEqual({ instanceId: 'Instance123' });
      expect(error.name).toBe('WorkflowInstanceNotFoundError');
    });
  });

  describe('WorkflowNotFoundError', () => {
    it('should create error with workflow ID in details', () => {
      const error = new WorkflowNotFoundError('Workflow123');

      expect(error.message).toBe('Workflow Workflow123 not found');
      expect(error.code).toBe('WORKFLOW_NOT_FOUND');
      expect(error.details).toEqual({ workflowId: 'Workflow123' });
      expect(error.name).toBe('WorkflowNotFoundError');
    });
  });

  describe('FallbackNotAllowedError', () => {
    it('should create error with node ID in details', () => {
      const error = new FallbackNotAllowedError('Node123');

      expect(error.message).toBe('Node Node123 does not allow fallback');
      expect(error.code).toBe('ROLLBACK_ERROR');
      expect(error.details).toEqual({ nodeId: 'Node123' });
      expect(error.name).toBe('FallbackNotAllowedError');
    });
  });

  describe('SkippedStepError', () => {
    it('should create error with fromNodeId and currentNodeIds in details', () => {
      const error = new SkippedStepError('Node5', ['Node1', 'Node2']);

      expect(error.message).toBe('Cannot skip from current nodes to node Node5');
      expect(error.code).toBe('ROLLBACK_ERROR');
      expect(error.details).toEqual({
        fromNodeId: 'Node5',
        currentNodeIds: ['Node1', 'Node2'],
      });
      expect(error.name).toBe('SkippedStepError');
    });
  });

  describe('BoundaryEventError', () => {
    it('should create error with node ID in details', () => {
      const error = new BoundaryEventError('Boundary event issue', 'BoundaryEvent1');

      expect(error.message).toBe('Boundary event issue');
      expect(error.code).toBe('BOUNDARY_EVENT_ERROR');
      expect(error.details).toEqual({ nodeId: 'BoundaryEvent1' });
      expect(error.name).toBe('BoundaryEventError');
    });
  });

  describe('ServiceTaskError', () => {
    it('should create error with node ID and URL in details', () => {
      const error = new ServiceTaskError(
        'API call failed',
        'ServiceTask1',
        'https://api.example.com'
      );

      expect(error.message).toBe('API call failed');
      expect(error.code).toBe('SERVICE_TASK_ERROR');
      expect(error.details).toEqual({
        nodeId: 'ServiceTask1',
        url: 'https://api.example.com',
      });
      expect(error.name).toBe('ServiceTaskError');
    });
  });

  describe('ConditionEvaluationError', () => {
    it('should create error with expression and original error in details', () => {
      const originalError = new Error('Syntax error');
      const error = new ConditionEvaluationError('amount > 1000', originalError);

      expect(error.message).toBe('Failed to evaluate condition: amount > 1000');
      expect(error.code).toBe('CONDITION_EVALUATION_ERROR');
      expect(error.details).toEqual({
        expression: 'amount > 1000',
        originalError: 'Syntax error',
      });
      expect(error.name).toBe('ConditionEvaluationError');
    });
  });

  describe('NoMatchingFlowError', () => {
    it('should create error with gateway ID in details', () => {
      const error = new NoMatchingFlowError('Gateway1');

      expect(error.message).toBe('No matching sequence flow found for ExclusiveGateway Gateway1');
      expect(error.code).toBe('NO_MATCHING_FLOW');
      expect(error.details).toEqual({ gatewayId: 'Gateway1' });
      expect(error.name).toBe('NoMatchingFlowError');
    });
  });

  describe('InvalidRequestError', () => {
    it('should create error with custom details', () => {
      const error = new InvalidRequestError('Missing required parameter', {
        param: 'workflowId',
      });

      expect(error.message).toBe('Missing required parameter');
      expect(error.code).toBe('INVALID_REQUEST');
      expect(error.details).toEqual({ param: 'workflowId' });
      expect(error.name).toBe('InvalidRequestError');
    });
  });

  describe('ExecutionError', () => {
    it('should create error with execution ID in details', () => {
      const error = new ExecutionError('Execution failed', 'Execution123', {
        reason: 'timeout',
      });

      expect(error.message).toBe('Execution failed');
      expect(error.code).toBe('EXECUTION_ERROR');
      expect(error.details).toEqual({
        executionId: 'Execution123',
        reason: 'timeout',
      });
      expect(error.name).toBe('ExecutionError');
    });
  });

  describe('Error hierarchy', () => {
    it('should maintain proper inheritance chain', () => {
      const error = new NodeNotFoundError('Node1');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WorkflowError);
      expect(error).toBeInstanceOf(NodeNotFoundError);
    });

    it('should allow instanceof checks', () => {
      const errors = [
        new NodeNotFoundError('Node1'),
        new InvalidRequestError('Bad request'),
        new ExecutionError('Failed'),
      ];

      errors.forEach((error) => {
        expect(error instanceof WorkflowError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });
  });
});
