/**
 * Tests for User Segment Service
 */

import { describe, it, expect } from 'vitest'
import { userSegmentService } from '../userSegmentService'
import { UserSegmentCondition, ComparisonOperator } from '@/types/segments'

describe('UserSegmentService', () => {
  describe('Segment Evaluation', () => {
    it('should evaluate simple condition', () => {
      const condition: UserSegmentCondition = {
        field: 'age',
        operator: ComparisonOperator.GreaterThan,
        value: 18
      }

      const user = { age: 25 }
      expect(userSegmentService.evaluateCondition(condition, user)).toBe(true)
    })

    it('should evaluate AND logic group', () => {
      const segment = userSegmentService.createSegment(
        'high-value',
        'High Value Users',
        {
          operator: 'AND',
          conditions: [
            { field: 'totalSpent', operator: ComparisonOperator.GreaterThan, value: 1000 },
            { field: 'accountAge', operator: ComparisonOperator.GreaterThan, value: 365 }
          ]
        }
      )

      const user = { totalSpent: 1500, accountAge: 400 }
      expect(userSegmentService.evaluateSegment(segment, user)).toBe(true)
    })

    it('should evaluate OR logic group', () => {
      const segment = userSegmentService.createSegment(
        'engaged',
        'Engaged Users',
        {
          operator: 'OR',
          conditions: [
            { field: 'loginCount', operator: ComparisonOperator.GreaterThan, value: 10 },
            { field: 'purchaseCount', operator: ComparisonOperator.GreaterThan, value: 1 }
          ]
        }
      )

      const user = { loginCount: 2, purchaseCount: 3 }
      expect(userSegmentService.evaluateSegment(segment, user)).toBe(true)
    })
  })

  describe('Segment Management', () => {
    it('should load predefined segments', () => {
      const segments = userSegmentService.getAllSegments()
      expect(segments.length).toBeGreaterThan(0)
      expect(segments.some(s => s.id === 'new_users')).toBe(true)
    })

    it('should get segment by ID', () => {
      const segment = userSegmentService.getSegmentById('new_users')
      expect(segment).toBeDefined()
      expect(segment?.name).toBe('New Users')
    })
  })

  describe('Segment Overlap', () => {
    it('should detect overlapping segments', () => {
      const segment1 = userSegmentService.createSegment('a', 'A', {
        operator: 'AND',
        conditions: [{ field: 'age', operator: ComparisonOperator.GreaterThan, value: 18 }]
      })

      const segment2 = userSegmentService.createSegment('b', 'B', {
        operator: 'AND',
        conditions: [{ field: 'age', operator: ComparisonOperator.LessThan, value: 30 }]
      })

      const hasOverlap = userSegmentService.canOverlap(segment1, segment2)
      expect(hasOverlap).toBe(true)
    })
  })
})
