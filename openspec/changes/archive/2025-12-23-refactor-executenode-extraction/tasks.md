# 任务列表：提取节点执行逻辑到 ExecuteNode 方法

## 当前状态

**Phase 1 已完成 - 后端核心重构**:
- ✅ Task 1: 定义 ExecuteNodeParams 结构体
- ✅ Task 2: 实现 ExecuteNode 方法
- ✅ Task 3: 更新 ExecuteFromNode 方法使用拦截器调用
- ✅ Task 4: 单元测试和验证
- ✅ Task 5: 集成测试验证
- ✅ Task 6: 代码审查和优化

## 后端实现

### 1. 定义 ExecuteNodeParams 结构体
- [x] 在 `server/internal/services/workflow_engine.go` 中添加结构体定义
- [x] 定义以下字段（按顺序）：
  - `NodeID string` - 节点ID（添加 `json:"nodeId" intercept:"id"` tags）
  - `Node *models.Node` - 节点对象（添加 `json:"node"` tag）
  - `BusinessParams map[string]interface{}` - 业务参数（添加 `json:"businessParams"` tag）
  - `Variables map[string]interface{}` - 流程变量（添加 `json:"variables"` tag）
  - `Execution *models.WorkflowExecution` - 执行上下文（添加 `json:"execution"` tag）
- [x] 结构体位置：放在其他 Params 结构体附近（第 59-66 行）
- [x] 验证：`go fmt` 和编译通过

### 2. 实现 ExecuteNode 方法
- [x] 创建方法签名：
  ```go
  func (s *WorkflowEngineService) ExecuteNode(
      ctx context.Context,
      params ExecuteNodeParams,
  ) (*BusinessResponse, error)
  ```
- [x] 从 `ExecuteFromNode` 复制节点执行逻辑（第 324-357 行）
- [x] 适配代码以使用 `params` 结构体字段：
  - `currentNodeId` → `params.NodeID`
  - `currentNode` → `params.Node`
  - `businessParams` → `params.BusinessParams`
  - `execution.Variables` → `params.Variables`
  - `execution` → `params.Execution`
- [x] 实现各节点类型的处理逻辑：
  - ServiceTask: 调用 `s.executeServiceTask`，更新 variables
  - UserTask: 记录日志，返回 nil
  - IntermediateCatchEvent: 记录日志，返回 nil
  - EventBasedGateway: 记录日志，返回 nil
  - ExclusiveGateway: 记录日志，返回 nil
  - EndEvent: 记录日志，返回 nil
  - default: 记录日志，返回 nil
- [x] 处理 ServiceTask 的错误情况：
  - 错误处理：调用 `s.updateExecutionStatus` 并返回错误
  - 成功处理：更新 `params.Execution.Variables["businessResponse"]`
- [x] 添加方法注释，说明功能和参数
- [x] 方法位置：放在 `executeServiceTask` 方法之后（约第 517 行之后）
- [x] 验证：编译通过，逻辑完整

### 3. 更新 ExecuteFromNode 方法使用拦截器调用
- [x] 定位 `ExecuteFromNode` 中的节点执行 switch-case（第 324-357 行）
- [x] 删除整个 switch-case 代码块（34 行）
- [x] 替换为拦截器调用：
  ```go
  // 6.1 执行当前节点（使用拦截器）
  businessResponse, err = interceptor.Intercept(ctx,
      "ExecuteNode",
      s.ExecuteNode,
      ExecuteNodeParams{
          NodeID:         currentNodeId,
          Node:           currentNode,
          BusinessParams: businessParams,
          Variables:      execution.Variables,
          Execution:      execution,
      },
  )
  if err != nil {
      s.logger.Error().Err(err).Str("nodeId", currentNodeId).Msg("Failed to execute node")
      s.updateExecutionStatus(ctx, execution, models.ExecutionStatusFailed, err.Error())
      return nil, fmt.Errorf("failed to execute node: %w", err)
  }
  ```
- [x] 确保错误处理逻辑正确
- [x] 验证：编译通过，保持原有功能不变

### 4. 单元测试和验证
- [x] 在 `server/internal/services/workflow_engine_test.go` 中添加测试
- [x] 测试 `ExecuteNode` 方法的不同节点类型：
  - ServiceTask 执行成功
  - ServiceTask 执行失败
  - UserTask 执行
  - IntermediateCatchEvent 执行
  - EventBasedGateway 执行
  - ExclusiveGateway 执行
  - EndEvent 执行
- [x] 测试拦截器集成：
  - Dry-run 模式记录 ExecuteNode 调用
  - Mock 模式返回模拟的业务响应
  - Record 模式执行并记录结果
- [x] 测试错误处理：
  - ServiceTask 失败时正确更新执行状态
  - 拦截器错误的降级处理
- [x] 运行完整测试套件：`cd server && make test`
- [x] 验证：所有测试通过，覆盖率 > 80%

### 5. 集成测试验证
- [x] 运行现有的工作流执行集成测试
- [x] 验证各节点类型的执行行为未改变
- [x] 验证拦截器功能正常工作
- [x] 验证错误场景处理正确
- [x] 验证：所有集成测试通过

### 6. 代码审查和优化
- [x] 运行 `go fmt` 格式化代码
- [x] 运行 `go vet` 检查代码问题
- [x] 检查日志输出的一致性
- [x] 检查错误消息的清晰度
- [x] 验证代码注释的完整性
- [x] 代码审查通过

## 依赖关系

- 任务 1 必须首先完成（定义参数结构体）
- 任务 2 依赖任务 1（实现方法需要参数结构体）
- 任务 3 依赖任务 2（调用点更新需要方法存在）
- 任务 4 依赖任务 1-3（测试需要完整实现）
- 任务 5 依赖任务 1-4（集成测试验证整体功能）
- 任务 6 可以与其他任务并行进行

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1 | 6 | 1-2 天 |  | 无 |

**总计**: 1-2 天

**任务分解**：
- Task 1 (定义结构体): 0.5 小时
- Task 2 (实现 ExecuteNode): 2-3 小时
- Task 3 (更新调用点): 1 小时
- Task 4 (单元测试): 2-3 小时
- Task 5 (集成测试): 1 小时
- Task 6 (代码审查): 0.5 小时

## 验收标准

- [x] `ExecuteNodeParams` 结构体定义完整，字段标签正确
- [x] `ExecuteNode` 方法实现完整，处理所有节点类型
- [x] `ExecuteFromNode` 方法通过拦截器调用 `ExecuteNode`
- [x] 单元测试覆盖率 > 80%，所有测试通过（7个新测试全部通过）
- [x] 集成测试全部通过，功能行为未改变
- [x] 代码格式化和静态检查通过
- [x] 拦截器功能（Dry-run、Mock、Record）正常工作
- [x] 错误处理逻辑正确，错误消息清晰
- [x] 代码结构改善，`ExecuteFromNode` 方法行数减少约20行
- [x] 代码审查通过，无阻塞性问题

## 回滚计划

如果重构出现问题，可以快速回滚：

1. **保留原有代码**：在开始重构前创建 Git 分支
2. **渐进式重构**：按任务顺序逐步进行，每个任务都确保测试通过
3. **回滚方式**：
   - 如果单元测试失败：修复问题或恢复到重构前状态
   - 如果集成测试失败：检查是否改变了行为逻辑，必要时回滚
   - 如果性能退化 > 5%：评估是否可以接受，否则优化或回滚

## 注意事项

1. **保持行为一致性**：重构不应改变任何功能行为，只是重新组织代码
2. **错误处理**：确保所有错误路径都正确处理，特别是 ServiceTask 的错误更新
3. **拦截器 ID**：`ExecuteNode` 的拦截器 ID 将基于 `NodeID`，确保唯一性
4. **性能考虑**：拦截器调用会增加微小开销（< 1%），但提供的灵活性值得
5. **测试优先**：在修改代码前先运行现有测试，确保基线正确
6. **渐进式提交**：每完成一个任务就提交代码，便于追踪和回滚
