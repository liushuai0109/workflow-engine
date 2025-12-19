# 设计文档：工作流关联系统字段

## 架构决策

### 数据存储方案选择

**决策**：使用 JSONB 数组存储关联系统信息

**理由**：
1. **灵活性**：可以存储不同系统的不同元数据，无需频繁修改 schema
2. **查询性能**：PostgreSQL 的 JSONB 支持 GIN 索引，查询性能良好
3. **简化实现**：无需创建额外的关联表，减少 JOIN 查询
4. **扩展性**：未来可以轻松添加新的关联系统属性

**替代方案考虑**：
- **关联表方案**：规范化设计，但需要额外的 JOIN 查询，复杂度更高
- **简单数组方案**：只存储系统ID，但无法存储关联元数据

### 数据结构设计

```typescript
interface RelatedSystem {
  systemId: string              // 系统唯一标识（必填）
  systemName?: string          // 系统名称（可选，便于显示）
  role?: 'source' | 'target' | 'both'  // 关联角色
  integrationType?: 'api' | 'webhook' | 'event' | 'database' | 'queue'  // 集成类型
  enabled?: boolean            // 是否启用（默认 true）
  lastSyncAt?: Date            // 最后同步时间
  metadata?: Record<string, any>  // 其他元数据（灵活扩展）
}
```

**设计考虑**：
- `systemId` 作为必填字段，确保每个关联都有唯一标识
- `systemName` 作为冗余字段，避免频繁查询系统表
- `role` 区分数据流向，便于理解系统关系
- `integrationType` 标识集成方式，便于运维管理
- `metadata` 提供灵活扩展，支持未来需求

### 数据库 Schema

```sql
-- 添加字段
ALTER TABLE workflows 
ADD COLUMN related_systems JSONB DEFAULT '[]'::jsonb;

-- 创建索引支持查询
CREATE INDEX idx_workflows_related_systems 
ON workflows USING GIN (related_systems);

-- 创建函数索引支持按 systemId 查询
CREATE INDEX idx_workflows_related_system_ids 
ON workflows USING GIN (
  (related_systems->>'systemId')
);
```

**索引策略**：
- GIN 索引支持 JSONB 包含查询（`@>` 操作符）
- 函数索引支持按 `systemId` 快速查找

### API 设计

#### 请求示例

```json
// POST /api/workflows
{
  "name": "用户注册流程",
  "description": "新用户注册并激活",
  "bpmnXml": "...",
  "relatedSystems": [
    {
      "systemId": "crm-system-001",
      "systemName": "CRM 系统",
      "role": "target",
      "integrationType": "api",
      "enabled": true
    },
    {
      "systemId": "email-service-001",
      "systemName": "邮件服务",
      "role": "source",
      "integrationType": "webhook",
      "enabled": true
    }
  ]
}
```

#### 查询示例

```sql
-- 查找关联了特定系统的工作流
SELECT * FROM workflows 
WHERE related_systems @> '[{"systemId": "crm-system-001"}]'::jsonb;

-- 查找所有启用的关联系统
SELECT id, name, 
  jsonb_array_elements(related_systems) as system
FROM workflows
WHERE related_systems @> '[{"enabled": true}]'::jsonb;
```

## 实现细节

### TypeScript 类型定义

```typescript
// packages/server-nodejs/src/types/index.ts
export interface RelatedSystem {
  systemId: string
  systemName?: string
  role?: 'source' | 'target' | 'both'
  integrationType?: 'api' | 'webhook' | 'event' | 'database' | 'queue'
  enabled?: boolean
  lastSyncAt?: Date
  metadata?: Record<string, any>
}

export interface Workflow {
  id: string
  name: string
  description?: string
  bpmnXml: string
  version: string
  status: WorkflowStatus
  relatedSystems?: RelatedSystem[]  // 新增字段
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}
```

### Go 类型定义

```go
// packages/server-go/internal/models/workflow.go
type RelatedSystem struct {
    SystemID        string                 `json:"systemId" db:"system_id"`
    SystemName      *string                 `json:"systemName,omitempty" db:"system_name"`
    Role            *string                 `json:"role,omitempty" db:"role"`
    IntegrationType *string                 `json:"integrationType,omitempty" db:"integration_type"`
    Enabled         *bool                   `json:"enabled,omitempty" db:"enabled"`
    LastSyncAt      *time.Time              `json:"lastSyncAt,omitempty" db:"last_sync_at"`
    Metadata        map[string]interface{}  `json:"metadata,omitempty" db:"metadata"`
}

type Workflow struct {
    ID            string           `json:"id" db:"id"`
    Name          string           `json:"name" db:"name"`
    Description   *string          `json:"description,omitempty" db:"description"`
    BpmnXML      string           `json:"bpmnXml" db:"bpmn_xml"`
    Version       string           `json:"version" db:"version"`
    Status        string           `json:"status" db:"status"`
    RelatedSystems []RelatedSystem `json:"relatedSystems,omitempty" db:"related_systems"`
    CreatedBy     *string          `json:"createdBy,omitempty" db:"created_by"`
    CreatedAt     time.Time        `json:"createdAt" db:"created_at"`
    UpdatedAt     time.Time        `json:"updatedAt" db:"updated_at"`
}
```

## 验证和测试

### 数据验证规则

1. `systemId` 必填且非空
2. `role` 必须是 `'source' | 'target' | 'both'` 之一（如果提供）
3. `integrationType` 必须是预定义类型之一（如果提供）
4. `relatedSystems` 数组不应包含重复的 `systemId`

### 测试场景

1. **创建带关联系统的工作流**：验证数据正确保存
2. **更新关联系统**：验证 JSONB 字段正确更新
3. **查询关联系统**：验证索引查询性能
4. **按系统筛选工作流**：验证筛选功能
5. **数据迁移**：验证现有工作流默认值为空数组

## 后续优化方向

1. **系统注册表**：创建独立的系统注册表，统一管理系统信息
2. **集成状态监控**：实时监控系统集成状态，自动更新 `lastSyncAt`
3. **影响分析工具**：当系统变更时，自动识别受影响的工作流
4. **前端界面**：在工作流编辑器中可视化显示关联系统

