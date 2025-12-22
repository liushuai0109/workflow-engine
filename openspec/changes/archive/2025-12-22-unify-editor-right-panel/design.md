# 设计文档: 统一编辑器右侧面板

## 架构概览

将当前的浮动面板架构改为统一的右侧 Tab 面板架构：

```
Before:
┌─────────────────────────────────────┐
│         Toolbar                     │
├───────────────┬─────────────────────┤
│               │  Properties Panel   │
│  BPMN Editor  │  (Fixed Right)      │
│               │                     │
│  ┌──────────┐│                     │
│  │ Mock     ││                     │
│  │ (Float)  ││                     │
│  └──────────┘│                     │
│     ┌──────────┐                   │
│     │ Debug    │                   │
│     │ (Float)  │                   │
│     └──────────┘                   │
└───────────────┴─────────────────────┘

After:
┌─────────────────────────────────────┐
│         Toolbar                     │
├───────────────┬─────────────────────┤
│               │  ┌─┬─┬─┬─┐         │
│               │  │P│M│D│I│ (Tabs)  │
│               │  └─┴─┴─┴─┘         │
│               │                     │
│  BPMN Editor  │  Active Panel       │
│               │  Content            │
│               │                     │
│               │                     │
│               │                     │
└───────────────┴─────────────────────┘

P = Properties, M = Mock, D = Debug, I = Interceptor
```

## 组件设计

### 1. 新增组件: RightPanelContainer

创建统一的右侧面板容器组件。

**文件**: `client/src/components/RightPanelContainer.vue`

**职责**:
- 管理 Tab 导航栏
- 控制当前激活的 Tab
- 渲染对应的面板内容
- 提供面板的展开/收起功能

**Props**:
```typescript
interface Props {
  activeTab?: 'properties' | 'mock' | 'debug' | 'interceptor' | null
  workflowId?: string
  bpmnXml?: string
}
```

**Events**:
```typescript
interface Events {
  'tab-change': (tab: string) => void
  'mock-execution-update': (execution: MockExecution) => void
  'debug-session-update': (session: DebugSession) => void
  'interceptor-session-update': (session: InterceptSession) => void
}
```

**内部结构**:
```vue
<template>
  <div class="right-panel-container">
    <!-- Tab 导航栏 -->
    <div class="tab-nav">
      <button @click="activeTab = 'properties'" :class="{ active: activeTab === 'properties' }">
        属性
      </button>
      <button @click="activeTab = 'mock'" :class="{ active: activeTab === 'mock' }">
        Mock
      </button>
      <button @click="activeTab = 'debug'" :class="{ active: activeTab === 'debug' }">
        Debug
      </button>
      <button @click="activeTab = 'interceptor'" :class="{ active: activeTab === 'interceptor' }">
        拦截器
      </button>
    </div>

    <!-- 面板内容区 -->
    <div class="panel-content">
      <keep-alive>
        <component
          :is="currentPanelComponent"
          v-bind="currentPanelProps"
          @...="handleEvents"
        />
      </keep-alive>
    </div>
  </div>
</template>
```

### 2. 修改组件: BpmnEditorPage.vue

**主要变更**:

1. **移除浮动面板**:
   - 删除 `MockControlPanel`、`DebugControlPanel`、`InterceptorControlPanel` 的直接使用
   - 删除对应的显示状态变量 (`showMockPanel`, `showDebugPanel`, `showInterceptorPanel`)

2. **添加统一面板容器**:
   ```vue
   <RightPanelContainer
     v-if="currentDiagram"
     :active-tab="activeRightPanelTab"
     :workflow-id="getWorkflowId"
     :bpmn-xml="currentDiagram"
     @tab-change="handleRightPanelTabChange"
     @mock-execution-update="handleMockExecutionUpdate"
     @debug-session-update="handleDebugSessionUpdate"
     @interceptor-session-update="handleInterceptorSessionUpdate"
   />
   ```

3. **更新工具栏按钮行为**:
   - Mock、Debug、Interceptor 按钮不再控制浮动面板显示
   - 改为激活右侧面板的对应 Tab
   ```typescript
   const toggleMockPanel = () => {
     activeRightPanelTab.value = activeRightPanelTab.value === 'mock' ? 'properties' : 'mock'
   }
   ```

4. **移除 Properties Panel 的独立容器**:
   - 原有的 `<div class="properties-panel" id="properties-panel"></div>` 移入 `RightPanelContainer`
   - Properties Panel 作为第一个 Tab 显示

### 3. 面板组件适配

**MockControlPanel.vue**, **DebugControlPanel.vue**, **InterceptorControlPanel.vue**:

- **移除关闭按钮**: 不再需要独立的关闭按钮（通过 Tab 切换即可）
- **移除浮动样式**: 改为占满容器的布局
- **保持功能不变**: 内部逻辑和交互完全保留

可选调整:
```vue
<!-- Before: 浮动面板样式 -->
<div class="mock-control-panel" style="position: fixed; ...">
  <div class="panel-header">
    <h3>Mock 执行控制</h3>
    <button class="close-btn" @click="$emit('close')">×</button>
  </div>
  ...
</div>

<!-- After: 嵌入式面板样式 -->
<div class="mock-control-panel">
  <div class="panel-header">
    <h3>Mock 执行控制</h3>
  </div>
  ...
</div>
```

## 状态管理设计

### Tab 状态

```typescript
// BpmnEditorPage.vue
const activeRightPanelTab = ref<'properties' | 'mock' | 'debug' | 'interceptor' | null>('properties')

// 工具栏按钮交互
const toggleMockPanel = () => {
  activeRightPanelTab.value = activeRightPanelTab.value === 'mock' ? 'properties' : 'mock'
}

const toggleDebugPanel = () => {
  activeRightPanelTab.value = activeRightPanelTab.value === 'debug' ? 'properties' : 'debug'
}

const toggleInterceptorPanel = () => {
  activeRightPanelTab.value = activeRightPanelTab.value === 'interceptor' ? 'properties' : 'interceptor'
}
```

### 面板状态保持

使用 Vue 的 `<keep-alive>` 组件包裹面板内容，确保 Tab 切换时：
- 不会销毁组件实例
- 保留表单数据和执行状态
- 避免重复初始化

## Properties Panel 特殊处理

bpmn-js 的 Properties Panel 需要挂载到特定的 DOM 节点。在 Tab 系统中的处理方案：

### 方案 1: 预留挂载点（推荐）

在 `RightPanelContainer` 中为 Properties Panel 预留专用的挂载点：

```vue
<div class="panel-content">
  <!-- Properties Panel 专用挂载点 -->
  <div
    v-show="activeTab === 'properties'"
    id="properties-panel"
    class="properties-panel-mount"
  ></div>

  <!-- 其他面板使用 keep-alive -->
  <keep-alive>
    <component
      v-if="activeTab !== 'properties'"
      :is="currentPanelComponent"
      v-bind="currentPanelProps"
    />
  </keep-alive>
</div>
```

### 方案 2: 动态重新挂载

每次切换到 Properties Tab 时，重新触发 bpmn-js 的 `attachTo()` 方法：

```typescript
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'properties' && bpmnModeler) {
    const propertiesPanel = bpmnModeler.get('propertiesPanel')
    propertiesPanel.attachTo('#properties-panel')
  }
})
```

**推荐使用方案 1**，因为更简单且性能更好。

## 样式设计

### 布局规格

```scss
.right-panel-container {
  width: 400px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;

  .tab-nav {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;

    button {
      flex: 1;
      padding: 12px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #f3f4f6;
      }

      &.active {
        background: white;
        border-bottom: 2px solid #3b82f6;
        color: #3b82f6;
        font-weight: 600;
      }
    }
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
  }
}
```

### 响应式考虑

- 当前设计固定宽度 400px
- 后续可扩展支持宽度调整（拖拽分隔条）
- 移动端可考虑改为底部抽屉式面板

## 数据流

```
Toolbar Button Click
        ↓
Update activeRightPanelTab
        ↓
RightPanelContainer receives new activeTab prop
        ↓
Tab navigation highlights the active tab
        ↓
Panel content switches to corresponding component
        ↓
Panel component loads/displays (keep-alive preserves state)
```

## 兼容性考虑

### 向后兼容
- 保留所有现有的面板组件，只是改变使用方式
- 事件接口保持不变
- API 调用逻辑不受影响

### 迁移路径
1. 创建 `RightPanelContainer` 组件
2. 在 `BpmnEditorPage` 中并行保留旧面板（通过特性开关）
3. 测试验证新布局
4. 移除旧的浮动面板代码

## 性能优化

1. **懒加载**: Properties Panel 在首次切换到该 Tab 时才初始化
2. **虚拟化**: 如果日志或历史记录很长，使用虚拟滚动
3. **防抖**: Tab 切换事件添加防抖处理

## 可访问性 (a11y)

- Tab 导航支持键盘操作（方向键切换）
- 每个 Tab 有清晰的 `aria-label`
- 保持高对比度的视觉设计
- 支持屏幕阅读器

## 测试策略

### 单元测试
- `RightPanelContainer.vue`: Tab 切换逻辑
- 各面板组件嵌入到 Tab 系统后的渲染

### 集成测试
- 工具栏按钮与 Tab 激活的联动
- 面板状态在 Tab 切换时的保持

### E2E 测试
- 完整的用户交互流程
- Properties Panel 在 Tab 系统中的正常工作
- Mock/Debug/Interceptor 功能在新布局下的完整性
