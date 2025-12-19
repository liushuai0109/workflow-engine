/**
 * Migration Script: Add Lifecycle Metadata to Existing Workflows
 *
 * This script updates existing BPMN workflows to include lifecycle metadata
 * while preserving all existing properties.
 */

import type { LifecycleStage } from '@/types/lifecycle'

export interface MigrationResult {
  success: boolean
  workflowsProcessed: number
  workflowsUpdated: number
  errors: string[]
}

export class LifecycleMigration {
  /**
   * Migrate a single workflow to include lifecycle metadata
   */
  migrateWorkflow(workflow: any): { updated: boolean; workflow: any } {
    let updated = false

    if (!workflow || !workflow.elements) {
      return { updated, workflow }
    }

    workflow.elements.forEach((element: any) => {
      // Only migrate if element doesn't already have lifecycle
      if (this.shouldMigrate(element) && !this.hasLifecycle(element)) {
        this.addDefaultLifecycle(element)
        updated = true
      }
    })

    return { updated, workflow }
  }

  /**
   * Migrate multiple workflows
   */
  migrateWorkflows(workflows: any[]): MigrationResult {
    const result: MigrationResult = {
      success: true,
      workflowsProcessed: 0,
      workflowsUpdated: 0,
      errors: []
    }

    workflows.forEach((workflow, index) => {
      try {
        const { updated } = this.migrateWorkflow(workflow)
        result.workflowsProcessed++
        if (updated) {
          result.workflowsUpdated++
        }
      } catch (error) {
        result.success = false
        result.errors.push(`Workflow ${index}: ${error}`)
      }
    })

    return result
  }

  /**
   * Check if element should be migrated
   */
  private shouldMigrate(element: any): boolean {
    const migrateableTypes = [
      'bpmn:UserTask',
      'bpmn:ServiceTask',
      'bpmn:StartEvent',
      'bpmn:EndEvent'
    ]
    return migrateableTypes.includes(element.type || element.$type)
  }

  /**
   * Check if element already has lifecycle metadata
   */
  private hasLifecycle(element: any): boolean {
    if (!element.extensionElements || !element.extensionElements.values) {
      return false
    }

    return element.extensionElements.values.some(
      (ext: any) => ext.$type === 'xflow:Lifecycle'
    )
  }

  /**
   * Add default lifecycle metadata based on element type
   */
  private addDefaultLifecycle(element: any): void {
    const stage = this.inferLifecycleStage(element)

    if (!element.extensionElements) {
      element.extensionElements = { values: [] }
    }

    if (!element.extensionElements.values) {
      element.extensionElements.values = []
    }

    element.extensionElements.values.push({
      $type: 'xflow:Lifecycle',
      stage,
      version: '1.0.0'
    })
  }

  /**
   * Infer lifecycle stage from element name or type
   */
  private inferLifecycleStage(element: any): LifecycleStage {
    const name = (element.name || '').toLowerCase()

    if (name.includes('register') || name.includes('signup') || name.includes('onboard')) {
      return 'Acquisition' as LifecycleStage
    }
    if (name.includes('activate') || name.includes('first') || name.includes('welcome')) {
      return 'Activation' as LifecycleStage
    }
    if (name.includes('retain') || name.includes('engage') || name.includes('notification')) {
      return 'Retention' as LifecycleStage
    }
    if (name.includes('payment') || name.includes('purchase') || name.includes('revenue')) {
      return 'Revenue' as LifecycleStage
    }
    if (name.includes('refer') || name.includes('invite') || name.includes('share')) {
      return 'Referral' as LifecycleStage
    }

    // Default to Activation
    return 'Activation' as LifecycleStage
  }

  /**
   * Create a backup of workflow before migration
   */
  createBackup(workflow: any): any {
    return JSON.parse(JSON.stringify(workflow))
  }

  /**
   * Rollback workflow to backup
   */
  rollback(original: any, migrated: any): any {
    return original
  }
}

// Export singleton
export const lifecycleMigration = new LifecycleMigration()
export default lifecycleMigration
