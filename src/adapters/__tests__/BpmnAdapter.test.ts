/**
 * Tests for BPMN Adapter
 */

import { describe, it, expect } from 'vitest'
import { BpmnAdapter } from '../BpmnAdapter'
import { LifecycleStage } from '@/types/lifecycle'

describe('BpmnAdapter', () => {
  let adapter: BpmnAdapter

  beforeEach(() => {
    adapter = new BpmnAdapter()
  })

  describe('Lifecycle Metadata Extraction', () => {
    it('should extract lifecycle metadata from element', () => {
      const element = {
        id: 'task1',
        type: 'bpmn:UserTask',
        extensionElements: {
          values: [
            {
              $type: 'xflow:Lifecycle',
              stage: LifecycleStage.Acquisition,
              version: '1.0.0',
              color: '#2196F3'
            }
          ]
        }
      }

      const metadata = adapter.extractLifecycleMetadata(element)
      expect(metadata).toBeDefined()
      expect(metadata?.stage).toBe(LifecycleStage.Acquisition)
    })

    it('should return null for element without lifecycle', () => {
      const element = {
        id: 'task1',
        type: 'bpmn:UserTask'
      }

      const metadata = adapter.extractLifecycleMetadata(element)
      expect(metadata).toBeNull()
    })
  })

  describe('Workflow Validation', () => {
    it('should validate workflow with lifecycle metadata', () => {
      const workflow = {
        elements: [
          {
            id: 'task1',
            lifecycle: {
              stage: LifecycleStage.Activation,
              version: '1.0.0'
            }
          }
        ]
      }

      const result = adapter.validateWorkflow(workflow)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject workflow with invalid lifecycle metadata', () => {
      const workflow = {
        elements: [
          {
            id: 'task1',
            lifecycle: {
              // Missing stage
              version: '1.0.0'
            }
          }
        ]
      }

      const result = adapter.validateWorkflow(workflow)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Import/Export', () => {
    it('should export BPMN with lifecycle data', () => {
      const bpmnData = {
        elements: [
          {
            id: 'task1',
            extensionElements: {
              values: [
                {
                  $type: 'xflow:Lifecycle',
                  stage: LifecycleStage.Revenue
                }
              ]
            }
          }
        ]
      }

      const exported = adapter.exportBPMN(bpmnData)
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')
    })

    it('should import BPMN and validate', () => {
      const bpmnData = {
        elements: [
          {
            id: 'task1',
            lifecycle: {
              stage: LifecycleStage.Retention,
              version: '1.0.0'
            }
          }
        ]
      }

      const imported = adapter.importBPMN(bpmnData)
      expect(imported).toBeDefined()
    })
  })
})
