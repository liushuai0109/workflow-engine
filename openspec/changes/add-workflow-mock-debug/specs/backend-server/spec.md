# 后端服务器规范（变更）

## ADDED Requirements

### Requirement: 工作流 Mock 执行 API

系统 SHALL 提供 API 端点用于执行工作流的 Mock 模式，模拟工作流执行而不调用真实外部服务。

#### Scenario: 启动 Mock 执行

- **当** 客户端发送 `POST /api/workflows/:workflowId/mock/execute` 请求时
- **则** 请求体应包含：
  - `mockConfig`: 可选，Mock 配置对象（如果未提供，使用默认配置）
  - `initialVariables`: 可选，初始工作流变量
  - `userId`: 可选，模拟用户 ID（默认使用测试用户）
- **并且** 系统解析工作流的 BPMN XML
- **并且** 系统使用 Mock 配置执行工作流
- **并且** 成功返回 200 状态码和执行结果，包含：
  - `executionId`: 执行实例 ID
  - `status`: 执行状态（'running' | 'completed' | 'failed'）
  - `currentNodeId`: 当前执行节点 ID
  - `variables`: 当前工作流变量
  - `executionHistory`: 执行历史记录数组

#### Scenario: 获取 Mock 执行状态

- **当** 客户端发送 `GET /api/workflows/mock/executions/:executionId` 请求时
- **则** 返回执行实例的当前状态，包括：
  - `executionId`: 执行实例 ID
  - `workflowId`: 工作流 ID
  - `status`: 执行状态
  - `currentNodeId`: 当前节点 ID
  - `variables`: 当前变量
  - `executionHistory`: 执行历史
  - `startedAt`: 开始时间
  - `updatedAt`: 最后更新时间

#### Scenario: 单步执行 Mock

- **当** 客户端发送 `POST /api/workflows/mock/executions/:executionId/step` 请求时
- **则** 系统执行下一个节点
- **并且** 执行后暂停，等待下一步指令
- **并且** 返回执行结果，包含：
  - `executedNodeId`: 刚执行的节点 ID
  - `nodeInput`: 节点输入数据
  - `nodeOutput`: 节点输出数据
  - `variables`: 更新后的变量
  - `nextNodeId`: 下一个要执行的节点 ID（如果有）

#### Scenario: 继续 Mock 执行

- **当** 客户端发送 `POST /api/workflows/mock/executions/:executionId/continue` 请求时
- **则** 系统从当前暂停点继续执行
- **并且** 如果遇到断点，自动暂停
- **并且** 返回当前执行状态

#### Scenario: 停止 Mock 执行

- **当** 客户端发送 `POST /api/workflows/mock/executions/:executionId/stop` 请求时
- **则** 系统停止执行
- **并且** 更新执行状态为 'stopped'
- **并且** 返回最终执行结果

### Requirement: Mock 配置管理 API

系统 SHALL 提供 API 端点用于管理 Mock 配置。

#### Scenario: 保存 Mock 配置

- **当** 客户端发送 `POST /api/workflows/:workflowId/mock/configs` 请求时
- **则** 请求体应包含：
  - `name`: 必填，配置名称
  - `description`: 可选，配置描述
  - `nodeConfigs`: 必填，节点配置对象，键为节点 ID，值为配置：
    - `mockResponse`: 可选，Mock 响应数据
    - `delay`: 可选，执行延迟（毫秒）
    - `shouldFail`: 可选，是否模拟失败（布尔值）
    - `errorMessage`: 可选，失败时的错误消息
  - `gatewayConfigs`: 可选，网关配置对象，键为网关 ID，值为：
    - `selectedPath`: 必填，选择的路径 ID
- **并且** 系统保存配置到数据库
- **并且** 成功返回 201 状态码和配置数据，包含 `configId`

#### Scenario: 获取工作流的 Mock 配置列表

- **当** 客户端发送 `GET /api/workflows/:workflowId/mock/configs` 请求时
- **则** 返回该工作流的所有 Mock 配置列表
- **并且** 每个配置包含：`configId`、`name`、`description`、`createdAt`、`updatedAt`

#### Scenario: 获取 Mock 配置详情

- **当** 客户端发送 `GET /api/workflows/mock/configs/:configId` 请求时
- **则** 返回配置的完整信息，包括所有节点和网关配置

#### Scenario: 更新 Mock 配置

- **当** 客户端发送 `PUT /api/workflows/mock/configs/:configId` 请求时
- **则** 请求体可以包含要更新的字段
- **并且** 系统更新配置
- **并且** 成功返回 200 状态码和更新后的配置

#### Scenario: 删除 Mock 配置

- **当** 客户端发送 `DELETE /api/workflows/mock/configs/:configId` 请求时
- **则** 系统删除配置
- **并且** 成功返回 204 状态码

### Requirement: 工作流 Debug API

系统 SHALL 提供 API 端点用于调试工作流执行。

#### Scenario: 启动 Debug 执行

- **当** 客户端发送 `POST /api/workflows/:workflowId/debug/start` 请求时
- **则** 请求体应包含：
  - `breakpoints`: 可选，断点节点 ID 数组
  - `initialVariables`: 可选，初始变量
  - `userId`: 可选，用户 ID
- **并且** 系统启动 Debug 执行
- **并且** 系统在断点处暂停（如果第一个节点是断点）
- **并且** 成功返回 200 状态码和 Debug 上下文，包含：
  - `debugSessionId`: Debug 会话 ID
  - `executionId`: 执行实例 ID
  - `status`: 状态（'paused' | 'running'）
  - `currentNodeId`: 当前节点 ID
  - `variables`: 当前变量
  - `callStack`: 调用栈

#### Scenario: 单步执行 Debug

- **当** 客户端发送 `POST /api/workflows/debug/sessions/:sessionId/step` 请求时
- **则** 系统执行下一个节点
- **并且** 执行后暂停
- **并且** 返回执行结果，包含：
  - `executedNodeId`: 执行的节点 ID
  - `nodeInput`: 节点输入
  - `nodeOutput`: 节点输出
  - `variables`: 更新后的变量
  - `callStack`: 更新后的调用栈
  - `nextNodeId`: 下一个节点 ID

#### Scenario: 继续 Debug 执行

- **当** 客户端发送 `POST /api/workflows/debug/sessions/:sessionId/continue` 请求时
- **则** 系统从当前暂停点继续执行
- **并且** 遇到断点时自动暂停
- **并且** 返回当前状态

#### Scenario: 获取 Debug 会话状态

- **当** 客户端发送 `GET /api/workflows/debug/sessions/:sessionId` 请求时
- **则** 返回 Debug 会话的完整状态，包括：
  - `sessionId`: 会话 ID
  - `executionId`: 执行实例 ID
  - `status`: 状态
  - `currentNodeId`: 当前节点
  - `variables`: 变量
  - `callStack`: 调用栈
  - `executionHistory`: 执行历史
  - `breakpoints`: 断点列表

#### Scenario: 设置断点

- **当** 客户端发送 `POST /api/workflows/debug/sessions/:sessionId/breakpoints` 请求时
- **则** 请求体应包含 `nodeIds` 数组
- **并且** 系统更新断点列表
- **并且** 成功返回 200 状态码

#### Scenario: 获取变量值

- **当** 客户端发送 `GET /api/workflows/debug/sessions/:sessionId/variables` 请求时
- **则** 返回当前所有工作流变量的值
- **并且** 支持查询参数 `filter` 用于过滤变量名

#### Scenario: 获取节点执行详情

- **当** 客户端发送 `GET /api/workflows/debug/sessions/:sessionId/nodes/:nodeId` 请求时
- **则** 返回该节点的执行详情，包括：
  - `nodeId`: 节点 ID
  - `nodeName`: 节点名称
  - `nodeType`: 节点类型
  - `status`: 执行状态
  - `input`: 输入数据
  - `output`: 输出数据
  - `executionTime`: 执行时间（毫秒）
  - `error`: 错误信息（如果有）

#### Scenario: 停止 Debug 会话

- **当** 客户端发送 `POST /api/workflows/debug/sessions/:sessionId/stop` 请求时
- **则** 系统停止 Debug 执行
- **并且** 更新状态为 'stopped'
- **并且** 返回最终执行结果

