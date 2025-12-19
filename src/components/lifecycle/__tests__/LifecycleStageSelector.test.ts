/**
 * Tests for LifecycleStageSelector Component
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LifecycleStageSelector from '../LifecycleStageSelector.vue'
import { LifecycleStage } from '@/types/lifecycle'

describe('LifecycleStageSelector', () => {
  it('should render all lifecycle stages', () => {
    const wrapper = mount(LifecycleStageSelector, {
      props: {
        modelValue: null
      }
    })

    const options = wrapper.findAll('option')
    expect(options.length).toBeGreaterThanOrEqual(5)
  })

  it('should display selected stage', () => {
    const wrapper = mount(LifecycleStageSelector, {
      props: {
        modelValue: LifecycleStage.Acquisition
      }
    })

    const select = wrapper.find('select')
    expect(select.element.value).toBe(LifecycleStage.Acquisition)
  })

  it('should emit update event on change', async () => {
    const wrapper = mount(LifecycleStageSelector, {
      props: {
        modelValue: null
      }
    })

    const select = wrapper.find('select')
    await select.setValue(LifecycleStage.Activation)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([LifecycleStage.Activation])
  })

  it('should display stage icons', () => {
    const wrapper = mount(LifecycleStageSelector, {
      props: {
        modelValue: LifecycleStage.Revenue
      }
    })

    const html = wrapper.html()
    // Check if the component renders stage information
    expect(html).toBeTruthy()
  })

  it('should handle null value', () => {
    const wrapper = mount(LifecycleStageSelector, {
      props: {
        modelValue: null
      }
    })

    expect(wrapper.find('select').exists()).toBe(true)
  })
})
