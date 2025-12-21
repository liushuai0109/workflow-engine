## ADDED Requirements

### Requirement: BoundaryEvent 创建操作

系统 SHALL 提供前端编辑器操作用于创建 BoundaryEvent 并附加到节点上。

#### Scenario: createBoundaryEvent 方法

- **WHEN** 调用 `editorOperationService.createBoundaryEvent(config)`
- **THEN** 系统应当验证 `attachedToRef` 指向的节点存在
- **AND** 如果节点不存在，应当抛出错误："找不到附加节点: {nodeId}"
- **AND** 系统应当使用 `bpmnFactory.create('bpmn:BoundaryEvent')` 创建 business object
- **AND** business object 的 `attachedToRef` 应当是节点的 businessObject 引用（不是 ID 字符串）
- **AND** 系统应当调用 `modeling.createShape` 添加到画布，options 包含 `{ attach: true }`

#### Scenario: 位置计算辅助方法

- **WHEN** 调用 `calculateBoundaryPosition(element, position)`
- **THEN** 系统应当动态获取节点的实际尺寸（`element.width`, `element.height`）
- **AND** 系统应当计算节点中心坐标
- **AND** 系统应当根据 position 参数返回对应的边缘坐标
- **AND** 如果 position 未指定，应当默认使用 'bottom'

#### Scenario: bpmn-js 集成

- **WHEN** 创建 BoundaryEvent
- **THEN** bpmn-js 应当自动渲染边界事件在节点边缘
- **AND** bpmn-js 应当维护 `attachedToRef` 引用关系
- **AND** 用户应当能够拖拽调整边界事件位置（bpmn-js 默认功能）
- **AND** 删除附加节点时，边界事件应当自动删除（bpmn-js 默认行为）

## ADDED Requirements

### Requirement: BPMN 结构验证

系统 SHALL 在保存 BPMN 前验证 UserTask 约束，阻止保存不符合规范的流程图。

#### Scenario: validateUserTaskConstraints 函数

- **WHEN** 调用 `validateUserTaskConstraints(modeler)`
- **THEN** 函数应当返回 `{ valid: boolean, errors: string[] }`
- **AND** 函数应当遍历所有 UserTask 节点
- **AND** 函数应当检查每个 UserTask 的 outgoing 连线
- **AND** 如果发现直接 outgoing，应当添加错误消息到 `errors` 数组
- **AND** 如果 UserTask 有 outgoing 但没有 BoundaryEvent，应当添加错误消息

#### Scenario: 保存流程集成

- **WHEN** 用户点击保存按钮
- **THEN** 系统应当先调用 `validateUserTaskConstraints`
- **AND** 如果 `valid` 为 false，应当阻止保存
- **AND** 应当显示 alert 对话框，包含所有错误消息
- **AND** 应当更新状态栏显示第一条错误消息
- **AND** 如果 `valid` 为 true，应当继续执行保存逻辑

#### Scenario: 错误消息格式

- **WHEN** 验证失败
- **THEN** 错误消息应当包含：UserTask 名称或 ID
- **AND** 错误消息应当清晰说明问题
- **AND** 错误消息应当提供修复建议（"需要添加 BoundaryEvent"）
- **AND** 错误消息示例："UserTask \"审批\" has direct outgoing flow. All outgoing flows must originate from BoundaryEvent."

#### Scenario: 用户体验

- **WHEN** 验证失败阻止保存
- **THEN** 用户应当收到即时反馈（<1 秒）
- **AND** 错误消息应当可读且易于理解
- **AND** 用户应当能够根据错误消息定位问题节点
- **AND** 系统应当保持编辑器状态，允许用户修复问题后重新保存

## ADDED Requirements

### Requirement: BoundaryEvent 工具处理器

系统 SHALL 在 claudeEditorBridge 中注册 createBoundaryEvent 工具处理器。

#### Scenario: 工具注册

- **WHEN** 初始化 claudeEditorBridge
- **THEN** 应当为 `createBoundaryEvent` 工具注册处理器函数
- **AND** 处理器应当调用 `editorOperationService.createBoundaryEvent(config)`
- **AND** 处理器应当捕获错误并返回友好的错误消息
- **AND** 成功时应当返回创建的边界事件信息

#### Scenario: 参数转换

- **WHEN** 处理器接收 LLM 传递的参数
- **THEN** 应当验证必填参数：`id`, `attachedToRef`
- **AND** 应当设置默认值：`position` 默认为 'bottom'
- **AND** 应当传递所有参数到 `createBoundaryEvent` 方法
- **AND** 如果缺少必填参数，应当返回清晰的错误消息

## ADDED Requirements

### Requirement: 性能优化

系统 SHALL 确保 BoundaryEvent 创建和验证操作的性能符合用户体验标准。

#### Scenario: 创建性能

- **WHEN** 创建单个 BoundaryEvent
- **THEN** 操作应当在 100ms 内完成
- **AND** 不应当阻塞 UI 线程

#### Scenario: 验证性能

- **WHEN** 验证包含 50 个 UserTask 的 BPMN
- **THEN** 验证时间应当小于 200ms
- **AND** 应当使用 Map 数据结构缓存 BoundaryEvent 索引（O(1) 查找）
- **AND** 应当早期退出（发现第一个错误时可选择继续或停止）
