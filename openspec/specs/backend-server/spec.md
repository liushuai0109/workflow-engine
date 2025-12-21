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

系统 SHALL 提供工作流执行器 API，支持从指定节点执行工作流。

#### Scenario: 工作流执行器端点

- **当** 客户端请求 `POST /api/execute/:workflowInstanceId` 时
- **则** 系统应使用 `WorkflowExecutorHandler` 处理请求
- **并且** Handler 名称应为 `WorkflowExecutorHandler`（而非 `WorkflowExecutionHandler`）
- **并且** 请求体包含：
  - `fromNodeId`: 起始节点 ID（必需）
  - `businessParams`: 业务参数（可选）
- **并且** 响应包含：
  - `businessResponse`: 业务 API 响应（如果有）
  - `engineResponse`: 引擎响应（包括 instanceId, currentNodeIds, nextNodeIds, status, executionId, variables）

**注**: 此需求修改了命名规范，将 `WorkflowExecutionHandler` 重命名为 `WorkflowExecutorHandler`，以区分"执行器"（Executor）和"执行记录"（Execution）的概念。

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
  - **在执行节点前，检查并处理回滚场景（如果需要）**
  - 根据节点类型执行相应逻辑：
    - ServiceTask：调用业务接口
    - UserTask：返回待处理状态，不自动流转
    - IntermediateCatchEvent：等待外部事件，不自动流转
    - EventBasedGateway：等待事件选择，不自动流转
    - Gateway：根据条件表达式选择下一个节点
    - EndEvent：标记实例为完成状态
  - **对于非 UserTask、IntermediateCatchEvent、EventBasedGateway 节点，执行完成后自动流转到下一个节点**
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

#### Scenario: 执行前回滚检查（边界事件）

- **WHEN** 执行的节点类型为边界事件（BoundaryEvent）时
- **THEN** 系统应检查 `attached_node_id` 是否为空，为空则抛出异常
- **AND** 如果 `attached_node_id` 在 `current_node_ids` 中，则返回（不回滚）
- **AND** 如果 `attached_node_id` 不在 `current_node_ids` 中，则检查 `can_fallback` 字段
- **AND** 如果 `can_fallback` 为 true，则执行回滚到 `attached_node_id`
- **AND** 如果 `can_fallback` 为 false，则抛出异常
- **AND** 边界事件是异步触发的，可以在 attached_node_id 执行期间的任何时刻触发，因此不进行跳步骤检查，只要不在当前节点就无条件回滚到 attached_node_id

#### Scenario: 执行前回滚检查（中间捕获事件）

- **WHEN** 执行的节点类型为中间捕获事件（IntermediateCatchEvent）时
- **THEN** 如果 `from_node_id` 在 `current_node_ids` 中，则返回（不回滚）
- **AND** 如果前置节点为 EVENT_BASED_GATEWAY 且在 `current_node_ids` 中，则返回（不回滚）
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之前，则检查 `can_fallback` 字段
- **AND** 如果 `can_fallback` 为 true，则执行回滚到 `from_node_id`
- **AND** 如果 `can_fallback` 为 false，则抛出异常
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之后，则抛出跳步骤异常
- **AND** 如果 `from_node_id` 与 `current_node_ids` 所指节点均无关，则检查 `can_fallback` 字段并执行回滚（兜底处理）

#### Scenario: 执行前回滚检查（普通节点）

- **WHEN** 执行的节点类型为普通节点（非边界事件、非中间捕获事件）时
- **THEN** 如果 `from_node_id` 在 `current_node_ids` 中，则返回（不回滚）
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之前，则检查 `can_fallback` 字段
- **AND** 如果 `can_fallback` 为 true，则执行回滚到 `from_node_id`
- **AND** 如果 `can_fallback` 为 false，则抛出异常
- **AND** 如果 `from_node_id` 在 `current_node_ids` 之后，则抛出跳步骤异常
- **AND** 如果 `from_node_id` 与 `current_node_ids` 所指节点均无关，则检查 `can_fallback` 字段并执行回滚（兜底处理）

#### Scenario: 自动流转排除机制

- **WHEN** 节点执行完成后
- **THEN** 对于 UserTask 节点，不自动流转，保持当前节点状态
- **AND** 对于 IntermediateCatchEvent 节点，不自动流转，等待外部事件
- **AND** 对于 EventBasedGateway 节点，不自动流转，等待事件选择
- **AND** 对于其他节点类型，根据序列流和条件表达式自动流转到下一个节点
- **AND** 自动流转逻辑应在 `advanceToNextNode` 函数中实现

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

### Requirement: 聊天会话管理 API

系统 SHALL 提供聊天会话的 CRUD 操作，并持久化到数据库。

#### Scenario: 创建聊天会话

- **WHEN** 客户端发送 `POST /api/chat/conversations` 请求时
- **THEN** 系统应：
  - 生成UUID作为会话ID
  - 如果提供了 `title`，使用提供的标题；否则使用默认标题（如"新对话"）
  - 执行数据库INSERT操作到 `chat_conversations` 表
  - 设置 `created_at`、`updated_at` 和 `last_message_at` 为当前时间
- **AND** 成功响应应返回201状态码和会话数据

#### Scenario: 获取聊天会话列表

- **WHEN** 客户端发送 `GET /api/chat/conversations` 请求时
- **THEN** 系统应：
  - 支持查询参数：`page`（默认1）、`pageSize`（默认20）、`orderBy`（默认"updatedAt"）、`order`（默认"desc"）
  - 执行数据库SELECT查询，使用LIMIT和OFFSET实现分页
  - 执行COUNT查询获取总数
  - 按 `last_message_at DESC` 排序（默认）
- **AND** 响应应包含 `metadata` 字段和会话列表
- **AND** 每个会话应包含：`id`、`title`、`lastMessageAt`、`messageCount`（消息数量）

#### Scenario: 获取聊天会话详情

- **WHEN** 客户端发送 `GET /api/chat/conversations/:id` 请求时
- **THEN** 系统应：
  - 执行数据库SELECT查询获取会话信息
  - 关联查询该会话的所有消息，按 `sequence` 排序
  - 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回200状态码和会话数据（包含消息列表）

#### Scenario: 更新聊天会话

- **WHEN** 客户端发送 `PUT /api/chat/conversations/:id` 请求时
- **THEN** 系统应：
  - 更新会话的 `title` 字段（如果提供）
  - 更新 `updated_at` 时间戳
  - 执行数据库UPDATE操作
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回200状态码和更新后的会话数据

#### Scenario: 删除聊天会话

- **WHEN** 客户端发送 `DELETE /api/chat/conversations/:id` 请求时
- **THEN** 系统应：
  - 执行数据库DELETE操作
  - 级联删除关联的所有消息（使用 ON DELETE CASCADE）
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回200状态码

### Requirement: 聊天消息管理 API

系统 SHALL 提供聊天消息的创建和批量创建操作，并持久化到数据库。

#### Scenario: 添加聊天消息

- **WHEN** 客户端发送 `POST /api/chat/conversations/:id/messages` 请求时
- **THEN** 系统应：
  - 生成UUID作为消息ID
  - 验证会话存在
  - 获取会话中当前最大 `sequence` 值，新消息的 `sequence` 为该值加1
  - 将 `metadata` 序列化为JSONB格式（如果提供）
  - 执行数据库INSERT操作到 `chat_messages` 表
  - 更新会话的 `last_message_at` 和 `updated_at` 为当前时间
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回201状态码和消息数据

#### Scenario: 批量添加聊天消息

- **WHEN** 客户端发送 `POST /api/chat/conversations/:id/messages/batch` 请求时
- **THEN** 系统应：
  - 验证会话存在
  - 获取会话中当前最大 `sequence` 值
  - 为每条消息分配递增的 `sequence` 值
  - 使用事务批量插入所有消息
  - 更新会话的 `last_message_at` 和 `updated_at` 为当前时间
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 如果批量插入失败，回滚事务
- **AND** 成功响应应返回201状态码和消息列表

### Requirement: 聊天记录自动清理

系统 SHALL 自动清理 7 天前的聊天记录。

#### Scenario: 自动清理过期会话

- **WHEN** 系统执行自动清理任务时
- **THEN** 系统应：
  - 删除 `last_message_at < NOW() - INTERVAL '7 days'` 的所有会话
  - 级联删除关联的所有消息（使用 ON DELETE CASCADE）
  - 记录清理的会话数量和消息数量
  - 记录清理任务的执行时间和结果
- **AND** 清理任务应每 24 小时执行一次
- **AND** 清理任务应在后端服务启动时启动
- **AND** 如果清理任务执行失败，应记录错误日志但不影响服务运行

#### Scenario: 清理任务日志

- **WHEN** 清理任务执行完成时
- **THEN** 系统应记录：
  - 执行时间
  - 删除的会话数量
  - 删除的消息数量
  - 执行结果（成功/失败）
- **AND** 日志级别应为 INFO（成功）或 ERROR（失败）

### Requirement: 节点类型扩展支持

系统 SHALL 支持 IntermediateCatchEvent、EventBasedGateway、BoundaryEvent 节点类型的解析和执行。

#### Scenario: 解析 IntermediateCatchEvent 节点

- **WHEN** BPMN XML 包含中间捕获事件（`<bpmn:intermediateCatchEvent>`）时
- **THEN** 系统应解析节点 ID、名称、输入输出序列流
- **AND** 识别节点类型为 IntermediateCatchEvent
- **AND** 将节点添加到工作流定义中

#### Scenario: 解析 EventBasedGateway 节点

- **WHEN** BPMN XML 包含事件网关（`<bpmn:eventBasedGateway>`）时
- **THEN** 系统应解析节点 ID、名称、输入输出序列流
- **AND** 识别节点类型为 EventBasedGateway
- **AND** 将节点添加到工作流定义中

#### Scenario: 解析 BoundaryEvent 节点

- **WHEN** BPMN XML 包含边界事件（`<bpmn:boundaryEvent>`）时
- **THEN** 系统应解析节点 ID、名称、输入输出序列流
- **AND** 解析 `attachedToRef` 属性，获取 `attached_node_id`
- **AND** 识别节点类型为 BoundaryEvent
- **AND** 将节点添加到工作流定义中

### Requirement: 节点回滚属性支持

系统 SHALL 支持节点的回滚相关属性。

#### Scenario: 节点 can_fallback 属性

- **WHEN** 节点定义包含 `can_fallback` 属性时
- **THEN** 系统应解析 `can_fallback` 属性值（布尔类型）
- **AND** 如果未定义，默认值为 true（允许回滚）
- **AND** 在执行回滚前检查该属性

#### Scenario: 边界事件 attached_node_id 属性

- **WHEN** 边界事件节点定义包含 `attachedToRef` 属性时
- **THEN** 系统应解析 `attachedToRef` 属性值，作为 `attached_node_id`
- **AND** 在回滚判断时使用该属性

