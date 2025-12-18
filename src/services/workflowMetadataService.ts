/**
 * Workflow Metadata Service
 *
 * Service for managing workflow metadata, metrics, versioning, and performance tracking.
 * Provides functionality for:
 * - Creating and managing workflow metadata
 * - Tracking workflow versions and changes
 * - Managing success metrics and KPIs
 * - Calculating workflow health and performance
 */

import type {
  WorkflowMetadata,
  WorkflowMetric,
  WorkflowPurpose,
  WorkflowStatus,
  WorkflowVersion,
  MetricPerformance,
  MetricStats,
  MetricDataPoint,
  WorkflowPerformanceSummary,
  MetricName,
  MetricUnit
} from '@/types/metrics'
import {
  getDefaultMetrics,
  calculateMetricHealth,
  calculateWorkflowHealth
} from '@/types/metrics'
import type { LifecycleStage } from '@/types/lifecycle'
import type { UserSegment } from '@/types/segments'
import type { Trigger } from '@/types/triggers'

/**
 * Workflow creation options
 */
interface CreateWorkflowOptions {
  description?: string
  owner?: string
  tags?: string[]
  metrics?: WorkflowMetric[]
  version?: string
  status?: WorkflowStatus
  published?: boolean
  lifecycleStage?: LifecycleStage
  targetSegments?: string[]
  expectedVolume?: number
  businessImpact?: 'low' | 'medium' | 'high' | 'critical'
  customFields?: Record<string, any>
}

/**
 * Workflow Metadata Service Class
 *
 * Provides centralized workflow metadata management functionality.
 */
class WorkflowMetadataService {
  private workflows: Map<string, WorkflowMetadata>
  private versions: Map<string, WorkflowVersion[]>
  private performances: Map<string, WorkflowPerformanceSummary>

  constructor() {
    this.workflows = new Map()
    this.versions = new Map()
    this.performances = new Map()
  }

  /**
   * Create new workflow metadata
   */
  createWorkflow(
    name: string,
    purpose: WorkflowPurpose,
    createdBy?: string,
    options?: CreateWorkflowOptions
  ): WorkflowMetadata {
    const now = new Date()
    const id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Get default metrics for the purpose if none provided
    const metrics = options?.metrics || getDefaultMetrics(purpose)

    const workflow: WorkflowMetadata = {
      id,
      name,
      description: options?.description,
      purpose,
      owner: options?.owner,
      tags: options?.tags || [],
      metrics,
      version: options?.version || '1.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
      status: (options?.status || 'draft') as WorkflowStatus,
      published: options?.published || false,
      targetSegments: options?.targetSegments,
      expectedVolume: options?.expectedVolume,
      businessImpact: options?.businessImpact,
      customFields: options?.customFields
    }

    this.workflows.set(id, workflow)

    // Create initial version record
    this.createVersionRecord(id, '1.0.0', 'Initial version', createdBy || 'system', 'major')

    return workflow
  }

  /**
   * Get workflow metadata by ID
   */
  getWorkflow(workflowId: string): WorkflowMetadata | undefined {
    return this.workflows.get(workflowId)
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): WorkflowMetadata[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Get workflows by purpose
   */
  getWorkflowsByPurpose(purpose: WorkflowPurpose): WorkflowMetadata[] {
    return Array.from(this.workflows.values()).filter(w => w.purpose === purpose)
  }

  /**
   * Get workflows by status
   */
  getWorkflowsByStatus(status: WorkflowStatus): WorkflowMetadata[] {
    return Array.from(this.workflows.values()).filter(w => w.status === status)
  }

  /**
   * Get workflows by tag
   */
  getWorkflowsByTag(tag: string): WorkflowMetadata[] {
    return Array.from(this.workflows.values()).filter(w => w.tags.includes(tag))
  }

  /**
   * Update workflow metadata
   */
  updateWorkflow(
    workflowId: string,
    updates: Partial<WorkflowMetadata>,
    updatedBy?: string
  ): WorkflowMetadata | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return null
    }

    const updated: WorkflowMetadata = {
      ...workflow,
      ...updates,
      id: workflow.id, // Prevent ID changes
      createdAt: workflow.createdAt, // Prevent creation date changes
      updatedAt: new Date(),
      updatedBy: updatedBy || workflow.updatedBy
    }

    this.workflows.set(workflowId, updated)
    return updated
  }

  /**
   * Update workflow status
   */
  updateStatus(
    workflowId: string,
    status: WorkflowStatus,
    updatedBy?: string
  ): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    workflow.status = status
    workflow.updatedAt = new Date()
    workflow.updatedBy = updatedBy || workflow.updatedBy

    // If activating, set published
    if (status === 'active' && !workflow.published) {
      workflow.published = true
      workflow.publishedAt = new Date()
    }

    return true
  }

  /**
   * Publish workflow
   */
  publishWorkflow(workflowId: string, publishedBy?: string): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    workflow.published = true
    workflow.publishedAt = new Date()
    workflow.updatedAt = new Date()
    workflow.updatedBy = publishedBy || workflow.updatedBy

    // Automatically set status to active
    if (workflow.status === 'draft' || workflow.status === 'approved') {
      workflow.status = 'active' as WorkflowStatus
    }

    return true
  }

  /**
   * Archive workflow
   */
  archiveWorkflow(workflowId: string, archivedBy?: string): boolean {
    return this.updateStatus(workflowId, 'archived' as WorkflowStatus, archivedBy)
  }

  /**
   * Add metric to workflow
   */
  addMetric(workflowId: string, metric: WorkflowMetric): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    workflow.metrics.push(metric)
    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Update metric
   */
  updateMetric(
    workflowId: string,
    metricName: string,
    updates: Partial<WorkflowMetric>
  ): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    const metric = workflow.metrics.find(m => m.name === metricName)
    if (!metric) {
      return false
    }

    Object.assign(metric, updates)
    metric.lastUpdated = new Date()
    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Remove metric
   */
  removeMetric(workflowId: string, metricName: string): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    const index = workflow.metrics.findIndex(m => m.name === metricName)
    if (index === -1) {
      return false
    }

    workflow.metrics.splice(index, 1)
    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Update metric actual value
   */
  updateMetricValue(
    workflowId: string,
    metricName: string,
    actualValue: number
  ): boolean {
    return this.updateMetric(workflowId, metricName, {
      actual: actualValue,
      lastUpdated: new Date()
    })
  }

  /**
   * Get workflow metrics
   */
  getMetrics(workflowId: string): WorkflowMetric[] {
    const workflow = this.workflows.get(workflowId)
    return workflow?.metrics || []
  }

  /**
   * Calculate workflow health score
   */
  calculateHealth(workflowId: string): number {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return 0
    }

    return calculateWorkflowHealth(workflow.metrics)
  }

  /**
   * Get metric by name
   */
  getMetric(workflowId: string, metricName: string): WorkflowMetric | undefined {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return undefined
    }
    return workflow.metrics.find(m => m.name === metricName)
  }

  /**
   * Create version record
   */
  private createVersionRecord(
    workflowId: string,
    version: string,
    changeDescription: string,
    changedBy: string,
    changeType: 'major' | 'minor' | 'patch',
    snapshot?: any
  ): WorkflowVersion {
    const versions = this.versions.get(workflowId) || []
    const lastVersion = versions.length > 0 ? versions[versions.length - 1] : undefined
    const previousVersion = lastVersion?.version

    const versionRecord: WorkflowVersion = {
      version,
      changeDescription,
      changedBy,
      changedAt: new Date(),
      previousVersion,
      changeType,
      snapshot
    }

    versions.push(versionRecord)
    this.versions.set(workflowId, versions)

    return versionRecord
  }

  /**
   * Create new version of workflow
   */
  createVersion(
    workflowId: string,
    changeType: 'major' | 'minor' | 'patch',
    changeDescription: string,
    changedBy: string,
    snapshot?: any
  ): string | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return null
    }

    // Parse current version
    const [major = 1, minor = 0, patch = 0] = workflow.version.split('.').map(Number)

    // Calculate new version
    let newVersion: string
    switch (changeType) {
      case 'major':
        newVersion = `${major + 1}.0.0`
        break
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`
        break
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`
        break
    }

    // Update workflow version
    workflow.version = newVersion
    workflow.updatedAt = new Date()
    workflow.updatedBy = changedBy

    // Create version record
    this.createVersionRecord(workflowId, newVersion, changeDescription, changedBy, changeType, snapshot)

    return newVersion
  }

  /**
   * Get version history
   */
  getVersionHistory(workflowId: string): WorkflowVersion[] {
    return this.versions.get(workflowId) || []
  }

  /**
   * Get latest version
   */
  getLatestVersion(workflowId: string): WorkflowVersion | undefined {
    const versions = this.versions.get(workflowId)
    return versions && versions.length > 0 ? versions[versions.length - 1] : undefined
  }

  /**
   * Create performance summary
   */
  createPerformanceSummary(
    workflowId: string,
    totalExecutions: number,
    successfulExecutions: number,
    failedExecutions: number,
    avgExecutionTime: number,
    totalUsersAffected: number,
    metricPerformances: MetricPerformance[]
  ): WorkflowPerformanceSummary | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return null
    }

    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0
    const healthScore = this.calculateHealth(workflowId)

    const summary: WorkflowPerformanceSummary = {
      workflowId,
      workflowName: workflow.name,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      avgExecutionTime,
      totalUsersAffected,
      metricPerformances,
      healthScore,
      lastUpdated: new Date()
    }

    this.performances.set(workflowId, summary)
    return summary
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(workflowId: string): WorkflowPerformanceSummary | undefined {
    return this.performances.get(workflowId)
  }

  /**
   * Calculate metric statistics from data points
   */
  calculateMetricStats(dataPoints: MetricDataPoint[]): MetricStats {
    if (dataPoints.length === 0) {
      return {
        current: 0,
        min: 0,
        max: 0,
        average: 0,
        trend: 'stable'
      }
    }

    const values = dataPoints.map(dp => dp.value)
    const current = values[values.length - 1] || 0
    const previous = values.length > 1 ? values[values.length - 2] : undefined
    const min = Math.min(...values)
    const max = Math.max(...values)
    const average = values.reduce((sum, val) => sum + val, 0) / values.length

    // Calculate median
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted.length % 2 === 0
      ? ((sorted[sorted.length / 2 - 1] || 0) + (sorted[sorted.length / 2] || 0)) / 2
      : sorted[Math.floor(sorted.length / 2)] || 0

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Calculate change
    const change = previous !== undefined ? current - previous : undefined
    const changePercentage = previous !== undefined && previous !== 0 && change !== undefined
      ? (change / previous) * 100
      : undefined

    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (changePercentage !== undefined) {
      if (Math.abs(changePercentage) < 5) {
        trend = 'stable'
      } else if (changePercentage > 0) {
        trend = 'up'
      } else {
        trend = 'down'
      }
    }

    return {
      current,
      previous,
      change,
      changePercentage,
      min,
      max,
      average,
      median,
      stdDev,
      trend
    }
  }

  /**
   * Add tags to workflow
   */
  addTags(workflowId: string, tags: string[]): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    // Add unique tags
    tags.forEach(tag => {
      if (!workflow.tags.includes(tag)) {
        workflow.tags.push(tag)
      }
    })

    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Remove tags from workflow
   */
  removeTags(workflowId: string, tags: string[]): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    workflow.tags = workflow.tags.filter(tag => !tags.includes(tag))
    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Set target segments
   */
  setTargetSegments(workflowId: string, segmentIds: string[]): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    workflow.targetSegments = segmentIds
    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Set custom field
   */
  setCustomField(workflowId: string, key: string, value: any): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return false
    }

    if (!workflow.customFields) {
      workflow.customFields = {}
    }

    workflow.customFields[key] = value
    workflow.updatedAt = new Date()
    return true
  }

  /**
   * Get custom field
   */
  getCustomField(workflowId: string, key: string): any | undefined {
    const workflow = this.workflows.get(workflowId)
    return workflow?.customFields?.[key]
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(workflowId: string): boolean {
    const deleted = this.workflows.delete(workflowId)
    if (deleted) {
      this.versions.delete(workflowId)
      this.performances.delete(workflowId)
    }
    return deleted
  }

  /**
   * Validate workflow metadata
   */
  validateWorkflow(workflow: WorkflowMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required')
    }

    if (!workflow.purpose) {
      errors.push('Workflow purpose is required')
    }

    if (!workflow.version || !/^\d+\.\d+\.\d+$/.test(workflow.version)) {
      errors.push('Valid semantic version (X.Y.Z) is required')
    }

    if (workflow.metrics.length === 0) {
      errors.push('At least one metric is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Export workflow as JSON
   */
  exportWorkflow(workflowId: string, includeVersions: boolean = false): string | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return null
    }

    const exportData: any = { ...workflow }

    if (includeVersions) {
      exportData.versionHistory = this.getVersionHistory(workflowId)
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import workflow from JSON
   */
  importWorkflow(json: string): WorkflowMetadata | null {
    try {
      const workflow = JSON.parse(json) as WorkflowMetadata

      // Validate
      const validation = this.validateWorkflow(workflow)
      if (!validation.valid) {
        console.error('[WorkflowMetadataService] Import validation failed:', validation.errors)
        return null
      }

      // Generate new ID
      const newId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      workflow.id = newId

      this.workflows.set(newId, workflow)
      return workflow
    } catch (error) {
      console.error('[WorkflowMetadataService] Import failed:', error)
      return null
    }
  }

  /**
   * Get workflow count
   */
  getWorkflowCount(): number {
    return this.workflows.size
  }

  /**
   * Check if workflow exists
   */
  exists(workflowId: string): boolean {
    return this.workflows.has(workflowId)
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.workflows.clear()
    this.versions.clear()
    this.performances.clear()
  }
}

// Create and export singleton instance
export const workflowMetadataService = new WorkflowMetadataService()

// Export class for testing
export { WorkflowMetadataService }

// Export default
export default workflowMetadataService
