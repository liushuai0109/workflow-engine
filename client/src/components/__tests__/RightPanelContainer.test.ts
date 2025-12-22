import { describe, it, expect, beforeEach } from '@jest/globals'
import { mount, VueWrapper } from '@vue/test-utils'
import RightPanelContainer from '../RightPanelContainer.vue'
import { nextTick } from 'vue'

// Mock子组件
jest.mock('../ChatBox.vue', () => ({
  name: 'ChatBox',
  template: '<div class="chat-box-container"></div>'
}))

jest.mock('../MockControlPanel.vue', () => ({
  name: 'MockControlPanel',
  template: '<div class="mock-control-panel"></div>'
}))

jest.mock('../DebugControlPanel.vue', () => ({
  name: 'DebugControlPanel',
  template: '<div class="debug-control-panel"></div>'
}))

jest.mock('../InterceptorControlPanel.vue', () => ({
  name: 'InterceptorControlPanel',
  template: '<div class="interceptor-control-panel"></div>'
}))

describe('RightPanelContainer', () => {
  let wrapper: VueWrapper

  const defaultProps = {
    activeTab: 'properties',
    workflowId: 'test-workflow-123',
    bpmnXml: '<definitions></definitions>',
    configId: 'test-config-456'
  }

  beforeEach(() => {
    wrapper = mount(RightPanelContainer, {
      props: defaultProps,
      global: {
        stubs: {
          'a-tabs': {
            template: '<div class="ant-tabs"><slot /></div>',
            props: ['activeKey', 'animated'],
            emits: ['change']
          },
          'a-tab-pane': {
            template: '<div class="ant-tabs-tabpane"><slot /><slot name="tab" /></div>',
            props: ['key', 'forceRender']
          },
          'SettingOutlined': { template: '<span class="anticon">⚙</span>' },
          'RobotOutlined': { template: '<span class="anticon">🤖</span>' },
          'ThunderboltOutlined': { template: '<span class="anticon">⚡</span>' },
          'BugOutlined': { template: '<span class="anticon">🐛</span>' },
          'FilterOutlined': { template: '<span class="anticon">🔍</span>' }
        }
      }
    })
  })

  describe('组件渲染', () => {
    it('应该正确渲染右侧面板容器', () => {
      expect(wrapper.find('.right-panel-container').exists()).toBe(true)
    })

    it('应该渲染 Tab 导航', () => {
      expect(wrapper.find('.ant-tabs').exists()).toBe(true)
    })

    it('应该包含所有 5 个 Tab 面板', () => {
      const tabPanes = wrapper.findAll('.ant-tabs-tabpane')
      expect(tabPanes.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Props 传递', () => {
    it('应该接收并使用 activeTab prop', () => {
      expect(wrapper.props('activeTab')).toBe('properties')
    })

    it('应该接收并使用 workflowId prop', () => {
      expect(wrapper.props('workflowId')).toBe('test-workflow-123')
    })

    it('应该接收并使用 bpmnXml prop', () => {
      expect(wrapper.props('bpmnXml')).toBe('<definitions></definitions>')
    })

    it('应该接收并使用 configId prop', () => {
      expect(wrapper.props('configId')).toBe('test-config-456')
    })
  })

  describe('Tab 切换功能', () => {
    it('应该响应 activeTab prop 的变化', async () => {
      await wrapper.setProps({ activeTab: 'mock' })
      await nextTick()

      // 验证内部状态已更新
      expect(wrapper.vm.localActiveTab).toBe('mock')
    })

    it('应该触发 tab-change 事件', async () => {
      // 模拟 Tab 切换
      wrapper.vm.handleTabChange('debug')
      await nextTick()

      // 验证事件已触发
      expect(wrapper.emitted('tab-change')).toBeTruthy()
      expect(wrapper.emitted('tab-change')?.[0]).toEqual(['debug'])
    })

    it('应该在 Tab 切换时更新本地状态', async () => {
      wrapper.vm.handleTabChange('interceptor')
      await nextTick()

      expect(wrapper.vm.localActiveTab).toBe('interceptor')
    })
  })

  describe('键盘导航', () => {
    it('应该支持右方向键切换到下一个 Tab', async () => {
      // 当前在 properties
      wrapper.vm.localActiveTab = 'properties'

      // 模拟按下右方向键
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() })
      wrapper.vm.handleKeyDown(event)
      await nextTick()

      expect(wrapper.vm.localActiveTab).toBe('chat')
    })

    it('应该支持左方向键切换到上一个 Tab', async () => {
      // 当前在 mock
      wrapper.vm.localActiveTab = 'mock'

      // 模拟按下左方向键
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() })
      wrapper.vm.handleKeyDown(event)
      await nextTick()

      expect(wrapper.vm.localActiveTab).toBe('chat')
    })

    it('应该在最后一个 Tab 按右方向键时循环到第一个', async () => {
      // 当前在 interceptor（最后一个）
      wrapper.vm.localActiveTab = 'interceptor'

      // 模拟按下右方向键
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() })
      wrapper.vm.handleKeyDown(event)
      await nextTick()

      expect(wrapper.vm.localActiveTab).toBe('properties')
    })

    it('应该在第一个 Tab 按左方向键时循环到最后一个', async () => {
      // 当前在 properties（第一个）
      wrapper.vm.localActiveTab = 'properties'

      // 模拟按下左方向键
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() })
      wrapper.vm.handleKeyDown(event)
      await nextTick()

      expect(wrapper.vm.localActiveTab).toBe('interceptor')
    })

    it('应该在键盘导航时阻止默认行为', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      const preventDefaultSpy = jest.fn()
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy })

      wrapper.vm.handleKeyDown(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('应该忽略非方向键的按键', () => {
      const initialTab = wrapper.vm.localActiveTab

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      wrapper.vm.handleKeyDown(event)

      expect(wrapper.vm.localActiveTab).toBe(initialTab)
    })
  })

  describe('事件转发', () => {
    it('应该转发 mock-execution-update 事件', async () => {
      const mockExecution = { id: 'exec-1', status: 'running' }
      wrapper.vm.handleMockExecutionUpdate(mockExecution)
      await nextTick()

      expect(wrapper.emitted('mock-execution-update')).toBeTruthy()
      expect(wrapper.emitted('mock-execution-update')?.[0]).toEqual([mockExecution])
    })

    it('应该转发 debug-session-update 事件', async () => {
      wrapper.vm.localActiveTab = 'debug'
      const debugSession = { id: 'debug-1', status: 'paused' }
      wrapper.vm.handleSessionUpdate(debugSession)
      await nextTick()

      expect(wrapper.emitted('debug-session-update')).toBeTruthy()
      expect(wrapper.emitted('debug-session-update')?.[0]).toEqual([debugSession])
    })

    it('应该转发 interceptor-session-update 事件', async () => {
      wrapper.vm.localActiveTab = 'interceptor'
      const interceptSession = { id: 'intercept-1', status: 'active' }
      wrapper.vm.handleSessionUpdate(interceptSession)
      await nextTick()

      expect(wrapper.emitted('interceptor-session-update')).toBeTruthy()
      expect(wrapper.emitted('interceptor-session-update')?.[0]).toEqual([interceptSession])
    })

    it('应该转发 chat-message 事件', async () => {
      const message = 'Test chat message'
      wrapper.vm.handleChatMessage(message)
      await nextTick()

      expect(wrapper.emitted('chat-message')).toBeTruthy()
      expect(wrapper.emitted('chat-message')?.[0]).toEqual([message])
    })
  })

  describe('面板关闭处理', () => {
    it('应该在面板关闭时切换回 Properties Tab', async () => {
      wrapper.vm.localActiveTab = 'mock'
      wrapper.vm.handlePanelClose()
      await nextTick()

      expect(wrapper.vm.localActiveTab).toBe('properties')
    })

    it('应该在面板关闭时触发 tab-change 事件', async () => {
      wrapper.vm.localActiveTab = 'debug'
      wrapper.vm.handlePanelClose()
      await nextTick()

      const tabChangeEvents = wrapper.emitted('tab-change')
      expect(tabChangeEvents).toBeTruthy()
      const lastEvent = tabChangeEvents?.[tabChangeEvents.length - 1]
      expect(lastEvent).toEqual(['properties'])
    })
  })

  describe('当前面板 Props 计算', () => {
    it('应该为 Mock Panel 提供正确的 props', async () => {
      wrapper.vm.localActiveTab = 'mock'
      await nextTick()

      const props = wrapper.vm.currentPanelProps
      expect(props.workflowId).toBe('test-workflow-123')
      expect(props.bpmnXml).toBe('<definitions></definitions>')
      expect(props.configId).toBe('test-config-456')
    })

    it('应该为 Debug Panel 提供正确的 props', async () => {
      wrapper.vm.localActiveTab = 'debug'
      await nextTick()

      const props = wrapper.vm.currentPanelProps
      expect(props.workflowId).toBe('test-workflow-123')
      expect(props.bpmnXml).toBeUndefined()
      expect(props.configId).toBeUndefined()
    })

    it('应该为 Interceptor Panel 提供正确的 props', async () => {
      wrapper.vm.localActiveTab = 'interceptor'
      await nextTick()

      const props = wrapper.vm.currentPanelProps
      expect(props.workflowId).toBe('test-workflow-123')
      expect(props.bpmnXml).toBe('<definitions></definitions>')
      expect(props.configId).toBeUndefined()
    })
  })

  describe('Properties Panel 挂载点', () => {
    it('应该包含 properties-panel 挂载点', () => {
      expect(wrapper.find('#properties-panel').exists()).toBe(true)
    })

    it('properties-panel 挂载点应该有正确的类名', () => {
      const mountPoint = wrapper.find('#properties-panel')
      expect(mountPoint.classes()).toContain('properties-panel-mount')
    })
  })

  describe('无障碍性', () => {
    it('右侧面板容器应该有 tabindex 属性', () => {
      const container = wrapper.find('.right-panel-container')
      expect(container.attributes('tabindex')).toBe('0')
    })

    it('右侧面板容器应该监听键盘事件', () => {
      const container = wrapper.find('.right-panel-container')
      expect(container.element.onkeydown || container.attributes('onkeydown')).toBeDefined()
    })
  })
})
