export interface ExecutionHistory {
  id: string;
  executionId: string;
  nodeId: string;
  action: string;
  timestamp: Date;
  data?: Record<string, any>;
}
