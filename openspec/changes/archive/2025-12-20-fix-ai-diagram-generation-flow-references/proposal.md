# Proposal: 修复 AI 图表生成中的连线引用问题

## 问题陈述

当使用 AI 助手功能通过提示词生成 BPMN 流程图时，虽然视觉上网关（Gateway）节点有出口连线（SequenceFlow），但在实际数据结构层面，这些连线没有正确关联到节点的 `incoming/outgoing` 引用列表中。这导致：

1. **保存的 BPMN XML 不完整**：缺少必需的 `<bpmn:incoming>` 和 `<bpmn:outgoing>` 子元素
2. **属性面板功能失效**：选中 ExclusiveGateway 时无法显示条件表达式配置界面
3. **数据完整性问题**：虽然视觉连接正常，但 businessObject 的 `outgoing` 数组为空

用户需要手动删除并重新连接这些连线才能修复问题，这严重影响了 AI 生成图表的可用性。

## 根本原因

通过代码分析发现，问题出在 `editorOperationService.ts` 的 `createFlow()` 方法中：

```typescript
// 当前实现（有问题）
const businessObject = bpmnFactory.create('bpmn:SequenceFlow', {
  id,
  name: name || '',
  sourceRef: sourceElement.businessObject,
  targetRef: targetElement.businessObject
})

const connection = this.modeling.createConnection(
  sourceElement,
  targetElement,
  {
    type: 'bpmn:SequenceFlow',
    businessObject  // ❌ 传入手动创建的 businessObject
  },
  sourceElement.parent
)
```

**关键问题**：
- 当手动创建 `businessObject` 并传入 `modeling.createConnection()` 时，bpmn-js 不会自动更新源节点和目标节点的 `incoming/outgoing` 引用
- 这些引用是 BPMN 2.0 规范要求的，用于维护节点间的连接关系
- bpmn-js 的 `modeling` 模块期望自己创建 businessObject，以便正确管理这些引用

## 解决方案

修改 `createFlow()` 方法，改为使用 bpmn-js 推荐的两步骤方法：

1. **先创建连接**：让 bpmn-js 自动创建和管理 businessObject
2. **后更新属性**：使用 `modeling.updateProperties()` 设置名称和条件表达式

这样可以确保 bpmn-js 正确维护所有内部引用和 XML 结构。

## 影响范围

**直接影响**：
- `client/src/services/editorOperationService.ts` - 核心修改
- 所有使用 AI 生成 BPMN 图表的功能

**间接影响**：
- 提升 AI 生成图表的质量和可靠性
- 改善用户体验，无需手动修复连线
- 确保生成的 BPMN XML 符合 BPMN 2.0 规范

## 成功标准

1. AI 生成的 BPMN 图表包含完整的 `<bpmn:incoming>` 和 `<bpmn:outgoing>` 元素
2. 选中 ExclusiveGateway 时，属性面板正确显示条件表达式配置界面
3. `businessObject.outgoing` 数组包含所有出口连线引用
4. 保存和重新加载后，连线引用依然完整
5. 不影响现有的手动编辑功能

## 风险评估

**低风险**：
- 修改仅影响单个服务方法
- 不改变 API 接口，向后兼容
- 使用 bpmn-js 官方推荐的最佳实践

**潜在影响**：
- 需要验证所有调用 `createFlow()` 的地方仍然正常工作
- 确保条件表达式和自定义路径点功能不受影响

## 替代方案

### 方案 A：后处理修复（已否决）
在保存 XML 前自动添加缺失的 `incoming/outgoing` 元素。

**缺点**：
- 治标不治本，根本问题仍然存在
- 需要额外的 XML 解析和修改逻辑
- 可能引入新的边缘情况

### 方案 B：使用不同的 bpmn-js API（已否决）
使用更低级的 API 手动管理引用。

**缺点**：
- 增加复杂度和维护成本
- 容易出错，难以保证与 bpmn-js 内部逻辑一致
- 违背框架最佳实践

## 时间估算

- **实现**：2-3 小时
- **测试**：1-2 小时
- **总计**：3-5 小时

## 依赖关系

- 无外部依赖
- 使用现有的 bpmn-js 17.11.1 API
