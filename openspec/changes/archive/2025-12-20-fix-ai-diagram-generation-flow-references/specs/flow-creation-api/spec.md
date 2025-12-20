# Spec: 连线创建 API 修复

## MODIFIED Requirements

### Requirement: AI 生成的连线必须包含完整的 BPMN 引用

AI 助手通过 `editorOperationService.createFlow()` 创建的 SequenceFlow **MUST** 在源节点和目标节点的 businessObject 中正确维护 `incoming` 和 `outgoing` 引用列表，确保生成的 BPMN XML 符合 BPMN 2.0 规范。

**ID**: `flow-creation-refs-01`
**Priority**: High
**Type**: Bug Fix

#### Scenario: AI 生成包含 ExclusiveGateway 的流程图

**Given**：
- BPMN 编辑器已初始化
- 存在一个 ExclusiveGateway 节点 `Gateway_1`
- 存在两个目标任务节点 `Task_Approved` 和 `Task_Rejected`

**When**：
- AI 调用 `createFlow({ id: 'Flow_Approve', sourceId: 'Gateway_1', targetId: 'Task_Approved', name: '批准', condition: '${approved == true}' })`
- AI 调用 `createFlow({ id: 'Flow_Reject', sourceId: 'Gateway_1', targetId: 'Task_Rejected', name: '拒绝', condition: '${approved == false}' })`

**Then**：
- `Gateway_1` 的 `businessObject.outgoing` 数组包含 `Flow_Approve` 和 `Flow_Reject` 的 businessObject
- `Task_Approved` 的 `businessObject.incoming` 数组包含 `Flow_Approve` 的 businessObject
- `Task_Rejected` 的 `businessObject.incoming` 数组包含 `Flow_Reject` 的 businessObject
- 导出的 BPMN XML 包含：
  ```xml
  <bpmn:exclusiveGateway id="Gateway_1">
    <bpmn:incoming>Flow_In</bpmn:incoming>
    <bpmn:outgoing>Flow_Approve</bpmn:outgoing>
    <bpmn:outgoing>Flow_Reject</bpmn:outgoing>
  </bpmn:exclusiveGateway>
  <bpmn:task id="Task_Approved">
    <bpmn:incoming>Flow_Approve</bpmn:incoming>
  </bpmn:task>
  <bpmn:task id="Task_Rejected">
    <bpmn:incoming>Flow_Reject</bpmn:incoming>
  </bpmn:task>
  ```

#### Scenario: 选中网关后属性面板显示条件配置

**Given**：
- AI 已生成包含 ExclusiveGateway 和多条出口连线的流程图
- 连线的 `incoming/outgoing` 引用完整

**When**：
- 用户在编辑器中选中 ExclusiveGateway

**Then**：
- 属性面板显示 "Gateway Conditions" 组
- 组内列出所有出口连线
- 每条连线显示以下可编辑字段：
  - Condition Name（条件名称）
  - Condition Expression（条件表达式）
  - Priority（优先级）

#### Scenario: 保存和重新加载后引用保持完整

**Given**：
- AI 生成的 BPMN 图表已保存到文件或 localStorage

**When**：
- 用户重新加载应用
- 系统加载保存的 BPMN XML

**Then**：
- 所有节点的 `incoming` 和 `outgoing` 引用与保存前一致
- 属性面板功能正常
- XML 结构符合 BPMN 2.0 规范

---

### Requirement: 使用 bpmn-js 推荐的连线创建模式

`editorOperationService.createFlow()` 方法 **MUST** 遵循 bpmn-js 官方推荐的模式：先创建连接让框架管理 businessObject，然后通过 modeling API 更新属性。

**ID**: `flow-creation-api-01`
**Priority**: High
**Type**: Bug Fix

#### Scenario: 创建简单连线

**Given**：
- BPMN 编辑器已初始化
- 存在源节点 `Task_1` 和目标节点 `Task_2`

**When**：
- 调用 `createFlow({ id: 'Flow_1', sourceId: 'Task_1', targetId: 'Task_2', name: '流转' })`

**Then**：
- 方法首先调用 `modeling.createConnection(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' }, parent)`
- **不** 传入手动创建的 businessObject
- 然后调用 `modeling.updateProperties(connection, { name: '流转' })`
- 返回的连接对象包含 bpmn-js 自动创建的 businessObject
- businessObject 已正确关联到源节点和目标节点

#### Scenario: 创建带条件表达式的连线

**Given**：
- BPMN 编辑器已初始化
- 存在网关节点 `Gateway_1` 和目标节点 `Task_1`

**When**：
- 调用 `createFlow({ id: 'Flow_Pass', sourceId: 'Gateway_1', targetId: 'Task_1', condition: '${score >= 60}' })`

**Then**：
- 方法创建连接后，使用 `bpmnFactory.create('bpmn:FormalExpression', { body: '${score >= 60}' })` 创建条件表达式
- 调用 `modeling.updateModdleProperties(connection, connection.businessObject, { conditionExpression })` 设置条件
- 连接的 `businessObject.conditionExpression.body` 值为 `'${score >= 60}'`
- 条件表达式正确序列化到 XML

#### Scenario: 创建带自定义路径的连线

**Given**：
- BPMN 编辑器已初始化
- 存在源节点和目标节点
- 提供自定义路径点避免节点遮挡

**When**：
- 调用 `createFlow({ id: 'Flow_1', sourceId: 'Task_1', targetId: 'Task_2', waypoints: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 200}] })`

**Then**：
- 方法首先创建连接
- 验证并修正 waypoints 以确保起点和终点在节点边缘
- 调用 `modeling.updateWaypoints(connection, validatedWaypoints)` 更新路径
- 连线按照自定义路径显示

---

## REMOVED Requirements

无移除的需求。现有的连线创建功能全部保留，仅修改内部实现方式以符合 bpmn-js 最佳实践。

---

## 相关规范

- **BPMN 2.0 规范**：所有节点必须维护 incoming 和 outgoing 引用
- **bpmn-js 文档**：推荐使用 modeling API 创建和更新元素

## 验收标准

1. ✅ 所有 AI 生成的连线都正确更新 incoming/outgoing 引用
2. ✅ 导出的 BPMN XML 包含完整的 `<bpmn:incoming>` 和 `<bpmn:outgoing>` 元素
3. ✅ ExclusiveGateway 属性面板正确显示条件表达式配置
4. ✅ 保存和重新加载后数据完整性不变
5. ✅ 所有现有功能（手动编辑、条件表达式、自定义路径）正常工作
6. ✅ 单元测试和集成测试通过
