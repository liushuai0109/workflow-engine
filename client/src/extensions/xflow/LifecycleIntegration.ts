/**
 * Lifecycle Integration Helper
 *
 * Provides helper functions for integrating lifecycle operations
 * with BPMN-js modeler and elements.
 */

import type { LifecycleStage, LifecycleMetadata } from '@/types/lifecycle'
import type { UserSegment } from '@/types/segments'
import type { Trigger } from '@/types/triggers'
import type { WorkflowMetadata } from '@/types/metrics'
import { lifecycleService } from '@/services/lifecycleService'

/**
 * Get lifecycle metadata from a BPMN element
 */
export function getLifecycleMetadata(element: any): LifecycleMetadata | null {
  try {
    const businessObject = element.businessObject
    if (!businessObject) return null

    // Check for lifecycle metadata in extensionElements
    const extensionElements = businessObject.extensionElements
    if (!extensionElements || !extensionElements.values) return null

    const lifecycleMetadata = extensionElements.values.find(
      (ext: any) => ext.$type === 'xflow:lifecycleMetadata'
    )

    if (!lifecycleMetadata) return null

    return {
      stage: lifecycleMetadata.lifecycleStage as LifecycleStage,
      color: lifecycleMetadata.color,
      icon: lifecycleMetadata.icon,
      description: lifecycleMetadata.description,
      version: lifecycleMetadata.lifecycleVersion || '1.0.0'
    }
  } catch (error) {
    console.error('[LifecycleIntegration] Error getting lifecycle metadata:', error)
    return null
  }
}

/**
 * Set lifecycle metadata on a BPMN element
 */
export function setLifecycleMetadata(
  element: any,
  modeler: any,
  metadata: LifecycleMetadata
): boolean {
  try {
    const modeling = modeler.get('modeling')
    const moddle = modeler.get('moddle')
    const businessObject = element.businessObject

    // Create or get extensionElements
    let extensionElements = businessObject.extensionElements
    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements')
      modeling.updateProperties(element, { extensionElements })
    }

    // Find or create lifecycleMetadata
    let lifecycleMetadata = extensionElements.values?.find(
      (ext: any) => ext.$type === 'xflow:lifecycleMetadata'
    )

    if (lifecycleMetadata) {
      // Update existing
      lifecycleMetadata.lifecycleStage = metadata.stage
      lifecycleMetadata.color = metadata.color
      lifecycleMetadata.icon = metadata.icon
      lifecycleMetadata.description = metadata.description
      lifecycleMetadata.lifecycleVersion = metadata.version
    } else {
      // Create new
      lifecycleMetadata = moddle.create('xflow:lifecycleMetadata', {
        lifecycleStage: metadata.stage,
        color: metadata.color,
        icon: metadata.icon,
        description: metadata.description,
        lifecycleVersion: metadata.version
      })

      if (!extensionElements.values) {
        extensionElements.values = []
      }
      extensionElements.values.push(lifecycleMetadata)
    }

    // Trigger update
    modeling.updateProperties(element, {})

    return true
  } catch (error) {
    console.error('[LifecycleIntegration] Error setting lifecycle metadata:', error)
    return false
  }
}

/**
 * Get workflow metadata from the process element
 */
export function getWorkflowMetadata(modeler: any): WorkflowMetadata | null {
  try {
    const elementRegistry = modeler.get('elementRegistry')
    const processElement = elementRegistry.find((el: any) => el.type === 'bpmn:Process')

    if (!processElement) return null

    const businessObject = processElement.businessObject
    const extensionElements = businessObject.extensionElements
    if (!extensionElements || !extensionElements.values) return null

    const workflowMetadata = extensionElements.values.find(
      (ext: any) => ext.$type === 'xflow:workflowMetadata'
    )

    if (!workflowMetadata) return null

    // Parse the metadata
    return {
      id: workflowMetadata.id || businessObject.id,
      name: workflowMetadata.name || businessObject.name || 'Untitled Workflow',
      description: workflowMetadata.description,
      purpose: workflowMetadata.workflowPurpose,
      owner: workflowMetadata.owner,
      tags: workflowMetadata.tags || [],
      metrics: workflowMetadata.metrics || [],
      version: workflowMetadata.workflowVersion || '1.0.0',
      createdAt: workflowMetadata.createdAt ? new Date(workflowMetadata.createdAt) : new Date(),
      updatedAt: workflowMetadata.updatedAt ? new Date(workflowMetadata.updatedAt) : new Date(),
      createdBy: workflowMetadata.createdBy,
      updatedBy: workflowMetadata.updatedBy,
      status: workflowMetadata.workflowStatus || 'draft',
      published: workflowMetadata.published === 'true' || workflowMetadata.published === true,
      publishedAt: workflowMetadata.publishedAt ? new Date(workflowMetadata.publishedAt) : undefined,
      targetSegments: workflowMetadata.targetSegments || [],
      expectedVolume: workflowMetadata.expectedVolume,
      businessImpact: workflowMetadata.businessImpact
    }
  } catch (error) {
    console.error('[LifecycleIntegration] Error getting workflow metadata:', error)
    return null
  }
}

/**
 * Set workflow metadata on the process element
 */
export function setWorkflowMetadata(
  modeler: any,
  metadata: WorkflowMetadata
): boolean {
  try {
    const elementRegistry = modeler.get('elementRegistry')
    const modeling = modeler.get('modeling')
    const moddle = modeler.get('moddle')

    const processElement = elementRegistry.find((el: any) => el.type === 'bpmn:Process')
    if (!processElement) return false

    const businessObject = processElement.businessObject

    // Create or get extensionElements
    let extensionElements = businessObject.extensionElements
    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements')
      modeling.updateProperties(processElement, { extensionElements })
    }

    // Find or create workflowMetadata
    let workflowMetadata = extensionElements.values?.find(
      (ext: any) => ext.$type === 'xflow:workflowMetadata'
    )

    const metadataProps = {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      workflowPurpose: metadata.purpose,
      workflowVersion: metadata.version,
      workflowStatus: metadata.status,
      owner: metadata.owner,
      published: String(metadata.published),
      publishedAt: metadata.publishedAt?.toISOString(),
      createdAt: metadata.createdAt.toISOString(),
      updatedAt: metadata.updatedAt.toISOString(),
      createdBy: metadata.createdBy,
      updatedBy: metadata.updatedBy,
      businessImpact: metadata.businessImpact,
      expectedVolume: metadata.expectedVolume,
      tags: metadata.tags,
      metrics: metadata.metrics,
      targetSegments: metadata.targetSegments
    }

    if (workflowMetadata) {
      // Update existing
      Object.assign(workflowMetadata, metadataProps)
    } else {
      // Create new
      workflowMetadata = moddle.create('xflow:workflowMetadata', metadataProps)

      if (!extensionElements.values) {
        extensionElements.values = []
      }
      extensionElements.values.push(workflowMetadata)
    }

    // Also update process name
    modeling.updateProperties(processElement, { name: metadata.name })

    return true
  } catch (error) {
    console.error('[LifecycleIntegration] Error setting workflow metadata:', error)
    return false
  }
}

/**
 * Get visual style based on lifecycle stage
 */
export function getLifecycleStyle(stage: LifecycleStage): any {
  const config = lifecycleService.getStageConfiguration(stage)
  if (!config) return {}

  return {
    stroke: config.color,
    strokeWidth: 3,
    fill: config.color + '20' // 20% opacity
  }
}

/**
 * Apply lifecycle styling to an element
 */
export function applyLifecycleStyle(
  element: any,
  modeler: any,
  stage: LifecycleStage
): void {
  try {
    const modeling = modeler.get('modeling')
    const style = getLifecycleStyle(stage)

    modeling.setColor(element, {
      stroke: style.stroke,
      fill: style.fill
    })
  } catch (error) {
    console.error('[LifecycleIntegration] Error applying lifecycle style:', error)
  }
}

/**
 * Remove lifecycle metadata from an element
 */
export function removeLifecycleMetadata(element: any, modeler: any): boolean {
  try {
    const modeling = modeler.get('modeling')
    const businessObject = element.businessObject
    const extensionElements = businessObject.extensionElements

    if (!extensionElements || !extensionElements.values) return false

    const index = extensionElements.values.findIndex(
      (ext: any) => ext.$type === 'xflow:lifecycleMetadata'
    )

    if (index === -1) return false

    extensionElements.values.splice(index, 1)
    modeling.updateProperties(element, {})

    return true
  } catch (error) {
    console.error('[LifecycleIntegration] Error removing lifecycle metadata:', error)
    return false
  }
}

/**
 * Check if an element has lifecycle metadata
 */
export function hasLifecycleMetadata(element: any): boolean {
  return getLifecycleMetadata(element) !== null
}

/**
 * Get all elements with lifecycle metadata
 */
export function getElementsWithLifecycle(modeler: any): any[] {
  try {
    const elementRegistry = modeler.get('elementRegistry')
    const elements = elementRegistry.getAll()

    return elements.filter((element: any) => hasLifecycleMetadata(element))
  } catch (error) {
    console.error('[LifecycleIntegration] Error getting elements with lifecycle:', error)
    return []
  }
}

/**
 * Export all lifecycle data from the diagram
 */
export function exportLifecycleData(modeler: any): {
  workflowMetadata: WorkflowMetadata | null
  elementMetadata: Array<{
    elementId: string
    elementType: string
    lifecycleMetadata: LifecycleMetadata
  }>
} {
  const workflowMetadata = getWorkflowMetadata(modeler)
  const elements = getElementsWithLifecycle(modeler)

  const elementMetadata = elements.map((element: any) => ({
    elementId: element.id,
    elementType: element.type,
    lifecycleMetadata: getLifecycleMetadata(element)!
  }))

  return {
    workflowMetadata,
    elementMetadata
  }
}
