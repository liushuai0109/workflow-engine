export interface WorkflowInstance {
  id: string;
  workflowId: string;
  name: string;
  status: InstanceStatus;
  currentNodeIds: string[];
  instanceVersion: number;
  startedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  variables?: Record<string, any>;
}

export enum InstanceStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}
