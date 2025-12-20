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

系统 SHALL 提供用户档案的 CRUD 操作，并持久化到数据库。

#### Scenario: 创建用户（数据库实现）

- **当** 客户端发送 `POST /api/users` 请求时
- **则** 系统应：
  - 生成UUID作为用户ID
  - 将attributes序列化为JSONB格式
  - 执行数据库INSERT操作到 `users` 表
  - 设置 `created_at` 和 `updated_at` 为当前时间
- **并且** 如果email已存在，返回409状态码和错误码 `DUPLICATE_EMAIL`
- **并且** 成功响应应返回201状态码和包含数据库生成的ID的用户数据

#### Scenario: 获取用户（数据库实现）

- **当** 客户端发送 `GET /api/users/:userId` 请求时
- **则** 系统应：
  - 执行数据库SELECT查询
  - 反序列化JSONB attributes字段
  - 如果用户不存在，返回404状态码和错误码 `USER_NOT_FOUND`
- **并且** 成功响应应返回200状态码和用户数据

#### Scenario: 更新用户属性（数据库实现）

- **当** 客户端发送 `PUT /api/users/:userId` 请求时
- **则** 系统应：
  - 使用PostgreSQL JSONB `||` 操作符合并attributes（而非替换）
  - 更新 `updated_at` 时间戳
  - 执行数据库UPDATE操作
- **并且** 如果用户不存在，返回404状态码和错误码 `USER_NOT_FOUND`
- **并且** 成功响应应返回200状态码和更新后的用户数据

### Requirement: 工作流管理 API

系统 SHALL 提供 BPMN 工作流的 CRUD 操作，并持久化到数据库。

#### Scenario: 创建工作流（数据库实现）

- **当** 客户端发送 `POST /api/workflows` 请求时
- **则** 系统应：
  - 生成UUID作为工作流ID
  - 将BPMN XML存储到 `bpmn_xml` 字段
  - 设置默认 `version` 为 "1.0.0"
  - 设置默认 `status` 为 "draft"
  - 执行数据库INSERT操作到 `workflows` 表
  - 设置 `created_at` 和 `updated_at` 为当前时间
- **并且** 成功响应应返回201状态码和工作流数据

#### Scenario: 获取工作流（数据库实现）

- **当** 客户端发送 `GET /api/workflows/:workflowId` 请求时
- **则** 系统应：
  - 执行数据库SELECT查询
  - 从 `bpmn_xml` 字段读取BPMN XML
  - 如果工作流不存在，返回404状态码和错误码 `WORKFLOW_NOT_FOUND`
- **并且** 成功响应应返回200状态码和工作流数据（包括BPMN XML）

#### Scenario: 更新工作流（数据库实现）

- **当** 客户端发送 `PUT /api/workflows/:workflowId` 请求时
- **则** 系统应：
  - 执行数据库UPDATE操作
  - 更新 `bpmn_xml` 字段（如果提供）
  - 更新 `updated_at` 时间戳
- **并且** 如果工作流不存在，返回404状态码和错误码 `WORKFLOW_NOT_FOUND`
- **并且** 成功响应应返回200状态码和更新后的工作流数据

#### Scenario: 列出工作流（数据库实现）

- **当** 客户端发送 `GET /api/workflows` 请求时
- **则** 系统应：
  - 支持查询参数：`page`（默认1）、`pageSize`（默认20）
  - 执行数据库SELECT查询，使用LIMIT和OFFSET实现分页
  - 执行COUNT查询获取总数
  - 按 `created_at DESC` 排序
- **并且** 响应应包含 `metadata` 字段：
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

### Requirement: 工作流实例管理 API

系统 SHALL 提供工作流实例的 CRUD 操作，并持久化到数据库。

#### Scenario: 创建工作流实例

- **当** 客户端发送 `POST /api/workflow-instances` 请求时
- **则** 系统应：
  - 生成UUID作为实例ID
  - 验证关联的 `workflow_id` 存在
  - 初始化 `current_node_ids` 为空数组
  - 设置 `instance_version` 为 1
  - 执行数据库INSERT操作到 `workflow_instances` 表
  - 设置默认 `status` 为 "pending"
  - 设置 `created_at` 和 `updated_at` 为当前时间
- **并且** 如果workflow_id不存在，返回404状态码和错误码 `WORKFLOW_NOT_FOUND`
- **并且** 成功响应应返回201状态码和实例数据
- **注意**：实例不包含variables字段，变量应在执行层面管理

#### Scenario: 获取工作流实例

- **当** 客户端发送 `GET /api/workflow-instances/:instanceId` 请求时
- **则** 系统应：
  - 执行数据库SELECT查询
  - 反序列化JSONB variables字段
  - 如果实例不存在，返回404状态码和错误码 `WORKFLOW_INSTANCE_NOT_FOUND`
- **并且** 成功响应应返回200状态码和实例数据

#### Scenario: 更新工作流实例

- **当** 客户端发送 `PUT /api/workflow-instances/:instanceId` 请求时
- **则** 系统应：
  - 执行数据库UPDATE操作
  - 更新 `current_node_ids` 数组（如果提供）
  - 递增 `instance_version`（每次更新时自动递增）
  - 更新 `updated_at` 时间戳
- **并且** 如果实例不存在，返回404状态码和错误码 `WORKFLOW_INSTANCE_NOT_FOUND`
- **并且** 成功响应应返回200状态码和更新后的实例数据（包含新的 `instanceVersion`）
- **注意**：实例不包含variables字段，变量应在执行层面管理

### Requirement: 工作流执行管理 API

系统 SHALL 提供工作流执行的 CRUD 操作，并持久化到数据库。

#### Scenario: 创建工作流执行

- **当** 客户端发送 `POST /api/workflow-executions` 请求时
- **则** 系统应：
  - 生成UUID作为执行ID
  - 验证关联的 `instance_id` 和 `workflow_id` 存在
  - 将variables序列化为JSONB格式
  - 设置 `execution_version` 为 1（首次执行）或从实例的 `instance_version` 获取
  - 执行数据库INSERT操作到 `workflow_executions` 表
  - 设置默认 `status` 为 "pending"
  - 设置 `started_at` 为当前时间
- **并且** 如果instance_id或workflow_id不存在，返回404状态码和相应错误码
- **并且** 成功响应应返回201状态码和执行数据
- **注意**：执行不包含user_id字段，用户信息应在实例层面管理

#### Scenario: 获取工作流执行

- **当** 客户端发送 `GET /api/workflow-executions/:executionId` 请求时
- **则** 系统应：
  - 执行数据库SELECT查询
  - 反序列化JSONB variables字段
  - 如果执行不存在，返回404状态码和错误码 `WORKFLOW_EXECUTION_NOT_FOUND`
- **并且** 成功响应应返回200状态码和执行数据

#### Scenario: 更新工作流执行

- **当** 客户端发送 `PUT /api/workflow-executions/:executionId` 请求时
- **则** 系统应：
  - 执行数据库UPDATE操作
  - 更新状态、变量等字段
  - 如果状态变为 "completed" 或 "failed"，设置 `completed_at` 时间戳
  - 如果提供variables，使用JSONB `||` 操作符合并
  - **注意**：`current_node_ids` 应在实例层面更新，而非执行层面
- **并且** 如果执行不存在，返回404状态码和错误码 `WORKFLOW_EXECUTION_NOT_FOUND`
- **并且** 成功响应应返回200状态码和更新后的执行数据

#### Scenario: 列出工作流执行

- **当** 客户端发送 `GET /api/workflow-executions` 请求时
- **则** 系统应：
  - 支持查询参数：`page`、`pageSize`、`instanceId`、`workflowId`、`status`
  - 执行数据库SELECT查询，使用LIMIT和OFFSET实现分页
  - 执行COUNT查询获取总数
  - 按 `started_at DESC` 排序
- **并且** 响应应包含 `metadata` 字段和过滤后的数据列表
- **并且** 支持按 `instanceId` 过滤，获取特定实例的所有执行记录
- **注意**：不支持按userId过滤，用户信息应在实例层面查询

### Requirement: 数据库迁移管理

系统 SHALL 提供数据库schema迁移功能。

#### Scenario: 执行数据库迁移

- **当** 运行数据库迁移命令时
- **则** 系统应：
  - 读取 `server/migrations/` 目录下的迁移脚本
  - 按版本顺序执行up迁移脚本
  - 记录已执行的迁移版本
  - 如果迁移失败，回滚到上一个版本
- **并且** 迁移脚本应基于 `docs/backend/database-schema.md` 中的schema定义

#### Scenario: 回滚数据库迁移

- **当** 运行数据库迁移回滚命令时
- **则** 系统应：
  - 执行对应版本的down迁移脚本
  - 从迁移记录中移除该版本
- **并且** 应支持回滚到指定版本

### Requirement: 数据库错误处理

系统 SHALL 正确处理数据库错误并返回适当的业务错误码。

#### Scenario: 处理唯一约束冲突

- **当** 数据库操作违反唯一约束（如重复email）时
- **则** 系统应：
  - 检测PostgreSQL错误码 `23505` (unique_violation)
  - 返回409状态码和错误码 `DUPLICATE_EMAIL`
  - 错误消息应明确指出冲突的字段

#### Scenario: 处理外键约束冲突

- **当** 数据库操作违反外键约束时
- **则** 系统应：
  - 检测PostgreSQL错误码 `23503` (foreign_key_violation)
  - 返回400状态码和错误码 `FOREIGN_KEY_VIOLATION`
  - 错误消息应明确指出关联的实体

#### Scenario: 处理记录不存在

- **当** 查询操作未找到记录时
- **则** 系统应：
  - 检测 `sql.ErrNoRows` 错误
  - 返回404状态码和相应的错误码（如 `USER_NOT_FOUND`、`WORKFLOW_NOT_FOUND`）

#### Scenario: 处理数据库连接错误

- **当** 数据库操作因连接问题失败时
- **则** 系统应：
  - 返回503状态码和错误码 `DATABASE_ERROR`
  - 记录详细的错误日志
  - 不暴露数据库内部错误信息给客户端

### Requirement: 模型字段映射

系统 SHALL 确保Go模型字段与数据库字段正确映射。

#### Scenario: JSON字段与数据库字段映射

- **当** 模型字段同时用于JSON序列化和数据库存储时
- **则** 系统应：
  - Go字段名使用PascalCase，与数据库字段名语义一致（如 `BpmnXML` 对应 `bpmn_xml`）
  - 使用 `json` tag定义JSON字段名（camelCase，如 `bpmnXml`）
  - 使用 `db` tag定义数据库字段名（snake_case，如 `bpmn_xml`）
  - 确保字段类型兼容（如JSONB与map[string]interface{}）
- **并且** 示例：
  ```go
  type Workflow struct {
      BpmnXml string `json:"bpmnXml" db:"bpmn_xml"`  // Go: BpmnXml, JSON: bpmnXml, DB: bpmn_xml
  }
  ```
- **并且** Go字段名和数据库字段名应保持语义一致，便于理解和维护
- **并且** Go字段名严格遵循驼峰命名（PascalCase），ID缩写使用 `Id` 而非 `ID`，复数使用 `Ids` 而非 `IDs`

#### Scenario: JSONB字段序列化

- **当** 存储JSONB字段（如 `attributes`）时
- **则** 系统应：
  - 使用 `json.Marshal` 将Go map转换为JSON字符串
  - 使用PostgreSQL的JSONB类型存储
- **当** 读取JSONB字段时
- **则** 系统应：
  - 从数据库读取JSON字符串
  - 使用 `json.Unmarshal` 转换为Go map

#### Scenario: JSONB字段合并更新

- **当** 更新JSONB字段（如合并attributes）时
- **则** 系统应：
  - 使用PostgreSQL的JSONB `||` 操作符进行原子合并
  - 确保并发安全
- **并且** SQL示例：
  ```sql
  UPDATE users 
  SET attributes = attributes || $1::jsonb,
      updated_at = NOW()
  WHERE id = $2
  ```

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

