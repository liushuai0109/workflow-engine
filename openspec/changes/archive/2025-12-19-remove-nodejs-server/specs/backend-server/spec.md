# 后端服务器规范（变更）

## MODIFIED Requirements

### Requirement: Backend Server Implementation

系统 SHALL 提供基于 Go 的后端 API 服务。

#### Scenario: Go 后端实现

- **当** 系统启动后端服务时
- **则** 系统应使用 `server` 实现（原 `server-go`）
- **并且** 后端使用 Gin 框架
- **并且** 使用 Go 1.21+ 编写
- **并且** 通过 `pnpm run start:server` 或 `cd server && make run` 启动
- **并且** Go module 名称为 `github.com/bpmn-explorer/server`

#### Scenario: API 接口

- **当** 前端调用后端 API 时
- **则** 所有端点路径遵循 RESTful 规范
- **并且** 请求/响应的 JSON schema 符合规范
- **并且** 错误码和错误消息格式统一

## MODIFIED Requirements

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

