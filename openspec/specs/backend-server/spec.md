# backend-server Specification

## Purpose
TBD - created by archiving change add-go-server. Update Purpose after archive.
## Requirements
### Requirement: Backend Server Implementation

系统 SHALL 提供基于 Go 的后端 API 服务。

#### Scenario: Go 后端实现

- **当** 系统启动后端服务时
- **则** 系统应使用 `server` 实现
- **并且** 后端使用 Gin 框架
- **并且** 使用 Go 1.21+ 编写
- **并且** 通过 `pnpm run start:server` 或 `cd server && make run` 启动
- **并且** Go module 名称为 `github.com/bpmn-explorer/server`

### Requirement: 统一的健康检查端点

后端服务 MUST 提供标准的健康检查端点。

#### Scenario: 健康检查响应格式

- **当** 客户端请求 `GET /health` 时
- **则** 响应应包含以下字段：
  - `status`: "ok" 或 "error"
  - `timestamp`: ISO 8601 格式的时间戳
  - `database`: "connected" 或 "unavailable"
- **并且** HTTP 状态码应为 200 (成功) 或 503 (服务不可用)
- **并且** 响应格式示例：
  ```json
  {
    "status": "ok",
    "timestamp": "2024-12-20T10:00:00Z",
    "database": "connected"
  }
  ```

### Requirement: 用户管理 API

系统 SHALL 提供用户档案的 CRUD 操作。

#### Scenario: 创建用户

- **当** 客户端发送 `POST /api/users` 请求时
- **则** 请求体应包含：
  - `email`: 必填，字符串
  - `attributes`: 可选，JSON 对象
- **并且** 成功响应应返回 201 状态码
- **并且** 响应体格式：
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "email": "user@example.com",
      "attributes": {},
      "createdAt": "2024-12-20T10:00:00Z",
      "updatedAt": "2024-12-20T10:00:00Z"
    }
  }
  ```

#### Scenario: 获取用户

- **当** 客户端发送 `GET /api/users/:userId` 请求时
- **则** 如果用户存在，返回 200 状态码和用户数据
- **并且** 如果用户不存在，返回 404 状态码和错误消息：
  ```json
  {
    "success": false,
    "error": {
      "code": "USER_NOT_FOUND",
      "message": "User not found"
    }
  }
  ```

#### Scenario: 更新用户属性

- **当** 客户端发送 `PUT /api/users/:userId` 请求时
- **则** 请求体应包含 `attributes` 对象
- **并且** 应合并（而非替换）现有属性
- **并且** 成功返回 200 状态码和更新后的用户数据

### Requirement: 工作流管理 API

系统 SHALL 提供 BPMN 工作流的 CRUD 操作。

#### Scenario: 创建工作流

- **当** 客户端发送 `POST /api/workflows` 请求时
- **则** 请求体应包含：
  - `name`: 必填，字符串
  - `description`: 可选，字符串
  - `bpmnXml`: 必填，BPMN XML 字符串
- **并且** 成功返回 201 状态码和工作流数据

#### Scenario: 获取工作流

- **当** 客户端发送 `GET /api/workflows/:workflowId` 请求时
- **则** 返回工作流的完整信息，包括 BPMN XML

#### Scenario: 列出工作流

- **当** 客户端发送 `GET /api/workflows` 请求时
- **则** 支持分页参数：`page`、`pageSize`
- **并且** 响应包含 `metadata` 字段：
  ```json
  {
    "success": true,
    "data": [...],
    "metadata": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "hasMore": true
    }
  }
  ```

#### Scenario: 更新工作流

- **当** 客户端发送 `PUT /api/workflows/:workflowId` 请求时
- **则** 请求体可以包含 `name`、`description`、`bpmnXml` 字段
- **并且** 成功返回 200 状态码和更新后的工作流数据

### Requirement: Claude AI API 代理

系统 SHALL 提供 Claude API 的代理端点，避免在前端暴露 API 密钥。

#### Scenario: 代理 Claude Messages API

- **当** 客户端发送 `POST /api/claude/v1/messages` 请求时
- **则** 后端应转发请求到 Claude API
- **并且** 自动添加 API key 和必要的 headers
- **并且** 返回 Claude API 的原始响应
- **并且** 处理 Claude API 错误并转换为统一格式

#### Scenario: Claude API 配置

- **当** 后端启动时
- **则** 应从环境变量读取：
  - `CLAUDE_API_BASE_URL`: Claude API 基础 URL（默认 jiekou.ai 代理）
  - `CLAUDE_API_KEY`: Claude API 密钥
- **并且** 如果未配置，Claude API 端点应返回 503 错误

### Requirement: CORS 配置

系统 MUST 支持跨域资源共享（CORS）。

#### Scenario: CORS 配置

- **当** 前端从不同源发送请求时
- **则** 后端应设置适当的 CORS headers
- **并且** `Access-Control-Allow-Origin` 应从环境变量 `CORS_ORIGIN` 读取
- **并且** 默认值为 `http://localhost:8000`
- **并且** 支持预检请求（OPTIONS 方法）

### Requirement: 结构化日志

系统 SHALL 提供结构化的请求日志。

#### Scenario: 请求日志格式

- **当** 后端处理任何 HTTP 请求时
- **则** 应记录以下信息：
  - 请求方法（GET、POST 等）
  - 请求路径
  - HTTP 状态码
  - 请求耗时（毫秒）
  - 时间戳
- **并且** 日志格式应为 JSON 或结构化文本
- **并且** 在开发环境可读性更好

#### Scenario: 错误日志

- **当** 发生错误时
- **则** 应记录完整的错误堆栈
- **并且** 包含请求上下文信息
- **并且** 错误级别应区分（info、warn、error）

### Requirement: 数据库连接管理

系统 SHALL 支持可选的数据库连接。

#### Scenario: 数据库连接成功

- **当** 配置了数据库连接信息时
- **则** 后端启动时应尝试连接数据库
- **并且** 成功后 `/health` 端点返回 `"database": "connected"`
- **并且** 记录连接成功日志

#### Scenario: 数据库连接失败

- **当** 数据库连接失败时
- **则** 后端应继续启动（非致命错误）
- **并且** `/health` 端点返回 `"database": "unavailable"`
- **并且** 记录警告日志，提示数据库不可用
- **并且** 依赖数据库的 API 应返回适当的错误

#### Scenario: 禁用数据库

- **当** 环境变量 `DB_DISABLED=true` 时
- **则** 后端不尝试连接数据库
- **并且** `/health` 端点返回 `"database": "unavailable"`
- **并且** 不记录数据库相关的警告

### Requirement: 统一错误响应格式

所有 API 错误 MUST 使用统一的响应格式。

#### Scenario: 错误响应结构

- **当** API 调用失败时
- **则** 响应体应包含：
  - `success`: false
  - `error.code`: 错误码（大写蛇形命名）
  - `error.message`: 人类可读的错误消息
- **并且** 示例：
  ```json
  {
    "success": false,
    "error": {
      "code": "USER_NOT_FOUND",
      "message": "User not found"
    }
  }
  ```

#### Scenario: 常见错误码

- **则** 系统应定义常见错误码：
  - `MISSING_EMAIL`: 缺少必填字段 email
  - `USER_NOT_FOUND`: 用户未找到
  - `WORKFLOW_NOT_FOUND`: 工作流未找到
  - `INVALID_REQUEST`: 请求格式无效
  - `INTERNAL_ERROR`: 内部服务器错误
  - `DATABASE_ERROR`: 数据库错误

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

