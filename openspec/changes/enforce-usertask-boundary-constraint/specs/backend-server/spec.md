## ADDED Requirements

### Requirement: UserTask 约束验证

系统 SHALL 在解析 BPMN XML 时验证 UserTask 的 outgoing 连线约束，确保所有 outgoing 连线都从 BoundaryEvent 出发。

#### Scenario: 验证直接 outgoing

- **WHEN** UserTask 包含直接的 outgoing 连线（sourceRef 是 UserTask 本身）
- **THEN** `ParseBPMN` 函数应当返回错误
- **AND** 错误消息应当包含：UserTask ID、Flow ID、约束说明
- **AND** 错误格式应当为："UserTask {id} has direct outgoing flow {flowId}. All outgoing flows from UserTask must originate from BoundaryEvent"
- **AND** HTTP 响应状态码应当为 400 Bad Request

#### Scenario: 验证 BoundaryEvent 存在

- **WHEN** UserTask 有 outgoing 连线但没有附加的 BoundaryEvent
- **THEN** `ParseBPMN` 函数应当返回错误
- **AND** 错误消息应当为："UserTask {id} has outgoing flows but no BoundaryEvent attached"
- **AND** HTTP 响应状态码应当为 400 Bad Request

#### Scenario: BoundaryEvent 附加验证

- **WHEN** BoundaryEvent 缺少 `attachedToRef` 属性
- **THEN** `ParseBPMN` 函数应当返回错误
- **AND** 错误消息应当为："BoundaryEvent {id} missing attachedToRef"

#### Scenario: 验证通过

- **WHEN** 所有 UserTask 的 outgoing 连线都来自 BoundaryEvent
- **THEN** `ParseBPMN` 函数应当成功返回 WorkflowDefinition
- **AND** 不应当有任何警告或错误

#### Scenario: 验证性能

- **WHEN** BPMN 包含 100+ 节点
- **THEN** 验证时间应当小于 100ms
- **AND** 验证应当使用 O(n) 算法（预构建 BoundaryEvent 索引）
- **AND** 只遍历 UserTask 节点，其他类型跳过

## ADDED Requirements

### Requirement: 验证错误响应

系统 SHALL 为 BPMN 验证错误提供标准化的错误响应格式。

#### Scenario: 错误码定义

- **WHEN** UserTask 约束验证失败
- **THEN** 错误响应应当包含标准化错误码
- **AND** 错误码应当为："INVALID_USERTASK_CONSTRAINT"
- **AND** 错误响应格式应当符合 `models.APIError` 结构

#### Scenario: 错误消息国际化

- **WHEN** 返回验证错误消息
- **THEN** 错误消息应当使用英文（当前版本）
- **AND** 错误消息应当清晰描述问题和修复建议
- **AND** 错误消息应当包含具体的节点 ID 和 Flow ID

## MODIFIED Requirements

### Requirement: BPMN 解析流程

系统 SHALL 在 BPMN 解析过程中集成 UserTask 约束验证。

（原有 ParseBPMN 功能保持不变）

#### Scenario: 解析流程集成

- **WHEN** 执行 `ParseBPMN` 函数
- **THEN** 应当按以下顺序执行：
  1. XML 解析（`xml.Unmarshal`）
  2. 节点解析（`parseNodes`）
  3. 序列流解析（`parseSequenceFlows`）
  4. 消息解析（`parseMessages`）
  5. 构建邻接表（`buildAdjacencyLists`）
  6. **新增**：UserTask 约束验证（`validateUserTaskConstraints`）
  7. 识别开始和结束事件（`identifyStartAndEndEvents`）
- **AND** 如果任何步骤失败，应当立即返回错误
- **AND** 错误应当包含步骤信息便于调试

#### Scenario: 向后兼容性

- **WHEN** 解析旧版本 BPMN（创建于验证功能之前）
- **THEN** 如果包含直接 UserTask outgoing，应当拒绝解析
- **AND** 用户应当收到清晰的修复指导
- **AND** 未来可提供自动修复工具（当前版本不支持）
