# 变更：完成实体设计和数据库实现

## Why

当前后端服务虽然已经定义了数据模型和数据库连接基础设施，但存在以下问题：

1. **模型与数据库schema不匹配**：Go模型中的字段名（如 `XML`）与数据库schema中的字段名（如 `bpmn_xml`）不一致，导致无法正确映射
2. **数据库操作未实现**：服务层（`UserService`、`WorkflowService`）中的数据库操作都是TODO，目前返回mock数据
3. **缺少数据库迁移**：虽然有schema文档，但没有可执行的迁移脚本
4. **缺少数据库测试**：没有针对数据库操作的单元测试和集成测试

为了支持实际的数据持久化，需要：
- 完善实体设计，确保模型字段与数据库schema完全匹配
- 实现所有CRUD操作的数据库查询
- 创建数据库迁移脚本
- 添加数据库测试覆盖

## What Changes

### 1. 实体设计完善

- **对齐模型字段与数据库schema**：
  - `Workflow.XML` → 改为 `Workflow.BpmnXML`，数据库字段 `bpmn_xml`（Go字段名与数据库字段名语义一致）
  - 确保所有时间戳字段正确映射（Go: `CreatedAt`, DB: `created_at`）
  - 确保JSONB字段（如 `attributes`）正确处理
  - 所有字段遵循：Go使用PascalCase，数据库使用snake_case，JSON使用camelCase
- **添加缺失的模型字段**：
  - 根据schema文档检查是否有遗漏字段
  - 确保所有必需字段都有对应的模型定义
- **新增工作流实例和执行模型**：
  - 创建 `WorkflowInstance` 模型（对应 `workflow_instances` 表）
    - 包含 `CurrentNodeIds` 字段（数组类型，注意命名：Ids而非IDs）
    - 不包含 `Variables` 字段（变量应在执行层面管理）
  - 创建 `WorkflowExecution` 模型（对应 `workflow_executions` 表）
    - 包含 `InstanceId`、`WorkflowId` 字段（注意命名：Id而非ID）
    - 不包含 `UserId` 字段（用户信息应在实例层面管理）
  - 确保字段映射正确，Go字段名严格遵循驼峰命名（PascalCase）
- **完善模型方法**：
  - 添加数据库扫描和值绑定的辅助方法
  - 确保JSONB字段的序列化/反序列化正确

### 2. 数据库操作实现

- **用户服务数据库操作**：
  - `CreateUser`: 实现INSERT操作，生成UUID，处理JSONB attributes
  - `GetUserByID`: 实现SELECT查询，处理JSONB反序列化
  - `UpdateUserAttributes`: 实现UPDATE操作，合并attributes（使用JSONB操作符）
- **工作流服务数据库操作**：
  - `CreateWorkflow`: 实现INSERT操作，存储BPMN XML
  - `GetWorkflowByID`: 实现SELECT查询
  - `UpdateWorkflow`: 实现UPDATE操作
  - `ListWorkflows`: 实现分页查询，支持page和pageSize参数
- **工作流实例和执行服务数据库操作**：
  - `CreateWorkflowInstance`: 创建工作流实例
  - `GetWorkflowInstanceByID`: 查询工作流实例
  - `CreateWorkflowExecution`: 创建工作流执行记录
  - `GetWorkflowExecutionByID`: 查询工作流执行记录
  - `UpdateWorkflowExecution`: 更新工作流执行状态
  - `ListWorkflowExecutions`: 列出工作流执行记录（支持分页和过滤）
- **错误处理**：
  - 处理数据库连接错误
  - 处理唯一约束冲突（如email重复）
  - 处理记录不存在的情况
  - 返回适当的错误码

### 3. 数据库迁移

- **创建迁移脚本**：
  - 创建 `server/migrations/` 目录
  - 实现初始schema迁移脚本（基于 `docs/backend/database-schema.md`）
  - 包含 `workflow_instances` 和 `workflow_executions` 表的创建
  - 支持版本管理和回滚
- **迁移工具**：
  - 可以选择使用 `golang-migrate` 或 `sql-migrate`
  - 或实现简单的迁移脚本执行器

### 4. 数据库测试

- **单元测试**：
  - 为每个数据库操作方法编写测试
  - 使用测试数据库或mock
- **集成测试**：
  - 测试完整的CRUD流程
  - 测试错误场景（如重复email、不存在的记录等）
  - 测试JSONB字段的序列化/反序列化

## 影响

- **受影响的规范**：
  - `backend-server` - 添加数据库操作实现要求

- **受影响的代码**：
  - `server/internal/models/user.go` - 完善UserProfile模型
  - `server/internal/models/workflow.go` - 完善Workflow模型，确保字段映射正确
  - `server/internal/models/workflow_instance.go` - 新建WorkflowInstance模型
  - `server/internal/models/workflow_execution.go` - 新建WorkflowExecution模型
  - `server/internal/services/user.go` - 实现所有TODO的数据库操作
  - `server/internal/services/workflow.go` - 实现所有TODO的数据库操作
  - `server/internal/services/workflow_instance.go` - 新建工作流实例服务
  - `server/internal/services/workflow_execution.go` - 新建工作流执行服务
  - `server/pkg/database/database.go` - 可能需要添加辅助方法（如JSONB处理）
  - 新建 `server/migrations/` - 数据库迁移脚本

- **依赖**：
  - PostgreSQL 14+（已在schema文档中指定）
  - 可能需要添加数据库迁移库（如 `golang-migrate/migrate`）

- **BREAKING**: 无破坏性变更，这是功能完善

