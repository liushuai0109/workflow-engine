# 工作流编辑器规范（变更）

## MODIFIED Requirements

### Requirement: 工作流 Mock 执行

工作流编辑器 SHALL 支持模拟工作流执行，用于测试和验证流程逻辑，无需连接真实外部服务。

#### Scenario: 启动 Mock 执行（选择执行接口）

- **WHEN** 操作员在编辑器中点击"Mock 执行"按钮
- **THEN** 系统显示 Mock 执行配置面板
- **AND** 面板应包含：
  - 执行接口选择器（下拉菜单），当前选项：
    - `POST /api/execute/:workflowInstanceId`（执行工作流）
  - 参数输入区域：
    - `workflowInstanceId`: 可选，文本输入框（如果为空，系统自动创建 Mock 实例）
    - `fromNodeId`: 必填，文本输入框或节点选择器
    - `businessParams`: 可选，JSON 编辑器
  - Mock 数据配置区域：
    - 节点级别的 Mock 响应配置
    - 执行延迟配置
    - 失败场景配置
- **AND** 操作员可以点击"开始执行"按钮启动 Mock 执行

#### Scenario: Mock 执行可视化（关联流程图）

- **WHEN** Mock 执行进行中
- **THEN** 系统应在流程图上高亮显示当前执行节点（基于 `currentNodeIds`）
- **AND** 已执行的节点应显示完成状态标记
- **AND** 执行路径的连线应高亮显示
- **AND** Mock 执行控制面板应显示：
  - 当前执行节点 ID 列表
  - 当前执行状态
  - 工作流变量值
  - 执行历史记录

#### Scenario: 继续 Mock 执行（下一步）

- **WHEN** Mock 执行暂停或等待下一步时
- **THEN** 系统应显示"下一步"按钮
- **AND** 点击"下一步"按钮时，系统应显示参数输入对话框：
  - `businessParams`: 可选，JSON 编辑器（当前步骤的业务参数）
  - `nodeMockData`: 可选，节点 Mock 数据配置
- **AND** 操作员可以输入参数后点击"执行下一步"
- **AND** 系统应发送 `POST /api/workflows/mock/executions/:executionId/step` 请求
- **AND** 执行后，系统应更新流程图显示和 Mock 执行状态

#### Scenario: 查看 Mock 实例状态

- **WHEN** Mock 执行进行中
- **THEN** 系统应显示关联的 Mock 工作流实例信息
- **AND** 实例信息应包括：
  - 实例 ID
  - 实例状态
  - 当前节点 ID 列表
  - 工作流变量
  - 实例版本号
- **AND** 操作员可以点击"查看实例详情"查看完整的实例数据

## ADDED Requirements

### Requirement: Mock 执行接口选择

工作流编辑器 SHALL 支持选择要模拟的执行接口。

#### Scenario: 选择执行接口

- **WHEN** 操作员启动 Mock 执行
- **THEN** 系统应提供执行接口选择器
- **AND** 当前支持的接口：
  - `POST /api/execute/:workflowInstanceId`（执行工作流）
- **AND** 选择接口后，系统应显示该接口所需的参数输入字段
- **AND** 参数输入字段应根据接口定义动态生成

#### Scenario: Mock 实例管理

- **WHEN** 操作员启动 Mock 执行时未提供 `workflowInstanceId`
- **THEN** 系统应自动创建 Mock 工作流实例
- **AND** 创建的实例应显示在 Mock 执行控制面板中
- **AND** 操作员可以查看和管理 Mock 实例的状态

