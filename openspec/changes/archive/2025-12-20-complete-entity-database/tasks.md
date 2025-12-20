# 任务清单

## 阶段1：实体设计完善

- [x] 1.1 对比模型定义和数据库schema文档，识别不一致之处
- [x] 1.2 更新 `Workflow` 模型：将 `XML` 字段重命名为 `BpmnXml`，确保Go字段名与数据库字段名 `bpmn_xml` 语义一致
- [x] 1.3 检查并添加缺失的模型字段（如 `lifecycle_stages`、`current_lifecycle_stage`）
- [x] 1.4 创建 `WorkflowInstance` 模型（`server/internal/models/workflow_instance.go`）
  - [x] 包含 `CurrentNodeIds []string` 字段（数组类型，注意命名：Ids而非IDs）
  - [x] 包含 `InstanceVersion int` 字段
  - [x] **不包含** `Variables` 字段（变量应在执行层面管理）
  - [x] 字段命名遵循驼峰：`Id`、`WorkflowId`（而非ID、WorkflowID）
- [x] 1.5 创建 `WorkflowExecution` 模型（`server/internal/models/workflow_execution.go`）
  - [x] 包含 `InstanceId string` 字段（关联到实例，注意命名：Id而非ID）
  - [x] 包含 `WorkflowId string` 字段（注意命名：Id而非ID）
  - [x] 包含 `ExecutionVersion int` 字段
  - [x] **不包含** `UserId` 字段（用户信息应在实例层面管理）
  - [x] **不包含** `CurrentNodeId` 字段（已移至实例表）
  - [x] 字段命名遵循驼峰：`Id`、`InstanceId`、`WorkflowId`（而非ID、InstanceID、WorkflowID）
- [x] 1.6 验证所有时间戳字段的映射（`created_at`、`updated_at`）
- [x] 1.7 为JSONB字段添加序列化/反序列化辅助方法（如需要）

## 阶段2：数据库迁移

- [x] 2.1 安装或集成数据库迁移工具（`golang-migrate`）
- [x] 2.2 创建 `server/migrations/` 目录
- [x] 2.3 创建初始schema迁移脚本（基于 `docs/backend/database-schema.md`）
  - [x] 2.3.1 `users` 表
  - [x] 2.3.2 `workflows` 表
  - [x] 2.3.3 `workflow_instances` 表
    - [x] 包含 `current_node_ids VARCHAR(255)[]` 字段（数组类型）
    - [x] 包含 `instance_version INTEGER` 字段（默认值1）
    - [x] **不包含** `variables` 字段（变量应在执行层面管理）
  - [x] 2.3.4 `workflow_executions` 表
    - [x] 包含 `instance_id UUID` 字段（外键关联到 `workflow_instances`）
    - [x] 包含 `execution_version INTEGER` 字段
    - [x] **不包含** `user_id` 字段（用户信息应在实例层面管理）
    - [x] **移除** `current_node_id` 字段（已移至实例表）
  - [x] 2.3.5 索引创建
  - [x] 2.3.6 约束定义（外键、检查约束等）
- [x] 2.4 创建down迁移脚本（用于回滚）
- [x] 2.5 添加迁移命令到Makefile或脚本
- [ ] 2.6 在测试环境验证迁移脚本

## 阶段3：用户服务数据库实现

- [x] 3.1 实现 `CreateUser` 方法
  - [x] 3.1.1 生成UUID
  - [x] 3.1.2 序列化attributes为JSONB
  - [x] 3.1.3 执行INSERT查询
  - [x] 3.1.4 处理唯一约束冲突（email重复）
- [x] 3.2 实现 `GetUserByID` 方法
  - [x] 3.2.1 执行SELECT查询
  - [x] 3.2.2 反序列化JSONB attributes
  - [x] 3.2.3 处理记录不存在的情况
- [x] 3.3 实现 `UpdateUserAttributes` 方法
  - [x] 3.3.1 使用JSONB `||` 操作符合并attributes
  - [x] 3.3.2 更新 `updated_at` 时间戳
  - [x] 3.3.3 处理记录不存在的情况

## 阶段4：工作流服务数据库实现

- [x] 4.1 实现 `CreateWorkflow` 方法
  - [x] 4.1.1 生成UUID
  - [x] 4.1.2 执行INSERT查询（包含bpmn_xml字段）
  - [x] 4.1.3 设置默认值（version、status）
- [x] 4.2 实现 `GetWorkflowByID` 方法
  - [x] 4.2.1 执行SELECT查询
  - [x] 4.2.2 处理记录不存在的情况
- [x] 4.3 实现 `UpdateWorkflow` 方法
  - [x] 4.3.1 执行UPDATE查询
  - [x] 4.3.2 更新 `updated_at` 时间戳
  - [x] 4.3.3 处理记录不存在的情况
- [x] 4.4 实现 `ListWorkflows` 方法
  - [x] 4.4.1 实现分页查询（LIMIT/OFFSET）
  - [x] 4.4.2 实现总数查询（用于metadata）
  - [x] 4.4.3 返回分页元数据

## 阶段4.5：工作流实例服务数据库实现

- [x] 4.5.1 创建 `WorkflowInstanceService`（`server/internal/services/workflow_instance.go`）
- [x] 4.5.2 实现 `CreateWorkflowInstance` 方法
  - [x] 生成UUID
  - [x] 初始化 `current_node_ids` 为空数组
  - [x] 设置 `instance_version` 为 1
  - [x] 执行INSERT查询（不包含variables字段）
  - [x] 处理外键约束（workflow_id）
- [x] 4.5.3 实现 `GetWorkflowInstanceByID` 方法
  - [x] 执行SELECT查询
  - [x] 处理记录不存在的情况
- [x] 4.5.4 实现 `UpdateWorkflowInstance` 方法
  - [x] 执行UPDATE查询
  - [x] 更新 `current_node_ids` 数组（如果提供）
  - [x] 递增 `instance_version`（自动递增）
  - [x] 更新 `updated_at` 时间戳
  - [x] **注意**：不更新variables字段（变量应在执行层面管理）

## 阶段4.6：工作流执行服务数据库实现

- [x] 4.6.1 创建 `WorkflowExecutionService`（`server/internal/services/workflow_execution.go`）
- [x] 4.6.2 实现 `CreateWorkflowExecution` 方法
  - [x] 生成UUID
  - [x] 验证 `instance_id` 和 `workflow_id` 存在
  - [x] 设置 `execution_version`（从实例的 `instance_version` 获取或默认为1）
  - [x] 执行INSERT查询（不包含user_id字段）
  - [x] 设置默认状态为 'pending'
  - [x] 处理外键约束（instance_id、workflow_id）
- [x] 4.6.3 实现 `GetWorkflowExecutionByID` 方法
  - [x] 执行SELECT查询
  - [x] 处理记录不存在的情况
- [x] 4.6.4 实现 `UpdateWorkflowExecution` 方法
  - [x] 执行UPDATE查询
  - [x] 更新状态、变量等
  - [x] **注意**：不更新 `current_node_ids`（应在实例层面更新）
  - [x] 处理完成时间（completed_at）
- [x] 4.6.5 实现 `ListWorkflowExecutions` 方法
  - [x] 实现分页查询
  - [x] 支持按instance_id、workflow_id、status过滤
  - [x] **不支持**按user_id过滤（用户信息应在实例层面查询）
  - [x] 返回分页元数据

## 阶段5：工作流服务数据库实现（原阶段4，已重命名）

- [ ] 4.1 实现 `CreateWorkflow` 方法
  - [ ] 4.1.1 生成UUID
  - [ ] 4.1.2 执行INSERT查询（包含bpmn_xml字段）
  - [ ] 4.1.3 设置默认值（version、status）
- [ ] 4.2 实现 `GetWorkflowByID` 方法
  - [ ] 4.2.1 执行SELECT查询
  - [ ] 4.2.2 处理记录不存在的情况
- [ ] 4.3 实现 `UpdateWorkflow` 方法
  - [ ] 4.3.1 执行UPDATE查询
  - [ ] 4.3.2 更新 `updated_at` 时间戳
  - [ ] 4.3.3 处理记录不存在的情况
- [ ] 4.4 实现 `ListWorkflows` 方法
  - [ ] 4.4.1 实现分页查询（LIMIT/OFFSET）
  - [ ] 4.4.2 实现总数查询（用于metadata）
  - [ ] 4.4.3 返回分页元数据

## 阶段6：错误处理（原阶段5，已重命名）

- [x] 5.1 添加PostgreSQL错误码处理
  - [x] 5.1.1 导入 `github.com/lib/pq`
  - [x] 5.1.2 实现错误码到业务错误码的映射
- [x] 5.2 更新错误响应，使用统一的错误码
- [x] 5.3 添加数据库连接错误的处理

## 阶段7：测试（原阶段6，已重命名）

- [x] 6.1 为UserService编写单元测试
  - [x] 6.1.1 测试CreateUser成功场景
  - [x] 6.1.2 测试CreateUser重复email场景
  - [x] 6.1.3 测试GetUserByID成功和失败场景
  - [x] 6.1.4 测试UpdateUserAttributes成功和失败场景
- [x] 7.2 为WorkflowService编写单元测试
  - [x] 6.2.1 测试CreateWorkflow成功场景
  - [x] 6.2.2 测试GetWorkflowByID成功和失败场景
  - [x] 6.2.3 测试UpdateWorkflow成功和失败场景
  - [x] 6.2.4 测试ListWorkflows分页功能
- [x] 7.3 为WorkflowInstanceService编写单元测试
  - [x] 测试CreateWorkflowInstance成功场景
  - [x] 测试GetWorkflowInstanceByID成功和失败场景
  - [x] 测试UpdateWorkflowInstance成功和失败场景
- [x] 7.4 为WorkflowExecutionService编写单元测试
  - [x] 测试CreateWorkflowExecution成功场景
  - [x] 测试GetWorkflowExecutionByID成功和失败场景
  - [x] 测试UpdateWorkflowExecution成功和失败场景
  - [x] 测试ListWorkflowExecutions分页和过滤功能
- [x] 7.5 编写集成测试
  - [x] 6.3.1 设置测试数据库（通过环境变量配置）
  - [x] 6.3.2 测试完整的CRUD流程（所有服务）
  - [x] 6.3.3 测试JSONB字段的序列化/反序列化（复杂嵌套结构）
- [x] 7.6 验证测试覆盖率（当前66.4%，所有核心功能已覆盖）

## 阶段8：文档和验证（原阶段7，已重命名）

- [ ] 7.1 更新API文档（如有）
- [x] 7.2 更新README，添加数据库迁移说明
- [x] 7.3 运行所有测试，确保通过（所有19个测试用例全部通过）
- [ ] 7.4 在开发环境验证数据库操作（需要实际数据库环境）
- [x] 7.5 代码审查和重构（已完成必要的修复和优化）

