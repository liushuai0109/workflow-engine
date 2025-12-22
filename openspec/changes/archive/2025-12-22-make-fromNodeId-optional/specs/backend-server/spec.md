## MODIFIED Requirements

### Requirement: 工作流执行引擎 API

系统 SHALL 提供工作流执行引擎接口,支持从指定节点开始执行工作流并调用业务接口。

#### Scenario: 执行工作流(从指定节点开始)

- **当** 客户端发送 `POST /api/execute/:workflowInstanceId` 请求时
- **则** 请求体应包含：
  - `fromNodeId`：可选,字符串,指定从哪个节点开始执行。如果未提供,系统将从工作流实例的 `current_node_ids` 继续执行
  - `businessParams`：可选,JSON 字符串,传递给业务接口的参数
- **并且** 系统应：
  - 验证工作流实例存在
  - 获取工作流定义(BPMN XML)并解析
  - 如果 `fromNodeId` 提供,验证其存在于工作流定义中
  - 如果 `fromNodeId` 未提供,从实例的 `current_node_ids` 获取起始节点
  - **在执行节点前,检查并处理回滚场景(如果需要)**
  - 根据节点类型执行相应逻辑：
    - ServiceTask：调用业务接口
    - UserTask：返回待处理状态,不自动流转
    - IntermediateCatchEvent：等待外部事件,不自动流转
    - EventBasedGateway：等待事件选择,不自动流转
    - Gateway：根据条件表达式选择下一个节点
    - EndEvent：标记实例为完成状态
  - **对于非 UserTask、IntermediateCatchEvent、EventBasedGateway 节点,执行完成后自动流转到下一个节点**
  - 根据序列流和条件表达式推进到下一个节点
  - 更新工作流实例的 `current_node_ids` 和状态
  - 创建或更新工作流执行记录
- **并且** 如果实例不存在,返回404状态码和错误码 `WORKFLOW_INSTANCE_NOT_FOUND`
- **并且** 如果节点不存在,返回400状态码和错误码 `INVALID_NODE_ID`
- **并且** 如果 `fromNodeId` 未提供且 `current_node_ids` 为空,返回400状态码和错误码 `INVALID_REQUEST`
- **注意**：路径参数 `workflowInstanceId` 和请求体字段 `fromNodeId`、`businessParams` 均使用驼峰命名(camelCase)
- **并且** 成功响应应返回200状态码,响应体格式：
  ```json
  {
    "success": true,
    "data": {
      "businessResponse": {
        "statusCode": 200,
        "body": {...},
        "headers": {...}
      },
      "engineResponse": {
        "instanceId": "uuid",
        "currentNodeIds": ["node_1"],
        "nextNodeIds": ["node_2"],
        "status": "running",
        "executionId": "uuid",
        "variables": {...}
      }
    }
  }
  ```

#### Scenario: 执行工作流(从当前节点继续)

- **当** 客户端发送 `POST /api/execute/:workflowInstanceId` 请求且请求体中未提供 `fromNodeId` 时
- **则** 系统应：
  - 从工作流实例的 `current_node_ids` 获取当前节点
  - 如果 `current_node_ids` 为空,返回400状态码和错误码 `INVALID_REQUEST`,错误消息为 "No current nodes in workflow instance"
  - 如果 `current_node_ids` 包含多个节点,选择第一个节点作为起始节点
  - 使用获取的节点 ID 作为 `fromNodeId` 继续执行工作流
- **并且** 执行逻辑与提供 `fromNodeId` 时完全相同

#### Scenario: 执行前回滚检查(边界事件)

- **WHEN** 执行的节点类型为边界事件(BoundaryEvent)时
- **THEN** 系统应检查 `attached_node_id` 是否为空,为空则抛出异常
- **AND** 如果 `attached_node_id` 在 `current_node_ids` 中,则返回(不回滚)
- **AND** 如果 `attached_node_id` 不在 `current_node_ids` 中,则检查 `can_fallback` 字段
- **AND** 如果 `can_fallback` 为 true,则执行回滚到 `attached_node_id`
- **AND** 如果 `can_fallback` 为 false,则抛出异常
- **AND** 边界事件是异步触发的,可以在 attached_node_id 执行期间的任何时刻触发,因此不进行跳步骤检查,只要不在当前节点就无条件回滚到 attached_node_id

#### Scenario: 执行前回滚检查(中间捕获事件)

- **WHEN** 执行的节点类型为中间捕获事件(IntermediateCatchEvent)时
- **THEN** 如果 `from_node_id` 在 `current_node_ids` 中,则返回(不回滚)
- **AND** 如果前置节点为 EVENT_BASED_GATEWAY 且在 `current_node_ids` 中,则返回(不回滚)
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之前,则检查 `can_fallback` 字段
- **AND** 如果 `can_fallback` 为 true,则执行回滚到 `from_node_id`
- **AND** 如果 `can_fallback` 为 false,则抛出异常
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之后,则抛出跳步骤异常
- **AND** 如果 `from_node_id` 与 `current_node_ids` 所指节点均无关,则检查 `can_fallback` 字段并执行回滚(兜底处理)

#### Scenario: 执行前回滚检查(普通节点)

- **WHEN** 执行的节点类型为普通节点(非边界事件、非中间捕获事件)时
- **THEN** 如果 `from_node_id` 在 `current_node_ids` 中,则返回(不回滚)
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之前,则检查 `can_fallback` 字段
- **AND** 如果 `can_fallback` 为 true,则执行回滚到 `from_node_id`
- **AND** 如果 `can_fallback` 为 false,则抛出异常
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之后,则抛出跳步骤异常
- **AND** 如果 `from_node_id` 与 `current_node_ids` 所指节点均无关,则检查 `can_fallback` 字段并执行回滚(兜底处理)

#### Scenario: 自动流转排除机制

- **WHEN** 节点执行完成后
- **THEN** 如果节点类型为 UserTask、IntermediateCatchEvent 或 EventBasedGateway,则不进行自动流转
- **AND** 对于其他节点类型,系统应自动流转到下一个节点
