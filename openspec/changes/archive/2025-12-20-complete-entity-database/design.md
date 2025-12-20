# 设计文档：完成实体设计和数据库实现

## 架构决策

### 1. 数据库访问模式

**决策**：使用原生 `database/sql` 和 `lib/pq`，而非ORM

**理由**：
- 项目已经使用 `lib/pq`，保持一致性
- 对于简单的CRUD操作，原生SQL更直观
- 避免引入ORM的复杂性和学习成本
- 更好的性能控制

**替代方案考虑**：
- GORM：功能强大但学习曲线陡峭
- sqlx：轻量级但当前需求不需要额外功能

### 2. 字段映射策略

**决策**：Go字段名与数据库字段名保持一致，使用snake_case命名

**实现方式**：
- Go字段使用PascalCase（如 `BpmnXML`），通过 `db` tag映射到snake_case数据库字段（如 `bpmn_xml`）
- JSON序列化使用camelCase（如 `bpmnXml`），通过 `json` tag定义
- 示例：
```go
type Workflow struct {
    BpmnXML string `json:"bpmnXml" db:"bpmn_xml"`  // Go: BpmnXML, JSON: bpmnXml, DB: bpmn_xml
}
```

**理由**：
- Go字段名和数据库字段名语义一致，便于理解和维护
- 遵循Go命名约定（PascalCase）和数据库命名约定（snake_case）
- JSON API使用camelCase，符合前端开发习惯
- 通过tag实现映射，保持代码清晰

### 3. JSONB字段处理

**决策**：使用PostgreSQL的JSONB操作符进行合并和查询

**实现方式**：
- 存储：使用 `json.Marshal` 转换为JSON字符串
- 读取：使用 `json.Unmarshal` 解析JSON字符串
- 更新：使用PostgreSQL的 `||` 操作符合并JSONB对象

**示例SQL**：
```sql
UPDATE users 
SET attributes = attributes || $1::jsonb
WHERE id = $2
```

### 4. UUID生成

**决策**：在应用层生成UUID，而非依赖数据库默认值

**理由**：
- 可以在插入前知道ID，便于日志和错误处理
- 更灵活，可以使用不同的UUID版本
- 测试时更容易控制

**实现**：使用 `github.com/google/uuid`

### 5. 数据库迁移策略

**决策**：使用 `golang-migrate/migrate` 库

**理由**：
- 成熟的迁移工具，广泛使用
- 支持版本管理和回滚
- 与PostgreSQL良好集成
- 命令行工具便于CI/CD集成

**迁移文件结构**：
```
server/migrations/
  ├── 000001_initial_schema.up.sql
  ├── 000001_initial_schema.down.sql
  └── ...
```

### 6. 错误处理模式

**决策**：使用PostgreSQL错误码进行错误分类

**实现**：
```go
import "github.com/lib/pq"

if err != nil {
    if pqErr, ok := err.(*pq.Error); ok {
        switch pqErr.Code {
        case "23505": // unique_violation
            return models.ErrDuplicateEmail
        case "23503": // foreign_key_violation
            return models.ErrForeignKeyViolation
        }
    }
}
```

**理由**：
- 精确识别数据库错误类型
- 返回适当的业务错误码
- 便于前端处理

### 7. 分页实现

**决策**：使用LIMIT和OFFSET实现分页

**SQL模式**：
```sql
SELECT * FROM workflows 
ORDER BY created_at DESC 
LIMIT $1 OFFSET $2
```

**理由**：
- 简单直接
- 对于当前数据量足够
- 如果未来需要优化，可以改为游标分页

## 数据模型映射

### UserProfile 映射

| Go字段 | JSON字段 | 数据库字段 | 类型 | 说明 |
|--------|----------|-----------|------|------|
| Id | id | id | UUID | 主键 |
| Email | email | email | VARCHAR(255) | 唯一约束 |
| Attributes | attributes | attributes | JSONB | 用户属性 |
| CreatedAt | createdAt | created_at | TIMESTAMP | 创建时间 |
| UpdatedAt | updatedAt | updated_at | TIMESTAMP | 更新时间 |

**注意**：当前schema文档中有 `current_lifecycle_stage` 字段，但模型中没有。需要确认是否添加或移除。

### Workflow 映射

| Go字段 | JSON字段 | 数据库字段 | 类型 | 说明 |
|--------|----------|-----------|------|------|
| Id | id | id | UUID | 主键 |
| Name | name | name | VARCHAR(255) | 工作流名称 |
| Description | description | description | TEXT | 描述 |
| BpmnXml | bpmnXml | bpmn_xml | TEXT | BPMN XML内容 |
| Version | version | version | VARCHAR(50) | 版本号 |
| Status | status | status | VARCHAR(50) | 状态 |
| CreatedBy | createdBy | created_by | UUID | 创建者ID |
| CreatedAt | createdAt | created_at | TIMESTAMP | 创建时间 |
| UpdatedAt | updatedAt | updated_at | TIMESTAMP | 更新时间 |

**注意**：
- Go字段名 `BpmnXML` 与数据库字段名 `bpmn_xml` 语义一致
- JSON字段使用camelCase `bpmnXml`，符合前端习惯
- schema中有 `lifecycle_stages VARCHAR(50)[]` 字段，但模型中没有。需要确认是否添加。

### WorkflowInstance 映射

| Go字段 | JSON字段 | 数据库字段 | 类型 | 说明 |
|--------|----------|-----------|------|------|
| Id | id | id | UUID | 主键 |
| WorkflowId | workflowId | workflow_id | UUID | 关联的工作流定义ID |
| Name | name | name | VARCHAR(255) | 实例名称 |
| Status | status | status | VARCHAR(50) | 实例状态 |
| CurrentNodeIds | currentNodeIds | current_node_ids | VARCHAR(255)[] | 当前节点ID列表（数组） |
| InstanceVersion | instanceVersion | instance_version | INTEGER | 实例版本号 |
| CreatedAt | createdAt | created_at | TIMESTAMP | 创建时间 |
| UpdatedAt | updatedAt | updated_at | TIMESTAMP | 更新时间 |

**注意**：
- `workflow_instances` 表用于表示工作流实例（基于工作流定义创建的实例），区别于 `workflow_executions`（执行记录）
- `CurrentNodeIds` 是字符串数组，表示当前实例所在的多个节点（支持并行执行）
- `InstanceVersion` 用于版本控制，每次更新实例时递增
- **已移除** `Variables` 字段（变量应在执行层面管理）

### WorkflowExecution 映射

| Go字段 | JSON字段 | 数据库字段 | 类型 | 说明 |
|--------|----------|-----------|------|------|
| Id | id | id | UUID | 主键 |
| InstanceId | instanceId | instance_id | UUID | 关联的工作流实例ID |
| WorkflowId | workflowId | workflow_id | UUID | 关联的工作流定义ID |
| Status | status | status | VARCHAR(50) | 执行状态 |
| Variables | variables | variables | JSONB | 执行变量 |
| ExecutionVersion | executionVersion | execution_version | INTEGER | 执行版本号 |
| StartedAt | startedAt | started_at | TIMESTAMP | 开始时间 |
| CompletedAt | completedAt | completed_at | TIMESTAMP | 完成时间（可为空） |
| ErrorMessage | errorMessage | error_message | TEXT | 错误消息（可为空） |

**注意**：
- `workflow_executions` 表用于记录工作流的执行历史
- `InstanceId` 关联到 `workflow_instances` 表，表示该执行属于哪个实例
- `ExecutionVersion` 用于版本控制，每次重新执行时递增
- Status 枚举值：pending, running, completed, failed, cancelled
- Variables 使用JSONB存储执行过程中的变量
- **已移除** `UserId` 字段（用户信息应在实例层面管理）
- **已移除** `CurrentNodeId` 字段，该字段已移至 `WorkflowInstance` 表

## 风险与缓解

### 风险1：模型与schema不一致

**风险**：如果模型字段与数据库schema不匹配，会导致查询失败

**缓解**：
- 仔细对比模型定义和schema文档
- 编写测试验证所有字段映射
- 在迁移脚本中明确字段定义

### 风险2：JSONB序列化性能

**风险**：频繁的JSON序列化/反序列化可能影响性能

**缓解**：
- 使用PostgreSQL的JSONB操作符进行合并，减少序列化次数
- 对于大对象，考虑缓存解析结果
- 监控性能，必要时优化

### 风险3：并发更新冲突

**风险**：多个请求同时更新同一记录的attributes可能导致数据丢失

**缓解**：
- 使用PostgreSQL的JSONB `||` 操作符进行原子合并
- 考虑使用乐观锁（version字段）或悲观锁

### 风险4：迁移失败

**风险**：数据库迁移脚本执行失败可能导致数据库状态不一致

**缓解**：
- 每个迁移脚本都提供down迁移
- 在测试环境充分测试迁移脚本
- 使用事务确保迁移的原子性

## 测试策略

### 单元测试

- 使用 `testify/mock` 或 `sqlmock` 模拟数据库
- 测试每个服务方法的成功和失败场景
- 验证JSONB序列化/反序列化

### 集成测试

- 使用测试PostgreSQL数据库
- 测试完整的CRUD流程
- 测试错误场景（重复email、不存在记录等）
- 测试并发更新

### 迁移测试

- 测试迁移脚本的up和down操作
- 验证迁移后的schema与模型匹配

