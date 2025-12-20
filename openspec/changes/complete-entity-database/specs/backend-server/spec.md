# 后端服务器规范（变更）

## MODIFIED Requirements

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

## ADDED Requirements

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

