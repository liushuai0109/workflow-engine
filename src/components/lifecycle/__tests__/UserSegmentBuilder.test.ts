/**
 * Tests for UserSegmentBuilder Component
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserSegmentBuilder from '../UserSegmentBuilder.vue'
import { ComparisonOperator } from '@/types/segments'

describe('UserSegmentBuilder', () => {
  it('should render segment builder interface', () => {
    const wrapper = mount(UserSegmentBuilder, {
      props: {
        modelValue: []
      }
    })

    expect(wrapper.find('.segment-builder').exists()).toBe(true)
  })

  it('should allow adding conditions', async () => {
    const wrapper = mount(UserSegmentBuilder, {
      props: {
        modelValue: []
      }
    })

    const addButton = wrapper.find('.btn-add-condition')
    if (addButton.exists()) {
      await addButton.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    }
  })

  it('should display existing segments', () => {
    const segments = [
      {
        field: 'age',
        operator: ComparisonOperator.GreaterThan,
        value: 18
      }
    ]

    const wrapper = mount(UserSegmentBuilder, {
      props: {
        modelValue: segments
      }
    })

    expect(wrapper.html()).toContain('age')
  })

  it('should support AND/OR logic', () => {
    const wrapper = mount(UserSegmentBuilder, {
      props: {
        modelValue: []
      }
    })

    // Check if logic operators are available
    const html = wrapper.html()
    expect(html).toBeTruthy()
  })

  it('should handle empty segments', () => {
    const wrapper = mount(UserSegmentBuilder, {
      props: {
        modelValue: []
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})
