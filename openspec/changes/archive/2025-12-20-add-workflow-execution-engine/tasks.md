# 实施任务清单

## 1. 工作流执行引擎服务实现

- [x] 1.1 创建 `WorkflowEngineService` 结构体和构造函数
- [x] 1.2 实现 `ExecuteFromNode` 方法：
  - [x] 1.2.1 获取工作流实例和定义
  - [x] 1.2.2 解析 BPMN XML 为 `WorkflowDefinition`
  - [x] 1.2.3 验证 `fromNodeId` 是否存在
  - [x] 1.2.4 根据节点类型执行相应逻辑
- [x] 1.3 实现节点执行逻辑：
  - [x] 1.3.1 ServiceTask 执行（调用业务接口）
  - [x] 1.3.2 UserTask 处理（返回待处理状态）
  - [x] 1.3.3 Gateway 处理（条件判断、并行等待）
  - [x] 1.3.4 EndEvent 处理（标记完成）
- [x] 1.4 实现流程推进逻辑：
  - [x] 1.4.1 查找下一个节点（根据序列流和条件）
  - [x] 1.4.2 更新实例的 `current_node_ids`
  - [x] 1.4.3 更新实例状态
- [x] 1.5 实现执行记录管理：
  - [x] 1.5.1 创建或更新执行记录
  - [x] 1.5.2 存储业务接口响应到 `variables`

## 2. 业务接口调用实现

- [x] 2.1 扩展 BPMN 解析器支持 ServiceTask 扩展属性（业务接口 URL）
- [x] 2.2 实现 HTTP 客户端调用业务接口
- [x] 2.3 处理业务接口请求和响应：
  - [x] 2.3.1 构建 HTTP 请求（URL、方法、请求体）
  - [x] 2.3.2 发送请求并获取响应
  - [x] 2.3.3 解析响应体
- [x] 2.4 错误处理：
  - [x] 2.4.1 网络错误处理
  - [x] 2.4.2 HTTP 错误状态码处理
  - [x] 2.4.3 超时处理

## 3. 条件表达式评估

- [x] 3.1 选择表达式评估库（如 `github.com/expr-lang/expr`）
- [x] 3.2 实现条件表达式评估：
  - [x] 3.2.1 解析条件表达式
  - [x] 3.2.2 注入工作流变量作为上下文
  - [x] 3.2.3 评估表达式并返回布尔值
- [x] 3.3 错误处理：
  - [x] 3.3.1 表达式语法错误
  - [x] 3.3.2 变量不存在错误

## 4. HTTP 处理器实现

- [x] 4.1 创建 `WorkflowExecutionHandler` 结构体
- [x] 4.2 实现 `ExecuteWorkflow` 处理器方法：
  - [x] 4.2.1 解析路径参数 `workflowInstanceId`
  - [x] 4.2.2 解析请求体（`fromNodeId`、`businessParams`）
  - [x] 4.2.3 调用 `WorkflowEngineService.ExecuteFromNode`
  - [x] 4.2.4 构建响应（包含 `businessResponse` 和 `engineResponse`）
- [x] 4.3 错误处理：
  - [x] 4.3.1 参数验证错误（400）
  - [x] 4.3.2 实例不存在（404）
  - [x] 4.3.3 执行失败（500）

## 5. 路由配置

- [x] 5.1 在 `routes.go` 中添加执行接口路由：
  - [x] 5.1.1 添加 `POST /api/execute/:workflowInstanceId` 路由
  - [x] 5.1.2 注册 `WorkflowExecutionHandler`

## 6. 单元测试

- [x] 6.1 测试 `WorkflowEngineService`：
  - [x] 6.1.1 测试从不同节点类型开始执行（ServiceTask、EndEvent、InvalidNodeId）
  - [x] 6.1.2 测试流程推进逻辑（ExclusiveGateway）
  - [x] 6.1.3 测试条件表达式评估（多种场景）
  - [x] 6.1.4 测试错误场景（节点不存在）
- [x] 6.2 测试业务接口调用：
  - [x] 6.2.1 使用 HTTP mock 测试成功场景（通过 ServiceTask 测试）
  - [x] 6.2.2 测试错误场景（通过错误处理测试）
- [x] 6.3 测试 HTTP 处理器：
  - [x] 6.3.1 测试参数验证（InvalidRequest、MissingInstanceId）
  - [x] 6.3.2 测试错误响应

## 7. 集成测试

- [x] 7.1 创建端到端测试：
  - [x] 7.1.1 创建测试工作流定义（包含 ServiceTask）
  - [x] 7.1.2 创建测试工作流实例
  - [x] 7.1.3 调用执行接口（通过 ExecuteFromNode）
  - [x] 7.1.4 验证实例状态更新（ServiceTask 和 EndEvent 场景）
  - [x] 7.1.5 验证执行记录创建

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: 核心引擎实现 | 5 | 3-4 天 | | 无 |
| Phase 2: 业务接口调用 | 4 | 2-3 天 | | Phase 1 |
| Phase 3: 条件表达式 | 3 | 1-2 天 | | Phase 1 |
| Phase 4: HTTP 处理器 | 3 | 1 天 | | Phase 1, 2 |
| Phase 5: 路由配置 | 2 | 0.5 天 | | Phase 4 |
| Phase 6: 单元测试 | 3 | 2-3 天 | | Phase 1-4 |
| Phase 7: 集成测试 | 1 | 1 天 | | Phase 1-5 |
| **总计** | **21** | **10-14 天** | | |

