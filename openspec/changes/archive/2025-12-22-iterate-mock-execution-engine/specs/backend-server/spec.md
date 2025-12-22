# 后端服务器规范（变更）

## MODIFIED Requirements

### Requirement: 工作流 Mock 执行 API

系统 SHALL 提供 API 端点用于执行工作流的 Mock 模式，模拟工作流执行而不调用真实外部服务。

#### Scenario: 启动 Mock 执行（使用执行引擎接口）

- **当** 客户端发送 `POST /api/workflows/:workflowId/mock/execute` 请求时
- **则** 请求体应包含：
  - `executionApi`: 必填，字符串，要模拟的执行接口，目前支持 `"POST /api/execute/:workflowInstanceId"`
  - `workflowInstanceId`: 可选，字符串，工作流实例 ID（如果不存在，系统创建 Mock 实例）
  - `fromNodeId`: 必填，字符串，起始节点 ID
  - `businessParams`: 可选，对象，业务参数（传递给 ServiceTask）
  - `nodeMockData`: 可选，对象，节点级别的 Mock 数据配置，键为节点 ID，值为：
    - `mockResponse`: 可选，Mock 响应数据
    - `delay`: 可选，执行延迟（毫秒）
    - `shouldFail`: 可选，是否模拟失败（布尔值）
- **并且** 如果 `workflowInstanceId` 不存在，系统应：
  - 创建 Mock 工作流实例（使用前缀 `mock-instance-`）
  - 设置初始状态为 `pending`
  - 设置 `currentNodeIds` 为空数组
  - 设置初始 `variables` 为空对象
- **并且** 系统应调用真实的执行引擎服务（`WorkflowEngineService.ExecuteFromNode`），但使用 Mock 模式
- **并且** 在 Mock 模式下，ServiceTask 节点应使用 Mock 数据而非真实 API 调用
- **并且** 成功返回 200 状态码和执行结果，包含：
  - `executionId`: Mock 执行 ID
  - `workflowInstanceId`: 工作流实例 ID（可能是新创建的 Mock 实例）
  - `status`: 执行状态
  - `currentNodeIds`: 当前执行节点 ID 数组
  - `variables`: 当前工作流变量
  - `businessResponse`: 业务响应（如果有）
  - `engineResponse`: 引擎响应
  - `interceptorCalls`: 拦截器调用列表（数组），每个元素包含：
    - `name`: 拦截器名称
    - `order`: 调用顺序（序号）
    - `timestamp`: 调用时间戳
    - `input`: 拦截器函数的入参（JSON）
    - `output`: 拦截器函数的出参（JSON）
  - `requestParams`: 请求的入参（完整的请求体）

#### Scenario: 继续 Mock 执行（下一步）

- **当** 客户端发送 `POST /api/workflows/mock/executions/:executionId/step` 请求时
- **则** 请求体应包含：
  - `businessParams`: 可选，对象，当前步骤的业务参数
  - `nodeMockData`: 可选，对象，当前步骤的节点 Mock 数据
- **并且** 系统应：
  - 获取 Mock 执行记录和关联的 Mock 工作流实例
  - 从实例的 `currentNodeIds` 获取下一个要执行的节点
  - 如果 `currentNodeIds` 为空，返回错误
  - 调用 `WorkflowEngineService.ExecuteFromNode`（Mock 模式）执行下一个节点
  - 更新 Mock 实例的状态和 `currentNodeIds`
- **并且** 成功返回 200 状态码和执行结果

## ADDED Requirements

### Requirement: Mock 工作流实例管理

系统 SHALL 提供 Mock 工作流实例的创建和管理功能。

#### Scenario: 创建 Mock 工作流实例

- **当** Mock 执行需要工作流实例但实例不存在时
- **则** 系统应自动创建 Mock 工作流实例
- **并且** Mock 实例应包含：
  - `id`: 字符串，格式为 `mock-instance-{uuid}`
  - `workflowId`: 字符串，关联的工作流 ID
  - `status`: 字符串，初始值为 `pending`
  - `currentNodeIds`: 数组，初始为空数组
  - `variables`: 对象，初始为空对象
  - `instanceVersion`: 整数，初始值为 1
  - `createdAt`: 时间戳
  - `updatedAt`: 时间戳
- **并且** Mock 实例应存储在内存中（`MockInstanceStore`）

#### Scenario: 获取 Mock 工作流实例

- **当** 客户端发送 `GET /api/workflows/mock/instances/:instanceId` 请求时
- **则** 系统应返回 Mock 实例的完整信息
- **并且** 如果实例不存在，返回 404 状态码

#### Scenario: 更新 Mock 工作流实例

- **当** Mock 执行更新实例状态时
- **则** 系统应更新 Mock 实例的：
  - `status`: 执行状态
  - `currentNodeIds`: 当前节点 ID 数组
  - `variables`: 工作流变量
  - `instanceVersion`: 版本号（递增）
  - `updatedAt`: 更新时间

### Requirement: Mock 模式执行引擎支持

系统 SHALL 在执行引擎中支持 Mock 模式，使用 Mock 数据替代真实外部服务调用。

#### Scenario: Mock 模式标识

- **当** 执行引擎在 Mock 模式下运行时
- **则** 系统应通过上下文（context）传递 Mock 模式标识
- **并且** 执行引擎应检查 Mock 模式标识
- **并且** 在 Mock 模式下，ServiceTask 节点应使用 Mock 数据而非真实 API 调用

#### Scenario: Mock 数据注入

- **当** 执行引擎在 Mock 模式下执行 ServiceTask 节点时
- **则** 系统应：
  - 查找节点对应的 Mock 数据配置
  - 如果找到 Mock 数据，返回 Mock 响应
  - 如果未找到，使用默认 Mock 响应
  - 不调用真实的外部 API
- **并且** Mock 响应应包含：
  - `status`: 响应状态（成功或失败）
  - `data`: 响应数据（从 Mock 配置获取）
  - `error`: 错误信息（如果模拟失败）

### Requirement: Mock 执行拦截器调用跟踪

系统 SHALL 在 Mock 执行过程中跟踪和记录拦截器的调用信息。

#### Scenario: 记录拦截器调用

- **当** Mock 执行过程中调用拦截器时
- **则** 系统应记录每次拦截器调用的详细信息
- **并且** 记录信息应包含：
  - `name`: 拦截器名称
  - `order`: 调用顺序（从 1 开始递增）
  - `timestamp`: 调用时间戳（ISO 8601 格式）
  - `input`: 拦截器函数的入参（JSON 对象）
  - `output`: 拦截器函数的出参（JSON 对象）
- **并且** 拦截器调用记录应按调用顺序存储

#### Scenario: 返回拦截器调用信息

- **当** Mock 执行完成或单步执行完成时
- **则** API 响应应包含 `interceptorCalls` 字段
- **并且** `interceptorCalls` 应为数组，包含所有拦截器调用记录
- **并且** 如果没有拦截器调用，应返回空数组

#### Scenario: 支持多种拦截器类型

- **当** Mock 执行调用不同类型的拦截器时
- **则** 系统应跟踪：
  - 前置拦截器（pre-interceptors）
  - 后置拦截器（post-interceptors）
  - 错误处理拦截器（error-interceptors）
- **并且** 每种拦截器类型应在 `name` 字段中标识


