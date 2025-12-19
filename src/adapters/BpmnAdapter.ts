/**
 * BPMN Adapter
 *
 * Handles BPMN workflow import/export
 * Preserves lifecycle metadata during conversions
 */

import type { LifecycleMetadata } from '../types/lifecycle'

export interface ElementMapping {
  bpmnType: string
  preserveLifecycle: boolean
  lifecycleSupported: boolean
}

export class BpmnAdapter {
  private elementMappings: Map<string, ElementMapping>

  constructor() {
    this.elementMappings = new Map()
    this.initializeElementMappings()
  }

  /**
   * Initialize element type mappings
   */
  private initializeElementMappings(): void {
    const mappings: ElementMapping[] = [
      { bpmnType: 'bpmn:UserTask', preserveLifecycle: true, lifecycleSupported: true },
      { bpmnType: 'bpmn:ServiceTask', preserveLifecycle: true, lifecycleSupported: true },
      { bpmnType: 'bpmn:StartEvent', preserveLifecycle: true, lifecycleSupported: true },
      { bpmnType: 'bpmn:EndEvent', preserveLifecycle: true, lifecycleSupported: true },
      { bpmnType: 'bpmn:ExclusiveGateway', preserveLifecycle: true, lifecycleSupported: true },
      { bpmnType: 'bpmn:ParallelGateway', preserveLifecycle: true, lifecycleSupported: true },
    ]

    mappings.forEach(mapping => {
      this.elementMappings.set(mapping.bpmnType, mapping)
    })
  }

  /**
   * Export BPMN with lifecycle data preserved
   */
  exportBPMN(bpmnData: any): string {
    console.log('[BpmnAdapter] Exporting BPMN with lifecycle metadata')

    // All lifecycle data is already in extensionElements
    // Just stringify the BPMN XML
    return JSON.stringify(bpmnData, null, 2)
  }

  /**
   * Import BPMN and validate lifecycle data
   */
  importBPMN(bpmnData: any): any {
    console.log('[BpmnAdapter] Importing BPMN with lifecycle metadata')

    // Validate the workflow
    const validation = this.validateWorkflow(bpmnData)
    if (!validation.valid) {
      console.warn('[BpmnAdapter] Validation warnings:', validation.errors)
    }

    return bpmnData
  }

  /**
   * Extract lifecycle metadata from element
   */
  extractLifecycleMetadata(element: any): LifecycleMetadata | null {
    if (!element.extensionElements || !element.extensionElements.values) {
      return null
    }

    const lifecycleExt = element.extensionElements.values.find(
      (ext: any) => ext.$type === 'xflow:Lifecycle'
    )

    return lifecycleExt || null
  }

  /**
   * Check if element supports lifecycle metadata
   */
  supportsLifecycle(elementType: string): boolean {
    const mapping = this.elementMappings.get(elementType)
    return mapping?.lifecycleSupported || false
  }

  /**
   * Validate lifecycle-enhanced workflow
   */
  validateWorkflow(workflowData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!workflowData) {
      errors.push('Workflow data is null or undefined')
      return { valid: false, errors }
    }

    // Validate lifecycle metadata format
    if (workflowData.elements) {
      workflowData.elements.forEach((element: any, index: number) => {
        if (element.lifecycle) {
          if (!element.lifecycle.stage) {
            errors.push(`Element ${index}: lifecycle stage is required`)
          }
          if (!element.lifecycle.version) {
            errors.push(`Element ${index}: lifecycle version is required`)
          }
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton
export const bpmnAdapter = new BpmnAdapter()
export default bpmnAdapter
