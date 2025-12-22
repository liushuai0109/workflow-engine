## ADDED Requirements

### Requirement: BoundaryEvent 工具支持

系统 SHALL 提供 `createBoundaryEvent` 工具，使 LLM 能够创建边界事件并附加到节点（通常是 UserTask）上。

#### Scenario: 创建边界事件

- **WHEN** LLM 调用 `createBoundaryEvent` 工具
- **THEN** 系统应当在指定节点边缘创建边界事件
- **AND** 边界事件应当通过 `attachedToRef` 属性关联到目标节点
- **AND** 边界事件应当支持配置 `cancelActivity`（中断型 vs 非中断型）
- **AND** 边界事件应当支持 4 个位置选项：top、bottom（默认）、left、right

#### Scenario: 工具参数验证

- **WHEN** LLM 提供的 `attachedToRef` 指向不存在的节点
- **THEN** 系统应当返回错误："找不到附加节点: {nodeId}"
- **AND** 错误应当封装在 `tool_result` 的 `is_error` 字段
- **AND** LLM 应当能够根据错误消息修正参数

#### Scenario: 位置计算

- **WHEN** 创建边界事件时指定 `position` 参数
- **THEN** 系统应当根据附加节点的实际尺寸计算位置
- **AND** bottom 位置应当在节点底部中心：`{ x: centerX, y: bottom }`
- **AND** top 位置应当在节点顶部中心：`{ x: centerX, y: top }`
- **AND** left 位置应当在节点左侧中心：`{ x: left, y: centerY }`
- **AND** right 位置应当在节点右侧中心：`{ x: right, y: centerY }`

## MODIFIED Requirements

### Requirement: 系统提示词

系统 SHALL 在系统提示词中告知 LLM BPMN 约束规则和最佳实践。

（原有系统提示词内容保持不变）

#### Scenario: UserTask 约束规则说明

- **WHEN** LLM 接收系统提示词
- **THEN** 提示词应当明确说明：UserTask 的所有 outgoing 连线必须从 BoundaryEvent 出发
- **AND** 提示词应当提供正确示例（使用 ✅ 标记）
- **AND** 提示词应当提供错误示例（使用 ❌ 标记）
- **AND** 提示词应当解释 cancelActivity 参数的含义
- **AND** 提示词应当在多处重复该约束（重要原则、工具描述、示例）

#### Scenario: 示例驱动学习

- **WHEN** 系统提示词包含示例代码
- **THEN** 示例应当演示完整的创建流程：UserTask → BoundaryEvent → Flow
- **AND** 示例应当包含至少两个 BoundaryEvent（如"通过"和"拒绝"）
- **AND** 示例应当标注关键点（如"从 BoundaryEvent 而不是 UserTask"）
- **AND** 错误示例应当明确标记为"❌ 错误示例"

## ADDED Requirements

### Requirement: LLM 工具注册

系统 SHALL 在工具列表中注册 `createBoundaryEvent` 工具，使其对 LLM 可见。

#### Scenario: 工具列表更新

- **WHEN** 系统初始化 LLM 工具
- **THEN** `availableTools` 数组应当包含 `createBoundaryEventTool`
- **AND** 工具顺序应当符合逻辑（createNode → createBoundaryEvent → createFlow）
- **AND** 工具定义应当符合 Claude Tool Use 规范
