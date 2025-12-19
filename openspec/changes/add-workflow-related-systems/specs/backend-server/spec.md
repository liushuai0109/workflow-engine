# 后端服务器规范（变更）

## MODIFIED Requirements

### Requirement: 工作流管理 API

系统 SHALL 提供 BPMN 工作流的 CRUD 操作，支持关联系统字段。

#### Scenario: 创建工作流

- **当** 客户端发送 `POST /api/workflows` 请求时
- **则** 请求体应包含：
  - `name`: 必填，字符串
  - `description`: 可选，字符串
  - `bpmnXml`: 必填，BPMN XML 字符串
  - `relatedSystems`: 可选，关联系统数组
- **并且** `relatedSystems` 数组中的每个对象应包含：
  - `systemId`: 必填，系统唯一标识
  - `systemName`: 可选，系统名称
  - `role`: 可选，'source' | 'target' | 'both'
  - `integrationType`: 可选，'api' | 'webhook' | 'event' | 'database' | 'queue'
  - `enabled`: 可选，布尔值（默认 true）
  - `lastSyncAt`: 可选，ISO 8601 日期时间字符串
  - `metadata`: 可选，JSON 对象
- **并且** 成功返回 201 状态码和工作流数据，包含 `relatedSystems` 字段
- **并且** 如果 `relatedSystems` 未提供，默认为空数组 `[]`

#### Scenario: 获取工作流

- **当** 客户端发送 `GET /api/workflows/:workflowId` 请求时
- **则** 返回工作流的完整信息，包括：
  - `id`, `name`, `description`, `bpmnXml`, `version`, `status`
  - `relatedSystems`: 关联系统数组（如果存在）
- **并且** 如果工作流没有关联系统，`relatedSystems` 为空数组 `[]`

#### Scenario: 列出工作流

- **当** 客户端发送 `GET /api/workflows` 请求时
- **则** 支持分页参数：`page`、`pageSize`
- **并且** 支持查询参数 `systemId`，用于筛选关联了指定系统的工作流
- **并且** 响应包含 `metadata` 字段：
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
- **并且** 每个工作流对象包含 `relatedSystems` 字段

#### Scenario: 更新工作流

- **当** 客户端发送 `PUT /api/workflows/:workflowId` 请求时
- **则** 请求体可以包含 `relatedSystems` 字段
- **并且** 如果提供 `relatedSystems`，将完全替换原有的关联系统列表（非合并）
- **并且** 系统验证 `relatedSystems` 中每个对象的 `systemId` 必填
- **并且** 系统验证 `role` 和 `integrationType` 的枚举值（如果提供）
- **并且** 成功返回 200 状态码和更新后的工作流数据

