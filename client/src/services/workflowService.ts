import apiClient from './api'
import BpmnModdle from 'bpmn-moddle'

// Types
export interface Workflow {
  id: string
  name: string
  description?: string
  bpmnXml: string
  version: string
  status: 'draft' | 'active' | 'inactive' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface WorkflowListResponse {
  success: boolean
  data: Workflow[]
  metadata: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface WorkflowResponse {
  success: boolean
  data: Workflow
}

/**
 * Workflow Service
 * Provides API calls for workflow management
 */
class WorkflowService {
  private moddle: any

  constructor() {
    this.moddle = new BpmnModdle()
  }

  /**
   * List workflows with pagination
   * @param page - Page number (default: 1)
   * @param pageSize - Number of items per page (default: 20)
   * @returns Workflow list with metadata
   */
  async listWorkflows(page: number = 1, pageSize: number = 20): Promise<WorkflowListResponse> {
    try {
      const response = await apiClient.get<WorkflowListResponse>(
        `/workflows?page=${page}&pageSize=${pageSize}`
      )
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to load workflows: ${message}`)
    }
  }

  /**
   * Get a single workflow by ID
   * @param workflowId - The workflow ID
   * @returns Workflow object with BPMN XML
   */
  async getWorkflow(workflowId: string): Promise<Workflow> {
    try {
      const response = await apiClient.get<WorkflowResponse>(`/workflows/${workflowId}`)
      return response.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('404')) {
        throw new Error('Workflow not found')
      }
      throw new Error(`Failed to load workflow: ${message}`)
    }
  }

  /**
   * Create a new workflow
   * @param name - Workflow name
   * @param description - Workflow description
   * @param bpmnXml - BPMN XML content
   * @returns Created workflow object with ID
   */
  async createWorkflow(name: string, description: string, bpmnXml: string): Promise<Workflow> {
    try {
      const response = await apiClient.post<WorkflowResponse>('/workflows', {
        name,
        description,
        bpmnXml
      })
      return response.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to create workflow: ${message}`)
    }
  }

  /**
   * Update an existing workflow
   * @param workflowId - The workflow ID
   * @param name - Workflow name
   * @param description - Workflow description
   * @param bpmnXml - BPMN XML content
   * @returns Updated workflow object
   */
  async updateWorkflow(
    workflowId: string,
    name: string,
    description: string,
    bpmnXml: string
  ): Promise<Workflow> {
    try {
      const response = await apiClient.put<WorkflowResponse>(`/workflows/${workflowId}`, {
        name,
        description,
        bpmnXml
      })
      return response.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('404')) {
        throw new Error('Workflow not found')
      }
      throw new Error(`Failed to update workflow: ${message}`)
    }
  }

  /**
   * Extract workflow name from BPMN XML
   * Reads the name attribute from the first <bpmn:process> element
   * @param bpmnXml - BPMN XML content
   * @returns Workflow name or "Untitled Workflow" if extraction fails
   */
  async extractWorkflowName(bpmnXml: string): Promise<string> {
    try {
      const result = await this.moddle.fromXML(bpmnXml)
      const rootElement = result.rootElement

      // Find the first process element
      const process = rootElement?.rootElements?.find(
        (element: any) => element.$type === 'bpmn:Process'
      )

      if (process && process.name && process.name.trim()) {
        return process.name.trim()
      }

      return 'Untitled Workflow'
    } catch (error) {
      console.error('Failed to extract workflow name from BPMN XML:', error)
      return 'Untitled Workflow'
    }
  }

  /**
   * Download workflow as BPMN file
   * @param bpmnXml - BPMN XML content
   * @param filename - File name (without extension)
   */
  downloadWorkflow(bpmnXml: string, filename: string): void {
    const blob = new Blob([bpmnXml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.bpmn`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Export singleton instance
export const workflowService = new WorkflowService()
export default workflowService
