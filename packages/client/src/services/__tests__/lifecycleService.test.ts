/**
 * Tests for Lifecycle Service
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { lifecycleService } from '../lifecycleService'
import { LifecycleStage } from '@/types/lifecycle'

describe('LifecycleService', () => {
  beforeEach(() => {
    // Reset service state if needed
  })

  describe('Stage Configuration', () => {
    it('should load all lifecycle stages', () => {
      const stages = lifecycleService.getAllStages()
      expect(stages).toHaveLength(5)
      expect(stages.map(s => s.stage)).toEqual([
        LifecycleStage.Acquisition,
        LifecycleStage.Activation,
        LifecycleStage.Retention,
        LifecycleStage.Revenue,
        LifecycleStage.Referral
      ])
    })

    it('should get stage by name', () => {
      const stage = lifecycleService.getStageByName(LifecycleStage.Acquisition)
      expect(stage).toBeDefined()
      expect(stage?.stage).toBe(LifecycleStage.Acquisition)
      expect(stage?.color).toBe('#2196F3')
      expect(stage?.icon).toBe('🎯')
    })

    it('should get stage color', () => {
      const color = lifecycleService.getStageColor(LifecycleStage.Activation)
      expect(color).toBe('#4CAF50')
    })

    it('should get stage icon', () => {
      const icon = lifecycleService.getStageIcon(LifecycleStage.Revenue)
      expect(icon).toBe('💰')
    })
  })

  describe('Lifecycle Metadata', () => {
    it('should create lifecycle metadata', () => {
      const metadata = lifecycleService.createMetadata(LifecycleStage.Retention)
      expect(metadata.stage).toBe(LifecycleStage.Retention)
      expect(metadata.version).toBe('1.0.0')
      expect(metadata.color).toBeDefined()
      expect(metadata.icon).toBeDefined()
    })

    it('should validate compatible version', () => {
      expect(lifecycleService.isCompatibleVersion('1.0.0')).toBe(true)
      expect(lifecycleService.isCompatibleVersion('1.5.2')).toBe(true)
      expect(lifecycleService.isCompatibleVersion('2.0.0')).toBe(false)
    })
  })

  describe('Stage Transitions', () => {
    it('should determine valid transitions', () => {
      const canTransition = lifecycleService.canTransition(
        LifecycleStage.Acquisition,
        LifecycleStage.Activation
      )
      expect(canTransition).toBe(true)
    })

    it('should reject invalid transitions', () => {
      const canTransition = lifecycleService.canTransition(
        LifecycleStage.Referral,
        LifecycleStage.Acquisition
      )
      expect(canTransition).toBe(false)
    })
  })
})
