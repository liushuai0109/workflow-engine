## ADDED Requirements

### Requirement: BPMN XML 解析功能

系统 SHALL 提供将 BPMN XML 内容解析为 `WorkflowDefinition` 结构体的功能。

#### Scenario: 解析标准 BPMN XML

- **当** 调用 `parseBPMN` 方法并传入有效的 BPMN 2.0 XML 字符串时
- **则** 方法应返回 `*WorkflowDefinition` 结构体
- **并且** 结构体应包含以下信息：
  - `Nodes` 映射：包含所有解析的节点（开始事件、结束事件、任务、网关等）
  - `SequenceFlows` 映射：包含所有序列流及其属性
  - `Messages` 映射：包含所有消息定义（如果存在）
  - `StartEvents` 数组：所有开始事件的节点 ID
  - `EndEvents` 数组：所有结束事件的节点 ID
  - `AdjacencyList` 映射：全局邻接表，用于图遍历
  - `ReverseAdjacencyList` 映射：反向邻接表

#### Scenario: 解析节点信息

- **当** BPMN XML 包含节点元素（如 `<bpmn:startEvent>`, `<bpmn:userTask>` 等）时
- **则** 每个节点应被解析为 `Node` 结构体
- **并且** 节点应包含以下字段：
  - `ID`：节点的唯一标识符
  - `Name`：节点名称
  - `Type`：节点类型（枚举值）
  - `ParentID`：父节点 ID（如果存在）
  - `IncomingSequenceFlowIDs`：输入序列流 ID 列表
  - `OutgoingSequenceFlowIDs`：输出序列流 ID 列表
- **并且** 所有节点应存储在 `WorkflowDefinition.Nodes` 映射中，键为节点 ID

#### Scenario: 解析序列流信息

- **当** BPMN XML 包含序列流元素（`<bpmn:sequenceFlow>`）时
- **则** 每个序列流应被解析为 `SequenceFlow` 结构体
- **并且** 序列流应包含以下字段：
  - `ID`：序列流的唯一标识符
  - `Name`：序列流名称（连接名）
  - `SourceNodeID`：源节点 ID
  - `TargetNodeID`：目标节点 ID
  - `ConditionExpression`：条件表达式（如果存在）
  - `Priority`：优先级（如果存在）
- **并且** 所有序列流应存储在 `WorkflowDefinition.SequenceFlows` 映射中，键为序列流 ID

#### Scenario: 构建邻接表

- **当** 解析完所有节点和序列流后
- **则** 系统应构建全局邻接表 `AdjacencyList`
- **并且** 邻接表的键为源节点 ID，值为目标节点 ID 列表
- **并且** 系统应构建反向邻接表 `ReverseAdjacencyList`
- **并且** 反向邻接表的键为目标节点 ID，值为源节点 ID 列表
- **并且** 邻接表应包含所有通过序列流连接的节点关系

#### Scenario: 识别开始和结束事件

- **当** BPMN XML 包含开始事件（`<bpmn:startEvent>`）时
- **则** 所有开始事件的节点 ID 应添加到 `StartEvents` 数组中
- **当** BPMN XML 包含结束事件（`<bpmn:endEvent>`）时
- **则** 所有结束事件的节点 ID 应添加到 `EndEvents` 数组中

#### Scenario: 解析消息元素

- **当** BPMN XML 包含消息定义（`<bpmn:message>`）时
- **则** 每个消息应被解析为 `Message` 结构体
- **并且** 消息应包含 `ID` 和 `Name` 字段
- **并且** 所有消息应存储在 `WorkflowDefinition.Messages` 映射中，键为消息 ID

#### Scenario: 处理无效 XML

- **当** 传入的 BPMN 内容不是有效的 XML 格式时
- **则** 方法应返回错误，错误信息应明确指出 XML 格式问题

#### Scenario: 处理缺失必需元素

- **当** BPMN XML 缺少 `<bpmn:process>` 元素时
- **则** 方法应返回错误，错误信息应明确指出缺少必需元素

#### Scenario: 使用示例文件验证

- **当** 使用 `examples/user-onboarding-with-lifecycle.bpmn` 文件内容作为输入时
- **则** 解析应成功完成
- **并且** 解析结果应包含该文件中定义的所有节点、序列流和消息
- **并且** 邻接表应正确反映流程的连接关系

