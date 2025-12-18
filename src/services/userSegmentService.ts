/**
 * User Segment Service
 *
 * Service for managing user segmentation, evaluation, and targeting.
 * Provides functionality for:
 * - Loading segment templates and definitions
 * - Evaluating users against segment conditions
 * - Managing segment memberships
 * - Calculating segment statistics
 */

import type {
  UserSegment,
  SegmentCondition,
  SegmentType,
  SegmentTemplate,
  SegmentEvaluationResult,
  ConditionResult,
  SegmentStats,
  SegmentMembership,
  SegmentField,
  LogicalOperator,
  ConditionOperator
} from '@/types/segments'
import { validateCondition, validateSegment, DEFAULT_SEGMENT_FIELDS } from '@/types/segments'
import userSegmentsConfig from '@/config/user-segments.json'

/**
 * User segment configuration loaded from JSON
 */
interface UserSegmentConfigJSON {
  version: string
  description: string
  segments: any[]
  fieldDefinitions?: any[]
}

/**
 * User Segment Service Class
 *
 * Provides centralized user segmentation functionality.
 */
class UserSegmentService {
  private config: UserSegmentConfigJSON
  private templates: Map<string, SegmentTemplate>
  private segments: Map<string, UserSegment>
  private fields: Map<string, SegmentField>

  constructor() {
    this.config = userSegmentsConfig as UserSegmentConfigJSON
    this.templates = new Map()
    this.segments = new Map()
    this.fields = new Map()
    this.initialize()
  }

  /**
   * Initialize service by loading configuration
   */
  private initialize(): void {
    try {
      // Load segment templates from configuration
      this.config.segments.forEach((segmentData: any) => {
        const template: SegmentTemplate = {
          id: segmentData.id,
          name: segmentData.name,
          description: segmentData.description || '',
          type: segmentData.type as SegmentType,
          icon: segmentData.icon || '👥',
          conditions: segmentData.conditions || [],
          operator: segmentData.operator as LogicalOperator || 'AND',
          tags: segmentData.tags || [],
          order: segmentData.order,
          active: segmentData.isActive !== false
        }
        this.templates.set(template.id, template)

        // Also create as a segment
        const segment: UserSegment = {
          id: segmentData.id,
          name: segmentData.name,
          description: segmentData.description,
          type: segmentData.type as SegmentType,
          conditions: segmentData.conditions || [],
          operator: segmentData.operator as LogicalOperator || 'AND',
          isTemplate: true,
          tags: segmentData.tags || [],
          estimatedCount: segmentData.estimatedSize
        }
        this.segments.set(segment.id, segment)
      })

      // Load field definitions
      if (this.config.fieldDefinitions) {
        this.config.fieldDefinitions.forEach((fieldData: any) => {
          const field: SegmentField = {
            name: fieldData.name,
            label: fieldData.label || fieldData.name,
            type: fieldData.type,
            category: fieldData.category,
            description: fieldData.description,
            supportedOperators: fieldData.supportedOperators || [],
            examples: fieldData.examples,
            indexed: fieldData.indexed
          }
          this.fields.set(field.name, field)
        })
      }

      // Fallback to default fields if no fields loaded
      if (this.fields.size === 0) {
        DEFAULT_SEGMENT_FIELDS.forEach(field => {
          this.fields.set(field.name, field)
        })
      }

      console.log(`[UserSegmentService] Initialized with ${this.templates.size} templates and ${this.fields.size} fields`)
    } catch (error) {
      console.error('[UserSegmentService] Failed to initialize:', error)
      // Load default fields as fallback
      DEFAULT_SEGMENT_FIELDS.forEach(field => {
        this.fields.set(field.name, field)
      })
    }
  }

  /**
   * Get all segment templates
   */
  getAllTemplates(): SegmentTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Get segment template by ID
   */
  getTemplate(templateId: string): SegmentTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: SegmentType): SegmentTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.type === type)
  }

  /**
   * Get templates by tag
   */
  getTemplatesByTag(tag: string): SegmentTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.tags.includes(tag))
  }

  /**
   * Create a segment from a template
   */
  createFromTemplate(templateId: string, customName?: string): UserSegment | null {
    const template = this.templates.get(templateId)
    if (!template) {
      return null
    }

    const segment: UserSegment = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customName || template.name,
      description: template.description,
      type: template.type,
      conditions: JSON.parse(JSON.stringify(template.conditions)), // Deep copy
      operator: template.operator,
      isTemplate: false,
      tags: [...template.tags],
      createdAt: new Date()
    }

    return segment
  }

  /**
   * Create a custom segment
   */
  createSegment(
    name: string,
    type: SegmentType,
    conditions: SegmentCondition[],
    operator: LogicalOperator,
    options?: {
      description?: string
      tags?: string[]
    }
  ): UserSegment {
    const segment: UserSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      conditions,
      operator,
      description: options?.description,
      tags: options?.tags || [],
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.segments.set(segment.id, segment)
    return segment
  }

  /**
   * Validate a segment
   */
  validate(segment: UserSegment): { valid: boolean; errors: string[] } {
    return validateSegment(segment)
  }

  /**
   * Evaluate a user against a segment
   */
  evaluateUser(segment: UserSegment, userData: Record<string, any>): SegmentEvaluationResult {
    const conditionResults: ConditionResult[] = []
    let matches = false

    // Evaluate each condition
    for (const condition of segment.conditions) {
      const result = this.evaluateCondition(condition, userData)
      conditionResults.push(result)
    }

    // Apply logical operator
    if (segment.operator === 'AND') {
      matches = conditionResults.every(r => r.passed)
    } else { // OR
      matches = conditionResults.some(r => r.passed)
    }

    return {
      segmentId: segment.id,
      userId: userData.userId || userData.id || 'unknown',
      matches,
      evaluatedAt: new Date(),
      conditionResults,
      reason: matches
        ? `User matches ${segment.name}`
        : `User does not match ${segment.name}`
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: SegmentCondition, userData: Record<string, any>): ConditionResult {
    const actualValue = userData[condition.field]

    // Validate condition first
    const validation = validateCondition(condition)
    if (!validation.valid) {
      return {
        condition,
        passed: false,
        error: validation.error
      }
    }

    // Handle missing values
    if (actualValue === undefined || actualValue === null) {
      // Exists/NotExists operators
      if (condition.operator === 'not_exists') {
        return { condition, passed: true, actualValue }
      }
      if (condition.operator === 'exists') {
        return { condition, passed: false, actualValue }
      }
      return {
        condition,
        passed: false,
        actualValue,
        error: `Field '${condition.field}' is null or undefined`
      }
    }

    // Evaluate based on operator
    try {
      const passed = this.evaluateOperator(condition.operator, actualValue, condition.value)
      return { condition, passed, actualValue }
    } catch (error) {
      return {
        condition,
        passed: false,
        actualValue,
        error: error instanceof Error ? error.message : 'Evaluation error'
      }
    }
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(operator: ConditionOperator, actualValue: any, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue

      case 'not_equals':
        return actualValue !== expectedValue

      case 'greater_than':
        return this.parseValue(actualValue) > this.parseValue(expectedValue)

      case 'less_than':
        return this.parseValue(actualValue) < this.parseValue(expectedValue)

      case 'gte':
        return this.parseValue(actualValue) >= this.parseValue(expectedValue)

      case 'lte':
        return this.parseValue(actualValue) <= this.parseValue(expectedValue)

      case 'between':
        if (!Array.isArray(expectedValue) || expectedValue.length !== 2) {
          throw new Error('Between operator requires array of 2 values')
        }
        const val = this.parseValue(actualValue)
        const [min, max] = expectedValue.map(v => this.parseValue(v))
        return val >= min && val <= max

      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())

      case 'in':
        if (!Array.isArray(expectedValue)) {
          throw new Error('In operator requires an array')
        }
        return expectedValue.includes(actualValue)

      case 'not_in':
        if (!Array.isArray(expectedValue)) {
          throw new Error('Not in operator requires an array')
        }
        return !expectedValue.includes(actualValue)

      case 'matches':
        const regex = new RegExp(String(expectedValue))
        return regex.test(String(actualValue))

      case 'exists':
        return actualValue !== undefined && actualValue !== null

      case 'not_exists':
        return actualValue === undefined || actualValue === null

      default:
        throw new Error(`Unknown operator: ${operator}`)
    }
  }

  /**
   * Parse value for comparison (handles dates, numbers, etc.)
   */
  private parseValue(value: any): any {
    // Handle relative date expressions (e.g., "NOW-7d")
    if (typeof value === 'string' && value.startsWith('NOW')) {
      return this.parseRelativeDate(value)
    }

    // Handle ISO date strings
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).getTime()
    }

    // Handle numbers
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value)
    }

    return value
  }

  /**
   * Parse relative date expression (e.g., "NOW-7d", "NOW-30d", "NOW+1d")
   */
  private parseRelativeDate(expression: string): number {
    const now = Date.now()
    const match = expression.match(/^NOW([+-])(\d+)([dhms])$/)

    if (!match) {
      return now
    }

    const [, sign, amount, unit] = match
    const value = parseInt(amount || '0', 10)

    let milliseconds = 0
    switch (unit) {
      case 's': milliseconds = value * 1000; break
      case 'm': milliseconds = value * 60 * 1000; break
      case 'h': milliseconds = value * 60 * 60 * 1000; break
      case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break
    }

    return sign === '+' ? now + milliseconds : now - milliseconds
  }

  /**
   * Get all available field definitions
   */
  getAllFields(): SegmentField[] {
    return Array.from(this.fields.values())
  }

  /**
   * Get field definition by name
   */
  getField(fieldName: string): SegmentField | undefined {
    return this.fields.get(fieldName)
  }

  /**
   * Get fields by category
   */
  getFieldsByCategory(category: string): SegmentField[] {
    return Array.from(this.fields.values()).filter(f => f.category === category)
  }

  /**
   * Calculate segment statistics
   */
  calculateStats(
    segment: UserSegment,
    userCount: number,
    totalUsers: number,
    growthRate: number,
    avgUserValue?: number
  ): SegmentStats {
    return {
      segmentId: segment.id,
      userCount,
      percentage: totalUsers > 0 ? (userCount / totalUsers) * 100 : 0,
      growthRate,
      avgUserValue,
      lastUpdated: new Date()
    }
  }

  /**
   * Create segment membership record
   */
  createMembership(
    userId: string,
    segmentId: string,
    source: 'automatic' | 'manual' | 'import' = 'automatic',
    metadata?: Record<string, any>
  ): SegmentMembership {
    return {
      userId,
      segmentId,
      joinedAt: new Date(),
      source,
      metadata
    }
  }

  /**
   * Check if service is properly initialized
   */
  isInitialized(): boolean {
    return this.templates.size > 0 && this.fields.size > 0
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.config.version || '1.0.0'
  }

  /**
   * Export segment as JSON
   */
  exportSegment(segment: UserSegment): string {
    return JSON.stringify(segment, null, 2)
  }

  /**
   * Import segment from JSON
   */
  importSegment(json: string): UserSegment | null {
    try {
      const segment = JSON.parse(json) as UserSegment
      const validation = this.validate(segment)

      if (!validation.valid) {
        console.error('[UserSegmentService] Import validation failed:', validation.errors)
        return null
      }

      this.segments.set(segment.id, segment)
      return segment
    } catch (error) {
      console.error('[UserSegmentService] Import failed:', error)
      return null
    }
  }
}

// Create and export singleton instance
export const userSegmentService = new UserSegmentService()

// Export class for testing
export { UserSegmentService }

// Export default
export default userSegmentService
