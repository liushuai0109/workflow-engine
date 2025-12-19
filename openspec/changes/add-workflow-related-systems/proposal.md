# 变更：添加工作流关联系统字段

## Why

当前工作流模型缺少与其他系统集成的元数据字段。在实际业务场景中，工作流通常需要与多个外部系统交互（如 CRM、支付系统、消息推送服务等），需要记录这些关联关系以便：

1. **系统集成管理**：明确工作流依赖哪些外部系统
2. **影响分析**：当外部系统变更时，快速识别受影响的工作流
3. **运维监控**：跟踪系统集成状态和同步时间
4. **文档化**：自动生成系统依赖文档

## What Changes

### 1. 数据模型扩展
- 在 `Workflow` 接口中添加 `relatedSystems` 字段
- 定义 `RelatedSystem` 接口，包含系统ID、名称、角色、集成类型等元数据
- 数据库 schema 添加 `related_systems` JSONB 字段

### 2. API 扩展
- 工作流创建/更新 API 支持 `relatedSystems` 字段
- 工作流查询 API 返回关联系统信息
- 支持按关联系统筛选工作流

### 3. 前端界面（可选，后续实现）
- 在工作流属性面板显示关联系统列表
- 支持添加/编辑/删除关联系统
- 显示系统集成状态和最后同步时间

## Impact

- **受影响的规范**：
  - `workflow-editor` - 添加关联系统管理需求
  - `backend-server` - 扩展工作流 API 支持关联系统字段
- **受影响的代码**：
  - `packages/server-nodejs/src/types/index.ts` - 添加 `RelatedSystem` 接口
  - `packages/server-nodejs/src/services/WorkflowService.ts` - 支持关联系统字段
  - `packages/server-go/internal/models/workflow.go` - Go 实现对应类型
  - 数据库迁移脚本 - 添加 `related_systems` 字段
- **数据影响**：
  - 现有工作流的 `related_systems` 字段默认为空数组 `[]`
  - 向后兼容，不影响现有功能
- **用户影响**：
  - 工作流创建/编辑时可以指定关联系统
  - 可以通过关联系统筛选和查询工作流
  - 提升系统集成管理的可追溯性

