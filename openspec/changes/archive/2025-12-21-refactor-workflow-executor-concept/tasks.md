# 任务清单

## 阶段 1: 命名重构 - workflow_execution → workflow_executor

### Task 1.1: 重命名 Handler 文件
- [ ] 将 `server/internal/handlers/workflow_execution.go` 重命名为 `workflow_executor.go`
- [ ] 将 `server/internal/handlers/workflow_execution_test.go` 重命名为 `workflow_executor_test.go`
- **验证**: 运行 `git status` 确认文件已重命名

### Task 1.2: 更新 Handler 结构体和函数名称
- [ ] 在 `workflow_executor.go` 中：
  - [ ] 重命名 `type WorkflowExecutionHandler` → `type WorkflowExecutorHandler`
  - [ ] 重命名 `func NewWorkflowExecutionHandler` → `func NewWorkflowExecutorHandler`
  - [ ] 更新注释文档
- **验证**: 运行 `grep -r "WorkflowExecutionHandler" server/internal/handlers/workflow_executor.go`，应无匹配

### Task 1.3: 更新测试文件中的引用
- [ ] 在 `workflow_executor_test.go` 中：
  - [ ] 更新所有 `NewWorkflowExecutionHandler` 调用为 `NewWorkflowExecutorHandler`
  - [ ] 更新测试函数名称（如果包含 `WorkflowExecution` 字样）
- **验证**: 运行 `go test ./server/internal/handlers -v -run TestWorkflowExecutor`

### Task 1.4: 更新路由配置
- [ ] 在 `server/internal/routes/routes.go` 中：
  - [ ] 更新 `handlers.NewWorkflowExecutionHandler` 为 `handlers.NewWorkflowExecutorHandler`
  - [ ] 更新变量名 `executionHandler` 为 `executorHandler`（可选，保持一致性）
- **验证**: 运行 `go build ./server/cmd/server`，确认编译通过

### Task 1.5: 检查其他引用
- [ ] 搜索并更新所有 `WorkflowExecutionHandler` 的引用
  - 运行: `rg "WorkflowExecutionHandler" server/`
  - 更新所有匹配的文件
- **验证**: 运行 `rg "WorkflowExecutionHandler" server/`，应无匹配（除了注释/文档）

### Task 1.6: 编译和测试验证
- [ ] 运行完整编译: `cd server && make build`
- [ ] 运行所有测试: `cd server && make test`
- [ ] 验证 API 端点: 启动服务器，调用 `POST /api/execute/:workflowInstanceId`
- **验证**: 所有测试通过，API 正常工作

---

## 阶段 2: 添加 current_node_ids 补全逻辑

### Task 2.1: 实现补全逻辑
- [ ] 在 `server/internal/services/workflow_engine.go` 的 `ExecuteFromNode` 方法中：
  - [ ] 在解析 BPMN 后添加 current_node_ids 检查
  - [ ] 如果 `len(instance.CurrentNodeIds) == 0`：
    - [ ] 检查 `len(wd.StartEvents) > 0`，否则返回错误
    - [ ] 添加日志记录
    - [ ] 区分 Mock 实例和真实实例
    - [ ] 调用相应的 UpdateInstance 方法更新 current_node_ids
    - [ ] 更新本地 instance 变量
- **验证**: 代码审查，确认逻辑正确
- [ ] 在补全逻辑中添加 Mock 实例分支：
  ```go
  if isMockInstance(instanceId) {
      mockInstance, err := s.mockInstanceSvc.UpdateMockInstance(
          ctx, instanceId, instance.Status, wd.StartEvents, nil,
      )
      instance = convertMockInstanceToWorkflowInstance(mockInstance)
  }
  ```
- **验证**: 代码审查

### Task 2.3: 处理真实实例场景
- [ ] 在补全逻辑中添加真实实例分支：
  ```go
  else {
      instance, err = s.instanceSvc.UpdateWorkflowInstance(
          ctx, instanceId, instance.Status, wd.StartEvents,
      )
  }
  ```
- **验证**: 代码审查

### Task 2.4: 添加错误处理
- [ ] 添加无起始事件检查：
  ```go
  if len(wd.StartEvents) == 0 {
      return nil, fmt.Errorf("workflow has no start events")
  }
  ```
- [ ] 添加更新失败错误处理
- [ ] 添加适当的错误日志
- **验证**: 代码审查

### Task 2.5: 添加日志记录
- [ ] 添加补全操作的 Info 级别日志：
  ```go
  s.logger.Info().
      Str("instanceId", instanceId).
      Strs("startEvents", wd.StartEvents).
      Msg("Initializing current_node_ids with start events")
  ```
- **验证**: 运行后检查日志输出

---

## 阶段 3: 修改执行记录创建逻辑

### Task 3.1: 移除 getOrCreateExecution 方法
- [ ] 删除 `server/internal/services/workflow_engine.go` 中的 `getOrCreateExecution` 方法
- [ ] 搜索并移除所有对该方法的调用
- **验证**: 运行 `grep -r "getOrCreateExecution" server/`，无匹配

### Task 3.2: 修改执行记录创建逻辑 - Mock 实例
- [ ] 在 `ExecuteFromNode` 方法中：
  - [ ] 移除 `getOrCreateExecution` 调用
  - [ ] 对 Mock 实例，直接创建内存执行记录，状态设置为 `ExecutionStatusRunning`
  - [ ] 设置 `StartedAt` 为当前时间
  - [ ] 添加日志记录
- **验证**: 代码审查

### Task 3.3: 修改执行记录创建逻辑 - 真实实例
- [ ] 在 `ExecuteFromNode` 方法中：
  - [ ] 调用 `CreateWorkflowExecution` 创建新记录（状态为 Pending）
  - [ ] 立即调用 `UpdateWorkflowExecution` 更新状态为 `ExecutionStatusRunning`
  - [ ] 处理创建和更新过程中的错误
  - [ ] 添加日志记录
- **验证**: 代码审查

### Task 3.4: 实现执行完成后的状态更新
- [ ] 在 `ExecuteFromNode` 方法的末尾（返回结果前）：
  - [ ] 捕获执行过程中的错误
  - [ ] 对 Mock 实例：
    - [ ] 直接更新内存执行记录的 status
    - [ ] 设置 `CompletedAt` 时间
    - [ ] 如果有错误，设置 `ErrorMessage`
  - [ ] 对真实实例：
    - [ ] 调用 `UpdateWorkflowExecution` 更新最终状态
    - [ ] 成功时设置 `ExecutionStatusCompleted`
    - [ ] 失败时设置 `ExecutionStatusFailed` 和错误信息
  - [ ] 添加日志记录
- **验证**: 代码审查

### Task 3.5: 调整错误处理流程
- [ ] 修改执行节点的错误处理：
  - [ ] 不要立即返回错误
  - [ ] 先更新执行记录状态
  - [ ] 再返回错误给调用方
- [ ] 确保所有错误路径都更新了执行记录
- **验证**: 代码审查，测试错误场景

---

## 阶段 4: 测试

### Task 4.1: 添加单元测试 - 自动补全场景
- [ ] 在 `server/internal/services/workflow_engine_test.go` 中添加测试：
  - [ ] `TestExecuteFromNode_AutoInitializeCurrentNodeIds`
  - [ ] 创建 current_node_ids 为空的实例
  - [ ] 执行工作流
  - [ ] 验证 current_node_ids 已补全为 StartEvents
- **验证**: 运行 `go test -v -run TestExecuteFromNode_AutoInitializeCurrentNodeIds`

### Task 3.2: 添加单元测试 - 保留已有值场景
- [ ] 添加测试 `TestExecuteFromNode_PreserveExistingCurrentNodeIds`
  - [ ] 创建 current_node_ids 非空的实例
  - [ ] 执行工作流
  - [ ] 验证 current_node_ids 未被修改
- **验证**: 运行测试

### Task 3.3: 添加单元测试 - 无起始事件错误场景
- [ ] 添加测试 `TestExecuteFromNode_NoStartEvents_ReturnsError`
  - [ ] 创建无起始事件的工作流
  - [ ] 执行应返回错误
  - [ ] 验证错误消息包含 "no start events"
- **验证**: 运行测试

### Task 3.4: 添加单元测试 - Mock 实例场景
- [ ] 添加测试 `TestExecuteFromNode_MockInstance_AutoInitializeCurrentNodeIds`
  - [ ] 创建 Mock 实例（current_node_ids 为空）
  - [ ] 执行工作流
  - [ ] 验证 Mock 实例的 current_node_ids 已补全
- **验证**: 运行测试

### Task 4.8: 运行集成测试
- [ ] 运行现有的集成测试: `go test ./server/internal/services -v -run Integration`
- [ ] 确保所有测试通过
- **验证**: 测试输出全部 PASS

### Task 4.9: 手动测试
- [ ] 启动服务器
- [ ] 创建新的工作流实例（不设置 current_node_ids）
- [ ] 调用 `POST /api/execute/:instanceId` 执行工作流
- [ ] 验证：
  - [ ] 执行成功
  - [ ] 实例的 current_node_ids 已更新
  - [ ] 创建了新的执行记录
  - [ ] 执行记录状态为 Completed
  - [ ] 日志中有补全操作和执行记录创建记录
- **验证**: 检查响应和数据库状态

---

## 阶段 5: 文档更新

### Task 4.1: 更新实现文档
- [ ] 更新 `docs/EXECUTE_WORKFLOW_IMPLEMENTATION.md`：
  - [ ] 修改 Handler 名称为 `WorkflowExecutorHandler`
  - [ ] 添加 current_node_ids 补全逻辑说明
  - [ ] 更新时序图（如果需要）
- **验证**: 文档审查

### Task 4.2: 更新代码注释
- [ ] 在 `ExecuteFromNode` 方法上方添加注释说明补全逻辑
- [ ] 在补全代码块添加行内注释
- **验证**: 代码审查

### Task 4.3: 更新 CHANGELOG（如果有）
- [ ] 添加变更记录：
  - 重命名 WorkflowExecutionHandler 为 WorkflowExecutorHandler
  - 添加 current_node_ids 自动补全功能
- **验证**: 文档审查

---

## 阶段 5: 代码审查和发布

### Task 5.1: 自我代码审查
- [ ] 检查所有修改的文件
- [ ] 确认命名一致性
- [ ] 确认错误处理完整
- [ ] 确认日志记录合理
- **验证**: Code review checklist

### Task 5.2: 运行完整测试套件
- [ ] 运行所有单元测试: `make test`
- [ ] 运行所有集成测试
- [ ] 检查测试覆盖率
- **验证**: 所有测试通过，覆盖率未降低

### Task 5.3: 性能测试（可选）
- [ ] 基准测试 ExecuteFromNode 方法
- [ ] 对比补全逻辑前后的性能
- [ ] 确认性能影响可接受
- **验证**: Benchmark 结果

### Task 5.4: 提交代码
- [ ] 提交命名重构：`git commit -m "refactor: rename WorkflowExecutionHandler to WorkflowExecutorHandler"`
- [ ] 提交补全逻辑：`git commit -m "feat: auto-initialize current_node_ids with start events"`
- [ ] 或合并为一个提交
- **验证**: Git log

### Task 5.5: OpenSpec 归档
- [ ] 运行 `openspec validate refactor-workflow-executor-concept --strict`
- [ ] 修复所有验证错误
- [ ] 标记变更为完成
- **验证**: OpenSpec 验证通过

---

## 依赖关系

```
阶段 1 (命名重构)
  ↓
阶段 2 (补全逻辑)
  ↓
阶段 3 (测试)
  ↓
阶段 4 (文档)
  ↓
阶段 5 (发布)
```

- 阶段 1 必须先完成，因为文件重命名会影响后续开发
- 阶段 2 可以在阶段 1 完成后立即开始
- 阶段 3 的测试依赖阶段 2 的实现
- 阶段 4 可以与阶段 3 并行进行
- 阶段 5 需要所有前置阶段完成

## 可并行化的任务

- Task 3.1-3.4（单元测试可以并行编写）
- Task 4.1-4.3（文档更新可以并行进行）

## 估计工作量

- **阶段 1 (命名重构)**: 1-2 小时
- **阶段 2 (补全逻辑)**: 2-3 小时
- **阶段 3 (测试)**: 3-4 小时
- **阶段 4 (文档)**: 1-2 小时
- **阶段 5 (发布)**: 1 小时

**总计**: 8-12 小时
