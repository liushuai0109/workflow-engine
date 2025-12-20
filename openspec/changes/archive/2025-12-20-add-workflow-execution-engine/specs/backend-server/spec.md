# 后端服务器规范（变更）

## ADDED Requirements

### Requirement: 工作流执行引擎 API

系统 SHALL 提供工作流执行引擎接口，支持从指定节点开始执行工作流并调用业务接口。

#### Scenario: 执行工作流（从指定节点开始）

- **当** 客户端发送 `POST /api/execute/:workflowInstanceId` 请求时
- **则** 请求体应包含：
  - `fromNodeId`：必填，字符串，指定从哪个节点开始执行
  - `businessParams`：可选，JSON 字符串，传递给业务接口的参数
- **并且** 系统应：
  - 验证工作流实例存在
  - 获取工作流定义（BPMN XML）并解析
  - 验证 `fromNodeId` 存在于工作流定义中
  - 根据节点类型执行相应逻辑：
    - ServiceTask：调用业务接口
    - UserTask：返回待处理状态
    - Gateway：根据条件表达式选择下一个节点
    - EndEvent：标记实例为完成状态
  - 根据序列流和条件表达式推进到下一个节点
  - 更新工作流实例的 `current_node_ids` 和状态
  - 创建或更新工作流执行记录
- **并且** 如果实例不存在，返回404状态码和错误码 `WORKFLOW_INSTANCE_NOT_FOUND`
- **并且** 如果节点不存在，返回400状态码和错误码 `INVALID_NODE_ID`
- **注意**：路径参数 `workflowInstanceId` 和请求体字段 `fromNodeId`、`businessParams` 均使用驼峰命名（camelCase）
- **并且** 成功响应应返回200状态码，响应体格式：
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

#### Scenario: 执行 ServiceTask 节点（调用业务接口）

- **当** 执行的节点类型为 ServiceTask 时
- **则** 系统应：
  - 从节点的扩展属性中获取业务接口 URL（使用 `xflow:` 命名空间）
  - 使用 `businessParams` 作为请求体调用业务接口
  - 发送 HTTP POST 请求到业务接口 URL
  - 处理业务接口响应（状态码、响应体、响应头）
  - 将业务接口响应存储到执行记录的 `variables.businessResponse` 中
  - 如果业务接口调用失败，记录错误信息并更新执行状态为 `failed`
- **并且** 业务接口调用应设置超时时间（默认30秒）
- **并且** 如果业务接口返回错误状态码（4xx、5xx），应记录错误但继续流程执行（或根据配置决定是否停止）

#### Scenario: 执行 Gateway 节点（条件判断）

- **当** 执行的节点类型为 ExclusiveGateway 时
- **则** 系统应：
  - 查找该节点的所有出边（序列流）
  - 对于每个序列流，如果有条件表达式，则评估条件表达式
  - 选择第一个条件为真的序列流（或默认序列流）
  - 如果所有条件都不满足且没有默认序列流，返回错误
- **并且** 条件表达式应使用工作流变量作为上下文进行评估
- **并且** 如果条件表达式评估失败，应记录错误并停止执行

#### Scenario: 执行 EndEvent 节点（完成流程）

- **当** 执行的节点类型为 EndEvent 时
- **则** 系统应：
  - 将工作流实例状态更新为 `completed`
  - 清空 `current_node_ids`（设置为空数组）
  - 更新执行记录的 `completed_at` 时间戳
  - 将执行状态更新为 `completed`

#### Scenario: 流程推进逻辑

- **当** 节点执行完成后
- **则** 系统应：
  - 根据节点的 `OutgoingSequenceFlowIds` 查找所有出边
  - 对于 ExclusiveGateway，根据条件表达式选择符合条件的序列流
  - 获取序列流的 `TargetNodeId` 作为下一个节点
  - 更新工作流实例的 `current_node_ids` 为下一个节点 ID
  - 如果下一个节点是 EndEvent，标记实例为完成状态
- **并且** 如果找不到下一个节点，应记录错误并停止执行

#### Scenario: 处理执行错误

- **当** 工作流执行过程中发生错误时
- **则** 系统应：
  - 记录详细的错误信息到执行记录的 `error_message` 字段
  - 将执行状态更新为 `failed`
  - 将工作流实例状态更新为 `failed`（如果错误严重）
  - 返回适当的 HTTP 状态码和错误信息
- **并且** 错误类型包括：
  - 业务接口调用失败（网络错误、超时、HTTP 错误）
  - 节点不存在
  - 流程定义解析失败
  - 条件表达式评估失败
  - 找不到下一个节点

#### Scenario: 业务接口响应格式

- **当** 业务接口调用成功时
- **则** `businessResponse` 应包含：
  - `statusCode`：HTTP 状态码（整数）
  - `body`：响应体（JSON 对象或字符串）
  - `headers`：响应头（对象，键值对）
- **并且** 响应体应存储到执行记录的 `variables.businessResponse` 中

#### Scenario: 流程引擎响应格式

- **当** 工作流执行完成（无论成功或失败）时
- **则** `engineResponse` 应包含：
  - `instanceId`：工作流实例 ID
  - `currentNodeIds`：当前节点 ID 数组（执行后的当前节点）
  - `nextNodeIds`：下一个节点 ID 数组（如果已确定）
  - `status`：实例状态（"pending"、"running"、"completed"、"failed"）
  - `executionId`：执行记录 ID
  - `variables`：工作流变量（包含业务接口响应等）

