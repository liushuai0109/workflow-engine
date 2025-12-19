# 工作流编辑器规范（变更）

## ADDED Requirements

### Requirement: 工作流关联系统管理

工作流编辑器 SHALL 支持记录和管理工作流关联的外部系统信息。

#### Scenario: 创建工作流时指定关联系统

- **WHEN** 操作员通过 API 创建工作流
- **THEN** 请求体可以包含 `relatedSystems` 字段
- **AND** `relatedSystems` 是一个数组，每个元素包含：
  - `systemId`: 必填，系统唯一标识
  - `systemName`: 可选，系统名称
  - `role`: 可选，关联角色（'source' | 'target' | 'both'）
  - `integrationType`: 可选，集成类型（'api' | 'webhook' | 'event' | 'database' | 'queue'）
  - `enabled`: 可选，是否启用（默认 true）
  - `lastSyncAt`: 可选，最后同步时间
  - `metadata`: 可选，其他元数据
- **AND** 关联系统信息持久化在数据库的 `related_systems` JSONB 字段中
- **AND** 成功响应返回包含 `relatedSystems` 的工作流数据

#### Scenario: 更新工作流的关联系统

- **WHEN** 操作员通过 API 更新工作流
- **THEN** 请求体可以包含 `relatedSystems` 字段
- **AND** 更新后的 `relatedSystems` 完全替换原有值（非合并）
- **AND** 系统验证 `systemId` 必填且非空
- **AND** 系统验证 `role` 和 `integrationType` 必须是预定义的枚举值（如果提供）
- **AND** 成功响应返回更新后的工作流数据

#### Scenario: 查询工作流的关联系统

- **WHEN** 操作员通过 API 获取工作流详情
- **THEN** 响应包含 `relatedSystems` 字段
- **AND** 如果工作流没有关联系统，`relatedSystems` 为空数组 `[]`
- **AND** 关联系统信息按创建顺序返回

#### Scenario: 按关联系统筛选工作流

- **WHEN** 操作员通过 API 列出工作流
- **THEN** 支持查询参数 `systemId`
- **AND** 当提供 `systemId` 时，仅返回关联了该系统的工作流
- **AND** 筛选使用数据库 JSONB 索引，查询性能良好
- **AND** 响应包含匹配的工作流列表和分页元数据

#### Scenario: 关联系统数据验证

- **WHEN** 操作员创建或更新工作流时提供 `relatedSystems`
- **THEN** 系统验证每个关联系统对象的 `systemId` 字段必填且非空
- **AND** 如果提供 `role`，必须是 'source'、'target' 或 'both' 之一
- **AND** 如果提供 `integrationType`，必须是 'api'、'webhook'、'event'、'database' 或 'queue' 之一
- **AND** 如果验证失败，返回 400 错误和详细的验证错误信息

