# Mock 执行引擎迭代设计

## 架构概述

### 当前架构问题

当前的 Mock 执行引擎（`MockExecutor`）是独立实现的，直接解析 BPMN XML 并执行节点，与真实的执行引擎（`WorkflowEngineService`）分离。这导致：

1. Mock 和真实执行使用不同的代码路径，可能产生行为差异
2. Mock 无法完全模拟真实执行引擎的状态管理
3. Mock 实例数据与真实实例数据结构不一致

### 新架构设计

新的 Mock 执行引擎将：

1. **复用真实执行引擎**：Mock 执行调用 `WorkflowEngineService.ExecuteFromNode`，使用相同的执行逻辑
2. **Mock 数据层**：在服务调用层注入 Mock 数据，替代真实的外部 API 调用
3. **Mock 实例管理**：创建和管理 Mock 工作流实例，数据结构与真实实例一致

## 核心组件

### 1. Mock 工作流实例（MockWorkflowInstance）

```go
type MockWorkflowInstance struct {
    Id              string
    WorkflowId      string
    Status          string
    CurrentNodeIds  []string
    Variables       map[string]interface{}
    InstanceVersion int
    CreatedAt       time.Time
    UpdatedAt       time.Time
}
```

- 存储在内存中（`MockInstanceStore`）
- 数据结构与真实的 `WorkflowInstance` 一致
- 支持 CRUD 操作

### 2. Mock 执行配置（MockExecutionConfig）

```go
type MockExecutionConfig struct {
    ExecutionApi    string                 // 要模拟的执行接口，如 "POST /api/execute/:workflowInstanceId"
    WorkflowInstanceId string              // Mock 实例 ID（如果不存在则创建）
    FromNodeId      string                 // 起始节点 ID
    BusinessParams   map[string]interface{} // 业务参数
    NodeMockData     map[string]NodeMockData // 节点级别的 Mock 数据
}
```

### 3. Mock 执行引擎集成

```
MockExecutor
    ↓
WorkflowEngineService.ExecuteFromNode (真实执行引擎)
    ↓
ServiceTask 执行时 → MockServiceCaller (注入 Mock 响应)
    ↓
返回 Mock 结果
```

### 4. Mock 服务调用器（MockServiceCaller）

在 `WorkflowEngineService` 中，当执行 ServiceTask 时：
- 检查是否在 Mock 模式
- 如果在 Mock 模式，使用 `MockServiceCaller` 获取 Mock 响应
- 否则，调用真实的外部 API

## 数据流

### 启动 Mock 执行

1. 用户在前端选择执行接口（如 `POST /api/execute/:workflowInstanceId`）
2. 用户输入参数：
   - `workflowInstanceId`（可选，如果不存在则创建 Mock 实例）
   - `fromNodeId`（必填）
   - `businessParams`（可选）
3. 后端创建或获取 Mock 工作流实例
4. 调用 `WorkflowEngineService.ExecuteFromNode`（Mock 模式）
5. 执行引擎使用 Mock 数据执行节点
6. 返回执行结果，包含更新的实例状态

### 继续执行（下一步）

1. 用户点击"下一步"按钮
2. 前端发送请求，包含：
   - `executionId`（Mock 执行 ID）
   - `businessParams`（当前步骤的 Mock 参数）
3. 后端获取当前 Mock 实例状态
4. 从 `currentNodeIds` 获取下一个要执行的节点
5. 调用 `WorkflowEngineService.ExecuteFromNode`（Mock 模式）
6. 返回执行结果

## 实现细节

### Mock 模式标识

在 `WorkflowEngineService` 中添加 `mockMode` 标志：
- 通过上下文（context）传递 Mock 模式标识
- Mock 执行时，设置 `context.WithValue(ctx, "mockMode", true)`

### Mock 数据注入

在 `executeServiceTask` 方法中：
```go
if isMockMode(ctx) {
    mockData := getMockDataForNode(nodeId)
    return mockData, nil
} else {
    // 真实 API 调用
}
```

### Mock 实例存储

使用 `MockInstanceStore`（内存存储）：
- 支持创建、获取、更新、删除 Mock 实例
- Mock 实例 ID 使用前缀 `mock-instance-` 以区分真实实例

## 迁移策略

1. **保持向后兼容**：现有的 Mock 执行 API 继续工作
2. **渐进式迁移**：新的 Mock 执行方式作为可选功能
3. **统一接口**：最终目标是统一 Mock 和真实执行的代码路径

