# 设计文档：重构工作流执行器概念

## 架构概述

### 当前架构

```
Client
  ↓
WorkflowExecutionHandler (错误命名)
  ↓
WorkflowEngineService
  ↓
WorkflowExecution (model)
```

**问题：**
- `WorkflowExecutionHandler` 与 `WorkflowExecution` 命名冲突
- Handler 的职责是"执行"而非"执行记录"

### 目标架构

```
Client
  ↓
WorkflowExecutorHandler (修正命名)
  ↓
WorkflowEngineService
  ↓
WorkflowExecution (model)
```

**改进：**
- `WorkflowExecutorHandler` 表示执行器职责
- `WorkflowExecution` 表示执行记录
- 清晰的概念区分

## 命名重构方案

### 文件重命名

| 当前文件 | 新文件 | 说明 |
|---------|--------|------|
| `server/internal/handlers/workflow_execution.go` | `server/internal/handlers/workflow_executor.go` | Handler 实现 |
| `server/internal/handlers/workflow_execution_test.go` | `server/internal/handlers/workflow_executor_test.go` | Handler 测试 |

### 类型重命名

| 当前类型 | 新类型 | 说明 |
|---------|--------|------|
| `WorkflowExecutionHandler` | `WorkflowExecutorHandler` | Handler 结构体 |
| `NewWorkflowExecutionHandler` | `NewWorkflowExecutorHandler` | 构造函数 |

### 方法保持不变

- `ExecuteWorkflow()` - 方法名保持不变，表示执行操作

## current_node_ids 补全逻辑

### 问题分析

当前 `ExecuteFromNode` 流程：

```go
func (s *WorkflowEngineService) ExecuteFromNode(
    ctx context.Context,
    instanceId string,
    fromNodeId string,
    businessParams map[string]interface{},
) (*ExecuteResult, error) {
    // 1. 获取工作流实例
    instance, err := s.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)

    // 2. 获取工作流定义
    workflow, err := s.workflowSvc.GetWorkflowByID(ctx, instance.WorkflowId)

    // 3. 解析 BPMN XML
    wd, err := parser.ParseBPMN(workflow.BpmnXml)

    // 4. 验证 fromNodeId 是否存在
    node, exists := wd.Nodes[fromNodeId]

    // 问题：如果 instance.CurrentNodeIds 为空，
    // 后续的回滚检查 CheckAndHandleRollback 可能会出现问题
}
```

在获取实例后、执行回滚检查前，添加补全逻辑：

```go
func (s *WorkflowEngineService) ExecuteFromNode(
    ctx context.Context,
    instanceId string,
    fromNodeId string,
    businessParams map[string]interface{},
) (*ExecuteResult, error) {
    // 1. 获取工作流实例 (支持 Mock 实例和真实实例)
    var instance *models.WorkflowInstance
    var err error

    if isMockInstance(instanceId) {
        // Mock 实例逻辑
        mockInstance, err := s.mockInstanceSvc.GetMockInstance(ctx, instanceId)
        if err != nil {
            return nil, fmt.Errorf("%s: %w", models.ErrWorkflowInstanceNotFound, err)
        }
        instance = convertMockInstanceToWorkflowInstance(mockInstance)
    } else {
        // 真实实例逻辑
        instance, err = s.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)
        if err != nil {
            return nil, fmt.Errorf("%s: %w", models.ErrWorkflowInstanceNotFound, err)
        }
    }

    // 2. 获取工作流定义
    workflow, err := s.workflowSvc.GetWorkflowByID(ctx, instance.WorkflowId)
    if err != nil {
        return nil, fmt.Errorf("%s: %w", models.ErrWorkflowNotFound, err)
    }

    // 3. 解析 BPMN XML
    wd, err := parser.ParseBPMN(workflow.BpmnXml)
    if err != nil {
        s.logger.Error().Err(err).Str("workflowId", workflow.Id).Msg("Failed to parse BPMN XML")
        return nil, fmt.Errorf("failed to parse BPMN XML: %w", err)
    }

    // 3.5 补全 current_node_ids（新增逻辑）
    if len(instance.CurrentNodeIds) == 0 {
        if len(wd.StartEvents) == 0 {
            return nil, fmt.Errorf("workflow has no start events")
        }

        s.logger.Info().
            Str("instanceId", instanceId).
            Strs("startEvents", wd.StartEvents).
            Msg("Initializing current_node_ids with start events")

        // 更新实例的 current_node_ids
        if isMockInstance(instanceId) {
            // 更新 Mock 实例
            mockInstance, err := s.mockInstanceSvc.UpdateMockInstance(
                ctx,
                instanceId,
                instance.Status,
                wd.StartEvents,
                nil, // 不更新 variables
            )
            if err != nil {
                return nil, fmt.Errorf("failed to initialize mock instance current_node_ids: %w", err)
            }
            instance = convertMockInstanceToWorkflowInstance(mockInstance)
        } else {
            // 更新真实实例
            instance, err = s.instanceSvc.UpdateWorkflowInstance(
                ctx,
                instanceId,
                instance.Status,
                wd.StartEvents,
            )
            if err != nil {
                return nil, fmt.Errorf("failed to initialize current_node_ids: %w", err)
            }
        }
    }

    // 4. 验证 fromNodeId 是否存在
    node, exists := wd.Nodes[fromNodeId]
    if !exists {
        return nil, fmt.Errorf("%s: node %s not found in workflow definition", models.ErrInvalidNodeId, fromNodeId)
    }

    // 4.5 检查并处理回滚（现在 instance.CurrentNodeIds 保证不为空）
    rollbackAction, err := s.CheckAndHandleRollback(wd, &node, instance.CurrentNodeIds)
    // ... 后续逻辑
}
```

### 设计决策

#### 1. 何时补全？

**选项 A：在创建实例时补全**
- 优点：实例创建时就处于正确状态
- 缺点：需要解析 BPMN，创建实例时还不一定有 BPMN

**选项 B：在首次执行时补全（采用）**
- 优点：延迟到真正需要时，避免不必要的 BPMN 解析
- 缺点：首次执行时有额外开销

**决策：采用选项 B**，因为：
- 实例创建时可能只有工作流 ID，BPMN 可能动态加载
- 补全逻辑与执行逻辑内聚性更高
- 性能开销可接受（只在首次执行时发生）

#### 2. 多起始事件处理

BPMN 2.0 支持多个起始事件，`StartEvents` 是数组类型。

**处理策略：**
- 将所有 `StartEvents` 都加入 `current_node_ids`
- 执行时会从 `fromNodeId` 开始，其他起始事件保持在 `current_node_ids` 中
- 符合 BPMN 语义（多个并行的起始点）

#### 3. Mock 实例处理

由于系统同时支持 Mock 实例和真实实例，补全逻辑需要处理两种情况：

```go
if isMockInstance(instanceId) {
    // 更新 Mock 实例
    mockInstance, err := s.mockInstanceSvc.UpdateMockInstance(...)
    instance = convertMockInstanceToWorkflowInstance(mockInstance)
} else {
    // 更新真实实例
    instance, err = s.instanceSvc.UpdateWorkflowInstance(...)
}
```

#### 4. 错误处理

如果工作流没有起始事件（不符合 BPMN 规范）：

```go
if len(wd.StartEvents) == 0 {
    return nil, fmt.Errorf("workflow has no start events")
}
```

这是合理的错误，因为没有起始事件的工作流无法执行。

## 执行记录创建逻辑

### 问题分析

当前实现使用 `getOrCreateExecution` 方法：

```go
func (s *WorkflowEngineService) getOrCreateExecution(
    ctx context.Context,
    instanceId string,
    workflowId string,
    instanceVersion int,
) (*models.WorkflowExecution, error) {
    // 尝试获取最新的执行记录
    executions, _, err := s.executionSvc.ListWorkflowExecutions(ctx, 1, 1, instanceId, "", "")
    if err != nil {
        return nil, err
    }

    if len(executions) > 0 {
        // 使用最新的执行记录（问题：会复用旧的记录）
        return &executions[0], nil
    }

    // 创建新的执行记录
    return s.executionSvc.CreateWorkflowExecution(ctx, instanceId, workflowId, make(map[string]interface{}))
}
```

**问题**：
1. 每次调用 `ExecuteFromNode` 可能复用旧的执行记录
2. 执行记录的状态转换不明确
3. 无法跟踪每次执行的完整生命周期

### 解决方案

修改 `ExecuteFromNode` 方法，每次调用都创建新的执行记录：

```go
func (s *WorkflowEngineService) ExecuteFromNode(
    ctx context.Context,
    instanceId string,
    fromNodeId string,
    businessParams map[string]interface{},
) (*ExecuteResult, error) {
    // ... 前置逻辑 ...

    // 5. 创建执行记录（状态：Running）
    var execution *models.WorkflowExecution
    if isMockInstance(instanceId) {
        // Mock 实例：创建内存执行记录
        execution = &models.WorkflowExecution{
            Id:               fmt.Sprintf("mock-exec-%d", time.Now().UnixNano()),
            InstanceId:       instanceId,
            WorkflowId:       workflow.Id,
            Status:           models.ExecutionStatusRunning,  // Running 状态
            Variables:        businessParams,
            ExecutionVersion: 1,
            StartedAt:        time.Now(),
        }
    } else {
        // 真实实例：创建数据库执行记录
        execution, err = s.executionSvc.CreateWorkflowExecution(
            ctx,
            instanceId,
            workflow.Id,
            businessParams,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to create execution: %w", err)
        }

        // 立即更新状态为 Running
        execution, err = s.executionSvc.UpdateWorkflowExecution(
            ctx,
            execution.Id,
            models.ExecutionStatusRunning,  // Running 状态
            execution.Variables,
            "",
        )
        if err != nil {
            return nil, fmt.Errorf("failed to update execution status to running: %w", err)
        }
    }

    // 6. 执行节点
    var businessResponse *BusinessResponse
    var executionErr error

    // ... 执行节点逻辑 ...

    // 7. 更新执行状态（成功或失败）
    if isMockInstance(instanceId) {
        // Mock 实例：更新内存状态
        if executionErr != nil {
            execution.Status = models.ExecutionStatusFailed
            execution.ErrorMessage = executionErr.Error()
        } else {
            execution.Status = models.ExecutionStatusCompleted
        }
        execution.CompletedAt = time.Now()
    } else {
        // 真实实例：更新数据库状态
        if executionErr != nil {
            _, err = s.executionSvc.UpdateWorkflowExecution(
                ctx,
                execution.Id,
                models.ExecutionStatusFailed,  // Failed 状态
                execution.Variables,
                executionErr.Error(),
            )
        } else {
            _, err = s.executionSvc.UpdateWorkflowExecution(
                ctx,
                execution.Id,
                models.ExecutionStatusCompleted,  // Completed 状态
                execution.Variables,
                "",
            )
        }
        if err != nil {
            s.logger.Error().Err(err).Msg("Failed to update execution final status")
        }
    }

    // ... 返回结果 ...
}
```

### 设计决策

#### 1. 每次执行都创建新记录

**选项 A：复用最新的执行记录**
- 优点：减少数据库写入
- 缺点：无法跟踪每次执行，状态混淆

**选项 B：每次都创建新记录（采用）**
- 优点：完整的执行历史，状态清晰
- 缺点：数据库写入增加

**决策：采用选项 B**，因为：
- 每次执行都是独立的事件，应该有独立的记录
- 有利于审计和调试
- 可以查看执行历史和趋势
- 数据库写入性能可接受

#### 2. 状态转换流程

```
CreateWorkflowExecution
    ↓
status = Pending
    ↓
UpdateWorkflowExecution (立即)
    ↓
status = Running
    ↓
[执行节点]
    ↓
UpdateWorkflowExecution (完成后)
    ↓
status = Completed / Failed
```

**注意**：Mock 实例跳过数据库操作，直接在内存中管理状态。

#### 3. 变量传递

- `businessParams` 作为初始变量传递给 `CreateWorkflowExecution`
- 执行过程中更新 `execution.Variables`
- 最终状态包含完整的执行上下文

#### 4. 错误处理

执行过程中的错误处理：

```go
// 执行节点时捕获错误
businessResponse, executionErr := s.executeServiceTask(...)

// 在最后统一更新状态
if executionErr != nil {
    // 更新为 Failed
    UpdateWorkflowExecution(ctx, executionId, ExecutionStatusFailed, variables, executionErr.Error())
    return nil, executionErr  // 返回错误
} else {
    // 更新为 Completed
    UpdateWorkflowExecution(ctx, executionId, ExecutionStatusCompleted, variables, "")
}
```

### 与 current_node_ids 补全的关系

两个逻辑的执行顺序：

```
1. 获取工作流实例
2. 解析 BPMN
3. 补全 current_node_ids（如果为空）
4. 验证 fromNodeId
5. 回滚检查
6. 创建执行记录（Running）  ← 新增
7. 执行节点
8. 更新执行记录（Completed/Failed）  ← 新增
9. 更新实例状态
10. 返回结果
```

## 数据流图

### 补全 current_node_ids 流程

```
ExecuteFromNode 调用
    ↓
获取 WorkflowInstance
    ↓
检查 current_node_ids 是否为空？
    ↓ 是
获取 WorkflowDefinition
    ↓
解析 BPMN
    ↓
提取 StartEvents
    ↓
更新 instance.current_node_ids = StartEvents
    ↓
持久化到数据库
    ↓ 否（直接跳到这里）
继续执行流程（回滚检查等）
```

## 测试策略

### 1. 命名重构测试

- 运行现有的所有测试用例
- 验证编译通过
- 验证 HTTP 端点正常工作

### 2. 补全逻辑测试

**测试用例：**

#### Test: 首次执行自动补全 current_node_ids

```go
func TestExecuteFromNode_AutoInitializeCurrentNodeIds(t *testing.T) {
    // 创建实例（current_node_ids 为空）
    instance := createInstanceWithEmptyCurrentNodeIds()

    // 执行工作流
    result, err := engineSvc.ExecuteFromNode(ctx, instance.Id, "StartEvent_1", nil)

    // 验证
    assert.NoError(t, err)
    assert.NotNil(t, result)

    // 验证 current_node_ids 已补全
    updatedInstance := getInstanceFromDB(instance.Id)
    assert.NotEmpty(t, updatedInstance.CurrentNodeIds)
    assert.Contains(t, updatedInstance.CurrentNodeIds, "StartEvent_1")
}
```

#### Test: 已有 current_node_ids 不被覆盖

```go
func TestExecuteFromNode_PreserveExistingCurrentNodeIds(t *testing.T) {
    // 创建实例（current_node_ids 已设置）
    instance := createInstanceWithCurrentNodeIds([]string{"ServiceTask_1"})

    // 执行工作流
    result, err := engineSvc.ExecuteFromNode(ctx, instance.Id, "ServiceTask_1", nil)

    // 验证
    assert.NoError(t, err)

    // 验证 current_node_ids 未被修改
    updatedInstance := getInstanceFromDB(instance.Id)
    assert.Equal(t, []string{"ServiceTask_1"}, updatedInstance.CurrentNodeIds)
}
```

#### Test: 工作流无起始事件时返回错误

```go
func TestExecuteFromNode_NoStartEvents_ReturnsError(t *testing.T) {
    // 创建无起始事件的工作流
    workflow := createWorkflowWithoutStartEvents()
    instance := createInstance(workflow.Id)

    // 执行工作流
    result, err := engineSvc.ExecuteFromNode(ctx, instance.Id, "ServiceTask_1", nil)

    // 验证
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "no start events")
}
```

#### Test: Mock 实例补全逻辑

```go
func TestExecuteFromNode_MockInstance_AutoInitializeCurrentNodeIds(t *testing.T) {
    // 创建 Mock 实例（current_node_ids 为空）
    mockInstance := createMockInstanceWithEmptyCurrentNodeIds()

    // 执行工作流
    result, err := engineSvc.ExecuteFromNode(ctx, mockInstance.Id, "StartEvent_1", nil)

    // 验证
    assert.NoError(t, err)
    assert.NotNil(t, result)

    // 验证 Mock 实例的 current_node_ids 已补全
    updatedMockInstance := getMockInstanceFromStore(mockInstance.Id)
    assert.NotEmpty(t, updatedMockInstance.CurrentNodeIds)
}
```

## 向后兼容性

### API 兼容性

✅ **完全兼容**
- HTTP 端点路径不变
- 请求/响应格式不变
- 仅内部实现调整

### 数据兼容性

✅ **完全兼容**
- 已存在的实例不受影响（current_node_ids 非空）
- 新逻辑仅在 current_node_ids 为空时生效
- 不修改数据库 schema

### 代码兼容性

⚠️ **需要更新导入**
- 其他包导入 `handlers.WorkflowExecutionHandler` 的地方需要更新为 `handlers.WorkflowExecutorHandler`
- 通过编译检查可以发现所有需要更新的地方

## 性能影响

### 命名重构
- **性能影响：无**
- 仅编译时影响，运行时无差异

### 补全逻辑
- **额外开销：首次执行时一次数据库更新**
- **影响范围：仅 current_node_ids 为空的实例**
- **性能影响：极小**（大部分实例只触发一次）

## 安全性考虑

### 1. 空起始事件检查

```go
if len(wd.StartEvents) == 0 {
    return nil, fmt.Errorf("workflow has no start events")
}
```

防止无效工作流执行。

### 2. 并发安全

当前实现在事务中更新实例，保证并发安全。

## 监控和日志

### 添加日志

```go
s.logger.Info().
    Str("instanceId", instanceId).
    Strs("startEvents", wd.StartEvents).
    Msg("Initializing current_node_ids with start events")
```

### 监控指标（可选）

- `workflow_executor_current_node_ids_initialized_total` - 补全次数计数器
- `workflow_executor_current_node_ids_initialization_duration` - 补全操作耗时

## 文档更新

需要更新的文档：
1. API 文档（如果有）
2. 架构文档（反映新的命名）
3. 开发者指南（说明补全逻辑）

## 回滚计划

如果发现问题，可以快速回滚：

1. **命名重构**：通过 Git revert 恢复文件重命名
2. **补全逻辑**：注释掉补全代码块，恢复原有行为

由于变更范围小且隔离，回滚风险低。
