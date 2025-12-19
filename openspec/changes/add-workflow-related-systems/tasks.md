# 实施任务清单

## 1. 数据模型定义

- [ ] 1.1 在 `server/internal/models/workflow.go` 中添加 `RelatedSystem` 结构体
- [ ] 1.2 在 `Workflow` 结构体中添加 `RelatedSystems` 字段
- [ ] 1.4 验证类型定义与设计文档一致

## 2. 数据库迁移

- [ ] 2.1 创建数据库迁移脚本，添加 `related_systems JSONB` 字段
- [ ] 2.2 设置默认值为空数组 `'[]'::jsonb`
- [ ] 2.3 创建 GIN 索引 `idx_workflows_related_systems`
- [ ] 2.4 创建函数索引 `idx_workflows_related_system_ids`（按 systemId 查询）
- [ ] 2.5 验证迁移脚本在开发环境执行成功
- [ ] 2.6 验证现有数据迁移后 `related_systems` 为空数组

## 3. Go 后端实现

- [ ] 3.1 在 `internal/models/workflow.go` 中实现 `RelatedSystem` 和 `Workflow` 结构体
- [ ] 3.2 实现 JSONB 序列化/反序列化（使用 `database/sql/driver` 接口）
- [ ] 3.3 更新 `WorkflowService.Create()` 支持 `relatedSystems` 字段
- [ ] 3.4 更新 `WorkflowService.Update()` 支持更新 `relatedSystems`
- [ ] 3.5 更新 `WorkflowService.Get()` 返回 `relatedSystems` 字段
- [ ] 3.6 实现按 `systemId` 筛选工作流的查询方法
- [ ] 3.7 添加数据验证逻辑
- [ ] 3.8 添加单元测试和集成测试

## 5. API 文档更新

- [ ] 5.1 更新 OpenAPI/Swagger 文档，添加 `relatedSystems` 字段说明
- [ ] 5.2 添加请求/响应示例
- [ ] 5.3 添加查询参数说明（按 systemId 筛选）

## 6. 测试和验证

- [ ] 6.1 编写端到端测试：创建带关联系统的工作流
- [ ] 6.2 编写端到端测试：更新关联系统
- [ ] 6.3 编写端到端测试：按系统筛选工作流
- [ ] 6.4 验证 API 响应格式正确
- [ ] 6.5 性能测试：验证 JSONB 索引查询性能
- [ ] 6.6 验证向后兼容性：现有工作流正常工作

## 7. 文档更新

- [ ] 7.1 更新 `docs/backend/database-schema.md` 添加 `related_systems` 字段说明
- [ ] 7.2 更新 API 文档说明关联系统字段的使用
- [ ] 7.3 添加使用示例和最佳实践

