/**
 * workflowService 单元测试
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { workflowService, Workflow, WorkflowListResponse } from '../workflowService'
import apiClient from '../api'

// Mock apiClient
jest.mock('../api')

describe('workflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('listWorkflows', () => {
    it('should fetch workflows list successfully', async () => {
      const mockResponse: WorkflowListResponse = {
        success: true,
        data: [
          {
            id: 'workflow-1',
            name: 'Test Workflow 1',
            description: 'Description 1',
            bpmnXml: '<bpmn>...</bpmn>',
            version: '1.0',
            status: 'active',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          },
          {
            id: 'workflow-2',
            name: 'Test Workflow 2',
            description: 'Description 2',
            bpmnXml: '<bpmn>...</bpmn>',
            version: '1.0',
            status: 'draft',
            createdAt: '2023-01-02T00:00:00Z',
            updatedAt: '2023-01-02T00:00:00Z'
          }
        ],
        metadata: {
          page: 1,
          pageSize: 20,
          total: 2,
          hasMore: false
        }
      }

      ;(apiClient.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await workflowService.listWorkflows(1, 20)

      expect(apiClient.get).toHaveBeenCalledWith('/workflows?page=1&pageSize=20')
      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(2)
    })

    it('should handle API errors gracefully', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(workflowService.listWorkflows()).rejects.toThrow('Failed to load workflows: Network error')
    })

    it('should use default pagination values', async () => {
      const mockResponse: WorkflowListResponse = {
        success: true,
        data: [],
        metadata: { page: 1, pageSize: 20, total: 0, hasMore: false }
      }

      ;(apiClient.get as jest.Mock).mockResolvedValue(mockResponse)

      await workflowService.listWorkflows()

      expect(apiClient.get).toHaveBeenCalledWith('/workflows?page=1&pageSize=20')
    })
  })

  describe('getWorkflow', () => {
    it('should fetch a single workflow successfully', async () => {
      const mockWorkflow: Workflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        description: 'Test Description',
        bpmnXml: '<bpmn>...</bpmn>',
        version: '1.0',
        status: 'active',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }

      ;(apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: mockWorkflow })

      const result = await workflowService.getWorkflow('workflow-1')

      expect(apiClient.get).toHaveBeenCalledWith('/workflows/workflow-1')
      expect(result).toEqual(mockWorkflow)
    })

    it('should handle 404 error with specific message', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('404'))

      await expect(workflowService.getWorkflow('non-existent')).rejects.toThrow('Workflow not found')
    })

    it('should handle other API errors', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('Server error'))

      await expect(workflowService.getWorkflow('workflow-1')).rejects.toThrow('Failed to load workflow: Server error')
    })
  })

  describe('createWorkflow', () => {
    it('should create a workflow successfully', async () => {
      const mockWorkflow: Workflow = {
        id: 'new-workflow',
        name: 'New Workflow',
        description: 'New Description',
        bpmnXml: '<bpmn>...</bpmn>',
        version: '1.0',
        status: 'draft',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({ success: true, data: mockWorkflow })

      const result = await workflowService.createWorkflow('New Workflow', 'New Description', '<bpmn>...</bpmn>')

      expect(apiClient.post).toHaveBeenCalledWith('/workflows', {
        name: 'New Workflow',
        description: 'New Description',
        bpmnXml: '<bpmn>...</bpmn>'
      })
      expect(result).toEqual(mockWorkflow)
    })

    it('should handle creation errors', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('Validation error'))

      await expect(workflowService.createWorkflow('Test', '', '<bpmn></bpmn>')).rejects.toThrow('Failed to create workflow: Validation error')
    })
  })

  describe('updateWorkflow', () => {
    it('should update a workflow successfully', async () => {
      const mockWorkflow: Workflow = {
        id: 'workflow-1',
        name: 'Updated Workflow',
        description: 'Updated Description',
        bpmnXml: '<bpmn>...</bpmn>',
        version: '2.0',
        status: 'active',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      }

      ;(apiClient.put as jest.Mock).mockResolvedValue({ success: true, data: mockWorkflow })

      const result = await workflowService.updateWorkflow('workflow-1', 'Updated Workflow', 'Updated Description', '<bpmn>...</bpmn>')

      expect(apiClient.put).toHaveBeenCalledWith('/workflows/workflow-1', {
        name: 'Updated Workflow',
        description: 'Updated Description',
        bpmnXml: '<bpmn>...</bpmn>'
      })
      expect(result).toEqual(mockWorkflow)
    })

    it('should handle 404 error when updating non-existent workflow', async () => {
      ;(apiClient.put as jest.Mock).mockRejectedValue(new Error('404'))

      await expect(workflowService.updateWorkflow('non-existent', 'Test', '', '<bpmn></bpmn>')).rejects.toThrow('Workflow not found')
    })

    it('should handle other update errors', async () => {
      ;(apiClient.put as jest.Mock).mockRejectedValue(new Error('Server error'))

      await expect(workflowService.updateWorkflow('workflow-1', 'Test', '', '<bpmn></bpmn>')).rejects.toThrow('Failed to update workflow: Server error')
    })
  })

  describe('extractWorkflowName', () => {
    it('should extract name from valid BPMN XML', async () => {
      const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="My Workflow" isExecutable="false">
  </bpmn:process>
</bpmn:definitions>`

      const name = await workflowService.extractWorkflowName(bpmnXml)

      expect(name).toBe('My Workflow')
    })

    it('should return "Untitled Workflow" when name is empty', async () => {
      const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="" isExecutable="false">
  </bpmn:process>
</bpmn:definitions>`

      const name = await workflowService.extractWorkflowName(bpmnXml)

      expect(name).toBe('Untitled Workflow')
    })

    it('should return "Untitled Workflow" when name attribute is missing', async () => {
      const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" isExecutable="false">
  </bpmn:process>
</bpmn:definitions>`

      const name = await workflowService.extractWorkflowName(bpmnXml)

      expect(name).toBe('Untitled Workflow')
    })

    it('should return "Untitled Workflow" for invalid XML', async () => {
      const invalidXml = 'not valid xml'

      const name = await workflowService.extractWorkflowName(invalidXml)

      expect(name).toBe('Untitled Workflow')
    })

    it('should trim whitespace from extracted name', async () => {
      const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="  Workflow with spaces  " isExecutable="false">
  </bpmn:process>
</bpmn:definitions>`

      const name = await workflowService.extractWorkflowName(bpmnXml)

      expect(name).toBe('Workflow with spaces')
    })
  })

  describe('downloadWorkflow', () => {
    it('should trigger file download with correct filename', () => {
      // Mock URL methods
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock DOM APIs
      const createElementSpy = jest.spyOn(document, 'createElement')

      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
        remove: jest.fn()
      } as any

      createElementSpy.mockReturnValue(mockAnchor)

      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor)
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor)

      const bpmnXml = '<bpmn>test</bpmn>'
      const filename = 'test-workflow'

      workflowService.downloadWorkflow(bpmnXml, filename)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockAnchor.download).toBe('test-workflow.bpmn')
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

      // Cleanup
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })
})
