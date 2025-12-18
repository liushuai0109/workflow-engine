/**
 * Trigger Service
 *
 * Service for managing workflow triggers, conditions, and execution scheduling.
 * Provides functionality for:
 * - Loading trigger templates
 * - Creating and validating triggers
 * - Evaluating trigger conditions
 * - Managing trigger execution
 */

import type {
  Trigger,
  TriggerType,
  TriggerTemplate,
  TriggerCondition,
  TriggerExecution,
  TriggerStats,
  Schedule,
  EventFilter,
  EventType,
  ScheduleType
} from '@/types/triggers'
import {
  validateTrigger,
  validateSchedule,
  isValidCronExpression,
  formatSchedule,
  CRON_PRESETS
} from '@/types/triggers'
import type { ConditionOperator } from '@/types/segments'
import triggerTemplatesConfig from '@/config/trigger-templates.json'

/**
 * Trigger configuration loaded from JSON
 */
interface TriggerConfigJSON {
  version: string
  description: string
  triggers: any[]
  cronPresets?: Record<string, { expression: string; description: string } | string>
  eventTypes?: Record<string, string[]>
}

/**
 * Trigger Service Class
 *
 * Provides centralized trigger management functionality.
 */
class TriggerService {
  private config: TriggerConfigJSON
  private templates: Map<string, TriggerTemplate>
  private triggers: Map<string, Trigger>
  private cronPresets: Map<string, string>

  constructor() {
    this.config = triggerTemplatesConfig as TriggerConfigJSON
    this.templates = new Map()
    this.triggers = new Map()
    this.cronPresets = new Map()
    this.initialize()
  }

  /**
   * Initialize service by loading configuration
   */
  private initialize(): void {
    try {
      // Load trigger templates from configuration
      this.config.triggers.forEach((triggerData: any) => {
        const template: TriggerTemplate = {
          id: triggerData.id,
          name: triggerData.name,
          description: triggerData.description || '',
          type: triggerData.type as TriggerType,
          icon: triggerData.icon || '⚡',
          category: triggerData.category || 'general',
          event: triggerData.event as EventType,
          exampleFilters: triggerData.eventFilters,
          exampleSchedule: triggerData.schedule,
          exampleThresholds: triggerData.thresholds,
          tags: triggerData.tags || [],
          order: triggerData.order
        }
        this.templates.set(template.id, template)
      })

      // Load cron presets
      if (this.config.cronPresets) {
        Object.entries(this.config.cronPresets).forEach(([name, value]) => {
          const expression = typeof value === 'string' ? value : value.expression
          this.cronPresets.set(name, expression)
        })
      }

      // Add default cron presets
      Object.entries(CRON_PRESETS).forEach(([name, expression]) => {
        if (!this.cronPresets.has(name.toLowerCase())) {
          this.cronPresets.set(name.toLowerCase(), expression)
        }
      })

      console.log(`[TriggerService] Initialized with ${this.templates.size} templates and ${this.cronPresets.size} cron presets`)
    } catch (error) {
      console.error('[TriggerService] Failed to initialize:', error)
      // Load default cron presets as fallback
      Object.entries(CRON_PRESETS).forEach(([name, expression]) => {
        this.cronPresets.set(name.toLowerCase(), expression)
      })
    }
  }

  /**
   * Get all trigger templates
   */
  getAllTemplates(): TriggerTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Get trigger template by ID
   */
  getTemplate(templateId: string): TriggerTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: TriggerType): TriggerTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.type === type)
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): TriggerTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category)
  }

  /**
   * Create a trigger from a template
   */
  createFromTemplate(templateId: string, customName?: string): Trigger | null {
    const template = this.templates.get(templateId)
    if (!template) {
      return null
    }

    const trigger: Trigger = {
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customName || template.name,
      type: template.type,
      description: template.description,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Copy type-specific configuration
    if (template.type === 'event') {
      trigger.event = template.event
      trigger.eventFilters = template.exampleFilters ? JSON.parse(JSON.stringify(template.exampleFilters)) : []
    } else if (template.type === 'scheduled') {
      trigger.schedule = template.exampleSchedule ? JSON.parse(JSON.stringify(template.exampleSchedule)) : undefined
    } else if (template.type === 'threshold') {
      trigger.thresholds = template.exampleThresholds ? JSON.parse(JSON.stringify(template.exampleThresholds)) : []
    }

    trigger.tags = [...(template.tags || [])]

    return trigger
  }

  /**
   * Create a custom trigger
   */
  createTrigger(
    name: string,
    type: TriggerType,
    options?: {
      description?: string
      event?: EventType | string
      eventFilters?: EventFilter[]
      schedule?: Schedule
      thresholds?: TriggerCondition[]
      enabled?: boolean
      tags?: string[]
    }
  ): Trigger {
    const trigger: Trigger = {
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      description: options?.description,
      enabled: options?.enabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: options?.tags || []
    }

    // Set type-specific configuration
    if (type === 'event') {
      trigger.event = options?.event
      trigger.eventFilters = options?.eventFilters || []
    } else if (type === 'scheduled' && options?.schedule) {
      trigger.schedule = options.schedule
    } else if (type === 'threshold') {
      trigger.thresholds = options?.thresholds || []
    }

    this.triggers.set(trigger.id, trigger)
    return trigger
  }

  /**
   * Validate a trigger
   */
  validate(trigger: Trigger): { valid: boolean; errors: string[] } {
    return validateTrigger(trigger)
  }

  /**
   * Evaluate trigger conditions
   */
  evaluateTrigger(trigger: Trigger, context: Record<string, any>): boolean {
    if (!trigger.enabled) {
      return false
    }

    switch (trigger.type) {
      case 'event':
        return this.evaluateEventTrigger(trigger, context)

      case 'threshold':
        return this.evaluateThresholdTrigger(trigger, context)

      case 'manual':
        return context.manualTrigger === true

      case 'scheduled':
        // Scheduled triggers are evaluated by external scheduler
        // This just checks if the trigger should run
        return context.scheduledExecution === true

      default:
        return false
    }
  }

  /**
   * Evaluate event-based trigger
   */
  private evaluateEventTrigger(trigger: Trigger, context: Record<string, any>): boolean {
    // Check if event matches
    if (context.eventType !== trigger.event) {
      return false
    }

    // If no filters, event match is sufficient
    if (!trigger.eventFilters || trigger.eventFilters.length === 0) {
      return true
    }

    // Evaluate all filters
    const eventData = context.eventData || {}
    return trigger.eventFilters.every(filter => {
      const actualValue = eventData[filter.property]
      return this.evaluateOperator(filter.operator, actualValue, filter.value)
    })
  }

  /**
   * Evaluate threshold-based trigger
   */
  private evaluateThresholdTrigger(trigger: Trigger, context: Record<string, any>): boolean {
    if (!trigger.thresholds || trigger.thresholds.length === 0) {
      return false
    }

    // All thresholds must be met
    return trigger.thresholds.every(threshold => {
      const actualValue = context[threshold.field]
      return this.evaluateOperator(threshold.operator, actualValue, threshold.value)
    })
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(operator: ConditionOperator, actualValue: any, expectedValue: any): boolean {
    if (actualValue === undefined || actualValue === null) {
      return operator === 'not_exists'
    }

    switch (operator) {
      case 'equals':
        return actualValue === expectedValue

      case 'not_equals':
        return actualValue !== expectedValue

      case 'greater_than':
        return actualValue > expectedValue

      case 'less_than':
        return actualValue < expectedValue

      case 'gte':
        return actualValue >= expectedValue

      case 'lte':
        return actualValue <= expectedValue

      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue)

      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue)

      case 'exists':
        return true

      case 'not_exists':
        return false

      default:
        return false
    }
  }

  /**
   * Create a trigger execution record
   */
  createExecution(
    triggerId: string,
    workflowInstanceId: string,
    triggerSource: 'scheduled' | 'event' | 'threshold' | 'manual',
    options?: {
      eventData?: any
      thresholdValues?: Record<string, any>
    }
  ): TriggerExecution {
    return {
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggerId,
      workflowInstanceId,
      triggeredAt: new Date(),
      triggerSource,
      eventData: options?.eventData,
      thresholdValues: options?.thresholdValues,
      status: 'pending'
    }
  }

  /**
   * Calculate trigger statistics
   */
  calculateStats(
    triggerId: string,
    totalExecutions: number,
    successfulExecutions: number,
    failedExecutions: number,
    avgExecutionTime: number,
    lastExecutedAt?: Date
  ): TriggerStats {
    return {
      triggerId,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgExecutionTime,
      lastExecutedAt,
      lastUpdated: new Date()
    }
  }

  /**
   * Validate a schedule
   */
  validateSchedule(schedule: Schedule): { valid: boolean; error?: string } {
    return validateSchedule(schedule)
  }

  /**
   * Format schedule as human-readable text
   */
  formatSchedule(schedule: Schedule): string {
    return formatSchedule(schedule)
  }

  /**
   * Get cron preset by name
   */
  getCronPreset(presetName: string): string | undefined {
    return this.cronPresets.get(presetName.toLowerCase())
  }

  /**
   * Get all cron presets
   */
  getAllCronPresets(): Record<string, string> {
    const presets: Record<string, string> = {}
    this.cronPresets.forEach((expression, name) => {
      presets[name] = expression
    })
    return presets
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): boolean {
    return isValidCronExpression(expression)
  }

  /**
   * Create a scheduled trigger with cron preset
   */
  createScheduledTrigger(
    name: string,
    presetName: string,
    options?: {
      description?: string
      timezone?: string
      enabled?: boolean
    }
  ): Trigger | null {
    const cronExpression = this.getCronPreset(presetName)
    if (!cronExpression) {
      return null
    }

    const schedule: Schedule = {
      type: 'cron' as ScheduleType,
      expression: cronExpression,
      timezone: options?.timezone || 'UTC',
      enabled: true
    }

    return this.createTrigger(name, 'scheduled' as TriggerType, {
      description: options?.description,
      schedule,
      enabled: options?.enabled
    })
  }

  /**
   * Create an event-based trigger
   */
  createEventTrigger(
    name: string,
    event: EventType | string,
    filters?: EventFilter[],
    options?: {
      description?: string
      enabled?: boolean
    }
  ): Trigger {
    return this.createTrigger(name, 'event' as TriggerType, {
      description: options?.description,
      event,
      eventFilters: filters || [],
      enabled: options?.enabled
    })
  }

  /**
   * Create a threshold-based trigger
   */
  createThresholdTrigger(
    name: string,
    thresholds: TriggerCondition[],
    checkInterval: number,
    options?: {
      description?: string
      enabled?: boolean
    }
  ): Trigger {
    const trigger = this.createTrigger(name, 'threshold' as TriggerType, {
      description: options?.description,
      thresholds,
      enabled: options?.enabled
    })

    trigger.checkInterval = checkInterval
    return trigger
  }

  /**
   * Get trigger by ID
   */
  getTrigger(triggerId: string): Trigger | undefined {
    return this.triggers.get(triggerId)
  }

  /**
   * Update trigger
   */
  updateTrigger(triggerId: string, updates: Partial<Trigger>): Trigger | null {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) {
      return null
    }

    const updated = {
      ...trigger,
      ...updates,
      updatedAt: new Date()
    }

    this.triggers.set(triggerId, updated)
    return updated
  }

  /**
   * Delete trigger
   */
  deleteTrigger(triggerId: string): boolean {
    return this.triggers.delete(triggerId)
  }

  /**
   * Enable/disable trigger
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): boolean {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) {
      return false
    }

    trigger.enabled = enabled
    trigger.updatedAt = new Date()
    return true
  }

  /**
   * Check if service is properly initialized
   */
  isInitialized(): boolean {
    return this.templates.size > 0 && this.cronPresets.size > 0
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.config.version || '1.0.0'
  }

  /**
   * Export trigger as JSON
   */
  exportTrigger(trigger: Trigger): string {
    return JSON.stringify(trigger, null, 2)
  }

  /**
   * Import trigger from JSON
   */
  importTrigger(json: string): Trigger | null {
    try {
      const trigger = JSON.parse(json) as Trigger
      const validation = this.validate(trigger)

      if (!validation.valid) {
        console.error('[TriggerService] Import validation failed:', validation.errors)
        return null
      }

      this.triggers.set(trigger.id, trigger)
      return trigger
    } catch (error) {
      console.error('[TriggerService] Import failed:', error)
      return null
    }
  }

  /**
   * Get all event types from configuration
   */
  getEventTypes(): string[] {
    if (!this.config.eventTypes) {
      return []
    }

    // If eventTypes is an object with categories
    if (typeof this.config.eventTypes === 'object' && !Array.isArray(this.config.eventTypes)) {
      const allEvents: string[] = []
      Object.values(this.config.eventTypes).forEach(categoryEvents => {
        if (Array.isArray(categoryEvents)) {
          allEvents.push(...categoryEvents)
        }
      })
      return allEvents
    }

    // If eventTypes is an array
    return this.config.eventTypes as unknown as string[]
  }

  /**
   * Check if event type is supported
   */
  isEventTypeSupported(eventType: string): boolean {
    const supportedTypes = this.getEventTypes()
    return supportedTypes.length === 0 || supportedTypes.includes(eventType)
  }
}

// Create and export singleton instance
export const triggerService = new TriggerService()

// Export class for testing
export { TriggerService }

// Export default
export default triggerService
