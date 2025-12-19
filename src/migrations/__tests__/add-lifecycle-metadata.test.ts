/**
 * Tests for Lifecycle Migration Script
 */

import { describe, it, expect } from 'vitest'
import { LifecycleMigration } from '../add-lifecycle-metadata'
import { LifecycleStage } from '@/types/lifecycle'

describe('LifecycleMigration', () => {
  let migration: LifecycleMigration

  beforeEach(() => {
    migration = new LifecycleMigration()
  })

  describe('Single Workflow Migration', () => {
    it('should add lifecycle metadata to workflow without it', () => {
      const workflow = {
        id: 'workflow-1',
        elements: [
          {
            id: 'task1',
            type: 'bpmn:UserTask',
            name: 'Register User'
          }
        ]
      }

      const { updated, workflow: result } = migration.migrateWorkflow(workflow)

      expect(updated).toBe(true)
      expect(result.elements[0].extensionElements).toBeDefined()
      expect(result.elements[0].extensionElements.values).toHaveLength(1)
      expect(result.elements[0].extensionElements.values[0].$type).toBe('xflow:Lifecycle')
    })

    it('should not modify workflow that already has lifecycle', () => {
      const workflow = {
        id: 'workflow-1',
        elements: [
          {
            id: 'task1',
            type: 'bpmn:UserTask',
            extensionElements: {
              values: [
                {
                  $type: 'xflow:Lifecycle',
                  stage: LifecycleStage.Activation,
                  version: '1.0.0'
                }
              ]
            }
          }
        ]
      }

      const { updated } = migration.migrateWorkflow(workflow)

      expect(updated).toBe(false)
    })

    it('should skip non-migrateable elements', () => {
      const workflow = {
        id: 'workflow-1',
        elements: [
          {
            id: 'seq1',
            type: 'bpmn:SequenceFlow'
          }
        ]
      }

      const { updated } = migration.migrateWorkflow(workflow)

      expect(updated).toBe(false)
    })
  })

  describe('Stage Inference', () => {
    it('should infer Acquisition stage from registration task', () => {
      const workflow = {
        elements: [
          {
            id: 'task1',
            type: 'bpmn:UserTask',
            name: 'User Registration'
          }
        ]
      }

      const { workflow: result } = migration.migrateWorkflow(workflow)
      const stage = result.elements[0].extensionElements.values[0].stage

      expect(stage).toBe('Acquisition')
    })

    it('should infer Activation stage from welcome task', () => {
      const workflow = {
        elements: [
          {
            id: 'task1',
            type: 'bpmn:UserTask',
            name: 'Send Welcome Email'
          }
        ]
      }

      const { workflow: result } = migration.migrateWorkflow(workflow)
      const stage = result.elements[0].extensionElements.values[0].stage

      expect(stage).toBe('Activation')
    })

    it('should infer Revenue stage from payment task', () => {
      const workflow = {
        elements: [
          {
            id: 'task1',
            type: 'bpmn:ServiceTask',
            name: 'Process Payment'
          }
        ]
      }

      const { workflow: result } = migration.migrateWorkflow(workflow)
      const stage = result.elements[0].extensionElements.values[0].stage

      expect(stage).toBe('Revenue')
    })
  })

  describe('Batch Migration', () => {
    it('should migrate multiple workflows', () => {
      const workflows = [
        {
          id: 'wf1',
          elements: [{ id: 't1', type: 'bpmn:UserTask', name: 'Task 1' }]
        },
        {
          id: 'wf2',
          elements: [{ id: 't2', type: 'bpmn:ServiceTask', name: 'Task 2' }]
        }
      ]

      const result = migration.migrateWorkflows(workflows)

      expect(result.success).toBe(true)
      expect(result.workflowsProcessed).toBe(2)
      expect(result.workflowsUpdated).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle errors gracefully', () => {
      const workflows = [
        null, // Invalid workflow
        {
          id: 'wf2',
          elements: [{ id: 't1', type: 'bpmn:UserTask' }]
        }
      ]

      const result = migration.migrateWorkflows(workflows as any)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Backup and Rollback', () => {
    it('should create backup of workflow', () => {
      const workflow = {
        id: 'wf1',
        elements: [{ id: 't1', type: 'bpmn:UserTask' }]
      }

      const backup = migration.createBackup(workflow)

      expect(backup).toEqual(workflow)
      expect(backup).not.toBe(workflow) // Should be a different object
    })

    it('should rollback to original workflow', () => {
      const original = {
        id: 'wf1',
        elements: [{ id: 't1', type: 'bpmn:UserTask' }]
      }

      const { workflow: migrated } = migration.migrateWorkflow(original)

      const rolledBack = migration.rollback(original, migrated)

      expect(rolledBack).toEqual(original)
    })
  })
})
