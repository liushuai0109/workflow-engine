export interface DebugSession {
  id: string;
  workflowId: string;
  status: DebugStatus;
  currentNodeId?: string;
  breakpoints: string[];
  variables: Record<string, any>;
  executionStack: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum DebugStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
}
