/**
 * Mock Service Types
 * Defines interfaces for mock workflow execution
 */

// Mock execution state
export interface MockExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  currentNodeId: string
  variables: Record<string, any>
  executedNodes: string[]
  createdAt: string
  updatedAt: string
}

// Mock service functions (placeholder)
export const mockService = {
  /**
   * Start a mock execution for a workflow
   */
  startExecution: async (_workflowId: string): Promise<MockExecution> => {
    throw new Error('Mock service not implemented')
  },

  /**
   * Stop a running mock execution
   */
  stopExecution: async (_executionId: string): Promise<void> => {
    throw new Error('Mock service not implemented')
  },

  /**
   * Get current execution status
   */
  getExecution: async (_executionId: string): Promise<MockExecution | null> => {
    throw new Error('Mock service not implemented')
  }
}

export default mockService
