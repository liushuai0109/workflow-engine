/**
 * Lifecycle Service
 *
 * Service for managing AARRR lifecycle stages, transitions, and user progression.
 * Provides functionality for:
 * - Loading lifecycle stage configurations
 * - Managing lifecycle metadata
 * - Validating lifecycle transitions
 * - Tracking user stage progression
 */

import type {
  LifecycleStage,
  LifecycleStageConfig,
  LifecycleMetadata,
  LifecycleTransition,
  LifecycleHistoryEntry,
  LifecycleStageStats,
  LifecycleConfig,
  TransitionCondition
} from '@/types/lifecycle'
import { DEFAULT_LIFECYCLE_STAGES, getStageConfig, getStageColor, getStageIcon, isCompatibleVersion } from '@/types/lifecycle'
import lifecycleStagesConfig from '@/config/lifecycle-stages.json'

/**
 * Lifecycle configuration loaded from JSON
 */
interface LifecycleConfigJSON {
  version: string
  description: string
  stages: any[]
  transitions: any[]
  metadata: Record<string, any>
}

/**
 * Lifecycle Service Class
 *
 * Provides centralized lifecycle stage management functionality.
 */
class LifecycleService {
  private config: LifecycleConfigJSON
  private stages: Map<LifecycleStage, LifecycleStageConfig>
  private transitions: LifecycleTransition[]

  constructor() {
    this.config = lifecycleStagesConfig as LifecycleConfigJSON
    this.stages = new Map()
    this.transitions = []
    this.initialize()
  }

  /**
   * Initialize service by loading configuration
   */
  private initialize(): void {
    try {
      // Load stages from configuration
      this.config.stages.forEach((stageData: any) => {
        const stage = stageData.stage as LifecycleStage
        const config: LifecycleStageConfig = {
          stage,
          label: stageData.label || stageData.stage,
          description: stageData.description || '',
          color: stageData.color || '#757575',
          icon: stageData.icon || '📊',
          order: stageData.order || 0,
          examples: stageData.exampleWorkflows || stageData.examples || [],
          metrics: stageData.metrics || []
        }
        this.stages.set(stage, config)
      })

      // Load transitions from configuration
      this.transitions = this.config.transitions.map((transitionData: any) => {
        const transition: LifecycleTransition = {
          fromStage: transitionData.from as LifecycleStage,
          toStage: transitionData.to as LifecycleStage,
          conditions: transitionData.conditions?.map((cond: any) => ({
            field: cond.metric || cond.event || cond.field || '',
            operator: cond.operator || 'equals',
            value: cond.value !== undefined ? cond.value : true
          })) || [],
          automatic: transitionData.automated !== false
        }
        return transition
      })

      console.log(`[LifecycleService] Initialized with ${this.stages.size} stages and ${this.transitions.length} transitions`)
    } catch (error) {
      console.error('[LifecycleService] Failed to initialize:', error)
      // Fallback to default stages
      DEFAULT_LIFECYCLE_STAGES.forEach(stage => {
        this.stages.set(stage.stage, stage)
      })
    }
  }

  /**
   * Get all lifecycle stage configurations
   */
  getAllStages(): LifecycleStageConfig[] {
    return Array.from(this.stages.values()).sort((a, b) => a.order - b.order)
  }

  /**
   * Get configuration for a specific stage
   */
  getStageConfiguration(stage: LifecycleStage): LifecycleStageConfig | undefined {
    return this.stages.get(stage) || getStageConfig(stage)
  }

  /**
   * Get stage by order number (1-5 for AARRR)
   */
  getStageByOrder(order: number): LifecycleStageConfig | undefined {
    return Array.from(this.stages.values()).find(stage => stage.order === order)
  }

  /**
   * Get color for a lifecycle stage
   */
  getColor(stage: LifecycleStage): string {
    const config = this.stages.get(stage)
    return config?.color || getStageColor(stage)
  }

  /**
   * Get icon for a lifecycle stage
   */
  getIcon(stage: LifecycleStage): string {
    const config = this.stages.get(stage)
    return config?.icon || getStageIcon(stage)
  }

  /**
   * Get all available lifecycle transitions
   */
  getTransitions(): LifecycleTransition[] {
    return [...this.transitions]
  }

  /**
   * Get transitions from a specific stage
   */
  getTransitionsFrom(fromStage: LifecycleStage): LifecycleTransition[] {
    return this.transitions.filter(t => t.fromStage === fromStage)
  }

  /**
   * Get transitions to a specific stage
   */
  getTransitionsTo(toStage: LifecycleStage): LifecycleTransition[] {
    return this.transitions.filter(t => t.toStage === toStage)
  }

  /**
   * Check if a transition exists between two stages
   */
  canTransition(fromStage: LifecycleStage, toStage: LifecycleStage): boolean {
    return this.transitions.some(t => t.fromStage === fromStage && t.toStage === toStage)
  }

  /**
   * Validate if a transition is allowed based on conditions
   */
  validateTransition(
    fromStage: LifecycleStage,
    toStage: LifecycleStage,
    userData: Record<string, any>
  ): { valid: boolean; reason?: string } {
    const transition = this.transitions.find(
      t => t.fromStage === fromStage && t.toStage === toStage
    )

    if (!transition) {
      return {
        valid: false,
        reason: `No transition defined from ${fromStage} to ${toStage}`
      }
    }

    // If no conditions, transition is valid
    if (!transition.conditions || transition.conditions.length === 0) {
      return { valid: true }
    }

    // Check all conditions
    for (const condition of transition.conditions) {
      const result = this.evaluateCondition(condition, userData)
      if (!result) {
        return {
          valid: false,
          reason: `Condition not met: ${condition.field} ${condition.operator} ${condition.value}`
        }
      }
    }

    return { valid: true }
  }

  /**
   * Evaluate a single transition condition
   */
  private evaluateCondition(condition: TransitionCondition, userData: Record<string, any>): boolean {
    const actualValue = userData[condition.field]

    if (actualValue === undefined || actualValue === null) {
      return false
    }

    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value
      case 'not_equals':
        return actualValue !== condition.value
      case 'greater_than':
        return actualValue > condition.value
      case 'less_than':
        return actualValue < condition.value
      case 'gte':
        return actualValue >= condition.value
      case 'lte':
        return actualValue <= condition.value
      default:
        return false
    }
  }

  /**
   * Create lifecycle metadata for a workflow element
   */
  createMetadata(
    stage: LifecycleStage,
    options?: {
      color?: string
      icon?: string
      description?: string
    }
  ): LifecycleMetadata {
    return {
      stage,
      color: options?.color,
      icon: options?.icon,
      description: options?.description,
      version: '1.0.0'
    }
  }

  /**
   * Validate lifecycle metadata
   */
  validateMetadata(metadata: LifecycleMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!metadata.stage) {
      errors.push('Stage is required')
    }

    if (!metadata.version) {
      errors.push('Version is required')
    } else if (!isCompatibleVersion(metadata.version)) {
      errors.push(`Incompatible version: ${metadata.version}`)
    }

    // Validate stage exists
    if (metadata.stage && !this.stages.has(metadata.stage)) {
      errors.push(`Unknown stage: ${metadata.stage}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get the next recommended stage for a user
   */
  getNextStage(currentStage: LifecycleStage, userData: Record<string, any>): LifecycleStage | null {
    const possibleTransitions = this.getTransitionsFrom(currentStage)

    // Find first automatic transition where conditions are met
    for (const transition of possibleTransitions) {
      if (transition.automatic) {
        const validation = this.validateTransition(currentStage, transition.toStage, userData)
        if (validation.valid) {
          return transition.toStage
        }
      }
    }

    return null
  }

  /**
   * Create a lifecycle history entry
   */
  createHistoryEntry(
    userId: string,
    fromStage: LifecycleStage | null,
    toStage: LifecycleStage,
    reason: 'automatic' | 'manual' | 'workflow',
    metadata?: Record<string, any>
  ): LifecycleHistoryEntry {
    return {
      userId,
      fromStage,
      toStage,
      timestamp: new Date(),
      reason,
      metadata
    }
  }

  /**
   * Calculate lifecycle stage statistics
   */
  calculateStageStats(
    stage: LifecycleStage,
    userCounts: { [key in LifecycleStage]?: number },
    avgDuration: number,
    conversionRate?: number
  ): LifecycleStageStats {
    const totalUsers = Object.values(userCounts).reduce((sum, count) => sum + (count || 0), 0)
    const stageUserCount = userCounts[stage] || 0

    return {
      stage,
      userCount: stageUserCount,
      percentage: totalUsers > 0 ? (stageUserCount / totalUsers) * 100 : 0,
      avgDuration,
      conversionRate,
      lastUpdated: new Date()
    }
  }

  /**
   * Get lifecycle configuration
   */
  getConfiguration(): LifecycleConfig {
    return {
      version: this.config.version || '1.0.0',
      stages: this.getAllStages(),
      transitions: this.transitions,
      autoTransitionsEnabled: true,
      defaultStage: 'Acquisition' as LifecycleStage
    }
  }

  /**
   * Export lifecycle data as JSON
   */
  exportConfiguration(): string {
    return JSON.stringify(this.getConfiguration(), null, 2)
  }

  /**
   * Check if service is properly initialized
   */
  isInitialized(): boolean {
    return this.stages.size > 0
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.config.version || '1.0.0'
  }

  /**
   * Get metadata about the lifecycle framework
   */
  getFrameworkInfo(): Record<string, any> {
    return this.config.metadata || {
      framework: 'AARRR (Pirate Metrics)',
      version: this.config.version
    }
  }
}

// Create and export singleton instance
export const lifecycleService = new LifecycleService()

// Export class for testing
export { LifecycleService }

// Export default
export default lifecycleService
