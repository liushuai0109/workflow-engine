# Node Highlighting Debug Guide

## 问题描述
点击"开始执行"按钮后，返回的 `current_node_ids` 对应的节点应该边框加粗变绿，但目前没有高亮效果。

## 实现的功能

### 1. 事件链路
```
MockControlPanel (emit 'highlightNodes')
  ↓
RightPanelContainer (forward 'highlight-nodes')
  ↓
BpmnEditorPage (handle 'highlight-nodes')
  ↓
visualizationService.highlightNodes()
```

### 2. 样式定义
在 `/client/src/style.css` 中定义了节点状态样式：

```css
:deep(.node-status-completed) {
  stroke: #52c41a !important;        /* 绿色边框 */
  stroke-width: 3px !important;      /* 加粗 3px */
  filter: drop-shadow(0 0 4px rgba(82, 196, 26, 0.6)); /* 绿色发光 */
}
```

## 调试信息

### 测试步骤
1. 打开 BPMN 编辑器
2. 加载一个 BPMN 文件（例如 sample-servicetask.bpmn）
3. 点击 Mock Tab
4. 点击"开始执行"按钮
5. 打开浏览器控制台查看日志

### 预期的控制台日志输出

#### 1. MockControlPanel 发送事件
```
MockControlPanel: About to emit highlightNodes event with: ["ServiceTask_1"]
```
或者如果没有节点：
```
MockControlPanel: No currentNodeIds to highlight: []
```

#### 2. RightPanelContainer 转发事件
```
RightPanelContainer: Forwarding highlightNodes event with: ["ServiceTask_1"]
```

#### 3. BpmnEditorPage 接收事件
```
=== handleHighlightNodes called ===
Node IDs to highlight: ["ServiceTask_1"]
bpmnEditor.value exists: true
Modeler exists: true
Total elements in registry: 5
All element IDs: ["StartEvent_1", "ServiceTask_1", "EndEvent_1", "Flow_1", "Flow_2"]
```

#### 4. visualizationService 高亮节点
```
Attempting to highlight node: ServiceTask_1
All elements in registry: ["StartEvent_1", "ServiceTask_1", "EndEvent_1", "Flow_1", "Flow_2"]
Found element: {id: "ServiceTask_1", type: "bpmn:ServiceTask", ...}
Successfully added marker node-status-completed to node ServiceTask_1
```

### 可能的问题场景

#### 场景 1: 节点 ID 不匹配
如果日志显示：
```
Node ServiceTask_1 not found in element registry
```

**原因**: 后端返回的节点 ID 与 BPMN 元素 ID 不一致

**解决**: 检查后端返回的 currentNodeIds 格式，确保与 BPMN XML 中的节点 ID 一致

#### 场景 2: 时序问题
如果日志显示：
```
bpmnEditor.value not available in handleHighlightNodes
```
或
```
Modeler not available in handleHighlightNodes
```

**原因**: 调用高亮时编辑器还未初始化完成

**解决**: 可能需要添加延时或等待编辑器就绪的逻辑

#### 场景 3: CSS 样式未生效
如果日志显示 "Successfully added marker" 但视觉上没有变化：

**原因**: CSS 样式被其他样式覆盖或 :deep() 选择器未生效

**解决**:
1. 检查浏览器开发者工具的 Elements 面板
2. 查看节点元素是否有 `node-status-completed` 类
3. 检查 CSS 样式是否被应用

## 文件修改清单

### 1. MockControlPanel.vue
- **修改内容**: 添加详细的 console.log，包括发送事件前和无节点时的警告
- **位置**: Line 424-430

### 2. RightPanelContainer.vue
- **修改内容**: 添加事件转发日志
- **位置**: Line 158-161

### 3. BpmnEditorPage.vue
- **修改内容**:
  - 添加详细的调试日志
  - 输出所有元素 ID 用于对比
  - 添加 modeler 和 bpmnEditor 存在性检查
- **位置**: Line 654-683

### 4. visualizationService.ts
- **修改内容**:
  - 添加详细的节点查找日志
  - 实现 fallback 查找逻辑（检查 element.id, businessObject.id, $attrs.id）
  - 添加成功/失败日志
- **位置**: Line 32-76

### 5. style.css
- **修改内容**:
  - 将 node-status-running 和 node-status-completed 的颜色改为绿色
  - 边框宽度设为 3px
  - 添加绿色发光效果
- **位置**: Line 18-28

## BPMN 元素 ID 格式

根据 sample-servicetask.bpmn 分析：

```xml
<bpmn:startEvent id="StartEvent_1">
<bpmn:serviceTask id="ServiceTask_1" name="XFlow Service Task">
<bpmn:endEvent id="EndEvent_1">
<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ServiceTask_1" />
```

- 节点 ID 格式: `StartEvent_1`, `ServiceTask_1`, `EndEvent_1`
- 连线 ID 格式: `Flow_1`, `Flow_2`

**重要**: 后端返回的 `currentNodeIds` 必须使用这些 ID 格式，而不是 BPMNShape 的 ID（如 `_BPMNShape_StartEvent_2`）

## 下一步排查

1. **运行测试**: 启动前端应用，执行上述测试步骤
2. **检查日志**: 查看控制台输出，对比预期日志
3. **定位问题**: 根据日志输出确定问题出现在哪个环节：
   - 事件未发送？
   - 事件未传递？
   - 节点未找到？
   - 样式未应用？
4. **报告结果**: 将控制台日志完整复制，以便进一步分析

## 验证清单

- [ ] 控制台显示 "MockControlPanel: About to emit highlightNodes event"
- [ ] 控制台显示 "RightPanelContainer: Forwarding highlightNodes event"
- [ ] 控制台显示 "=== handleHighlightNodes called ==="
- [ ] 控制台显示 "All element IDs" 列表
- [ ] 控制台显示 "Successfully added marker node-status-completed"
- [ ] 浏览器中节点边框变为绿色粗边框
- [ ] 节点有绿色发光效果
