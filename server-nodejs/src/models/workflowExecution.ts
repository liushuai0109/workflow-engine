export interface WorkflowExecution {
  id: string;
  instanceId: string;
  workflowId: string;
  status: ExecutionStatus;
  variables: Record<string, any>;
  executionVersion: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
