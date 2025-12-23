# 规范增量：后端服务器 - 节点执行逻辑重构

## ADDED Requirements

### Requirement: ExecuteNode 方法支持拦截器调用
工作流引擎服务 SHALL 提供独立的 `ExecuteNode` 方法，封装所有节点类型的执行逻辑，并 MUST 支持通过拦截器架构调用。

#### Scenario: 通过拦截器执行 ServiceTask 节点
- **WHEN** 调用 `ExecuteFromNode` 执行 ServiceTask 节点
- **AND** 通过拦截器调用 `ExecuteNode` 方法
- **THEN** 系统应当执行业务 API 调用
- **AND** 将业务响应存储到执行变量中
- **AND** 返回业务响应对象

#### Scenario: 通过拦截器执行 UserTask 节点
- **WHEN** 调用 `ExecuteFromNode` 执行 UserTask 节点
- **AND** 通过拦截器调用 `ExecuteNode` 方法
- **THEN** 系统应当记录日志表示遇到用户任务
- **AND** 不执行实际操作
- **AND** 返回 nil 业务响应

#### Scenario: 通过拦截器执行 IntermediateCatchEvent 节点
- **WHEN** 调用 `ExecuteFromNode` 执行 IntermediateCatchEvent 节点
- **AND** 通过拦截器调用 `ExecuteNode` 方法
- **THEN** 系统应当记录日志表示等待外部事件
- **AND** 不执行实际操作
- **AND** 返回 nil 业务响应

#### Scenario: 通过拦截器执行 EventBasedGateway 节点
- **WHEN** 调用 `ExecuteFromNode` 执行 EventBasedGateway 节点
- **AND** 通过拦截器调用 `ExecuteNode` 方法
- **THEN** 系统应当记录日志表示等待事件分支
- **AND** 不执行实际操作
- **AND** 返回 nil 业务响应

#### Scenario: 通过拦截器执行 ExclusiveGateway 节点
- **WHEN** 调用 `ExecuteFromNode` 执行 ExclusiveGateway 节点
- **AND** 通过拦截器调用 `ExecuteNode` 方法
- **THEN** 系统应当记录日志表示评估条件
- **AND** 不执行实际操作（条件评估在 advanceToNextNode 中）
- **AND** 返回 nil 业务响应

#### Scenario: 通过拦截器执行 EndEvent 节点
- **WHEN** 调用 `ExecuteFromNode` 执行 EndEvent 节点
- **AND** 通过拦截器调用 `ExecuteNode` 方法
- **THEN** 系统应当记录日志表示工作流完成
- **AND** 不执行实际操作
- **AND** 返回 nil 业务响应

#### Scenario: ServiceTask 执行失败时更新执行状态
- **WHEN** 调用 `ExecuteNode` 执行 ServiceTask 节点
- **AND** 业务 API 调用失败
- **THEN** 系统应当调用 `updateExecutionStatus` 更新执行状态为失败
- **AND** 返回错误信息

### Requirement: ExecuteNode 支持 Dry-run 模式
ExecuteNode 方法 MUST 支持拦截器的 Dry-run 模式，用于收集拦截器清单而不实际执行节点。

#### Scenario: Dry-run 模式记录 ExecuteNode 调用
- **WHEN** 上下文设置为 Dry-run 模式
- **AND** 调用 `ExecuteFromNode` 执行节点
- **THEN** 系统应当记录 ExecuteNode 拦截器调用信息
- **AND** 拦截器 ID 格式为 "ExecuteNode:{nodeId}"
- **AND** 不执行实际的节点逻辑
- **AND** 返回 ErrDryRunMode 错误

#### Scenario: Dry-run 模式收集所有节点的拦截器信息
- **WHEN** 上下文设置为 Dry-run 模式
- **AND** 工作流包含多个节点
- **AND** 调用 `ExecuteFromNode` 执行流程
- **THEN** 系统应当收集所有拦截器调用（GetInstance、GetWorkflow、ExecuteNode、UpdateInstance）
- **AND** 每个节点的 ExecuteNode 调用应当被记录
- **AND** 拦截器清单应当包含所有节点的信息

### Requirement: ExecuteNode 支持 Mock 模式
ExecuteNode 方法 MUST 支持拦截器的 Mock 模式，允许返回预定义的模拟业务响应。

#### Scenario: Mock 模式返回模拟的业务响应
- **WHEN** 拦截器配置中为 ExecuteNode 设置了 Mock 数据
- **AND** 调用 `ExecuteFromNode` 执行 ServiceTask 节点
- **THEN** 系统应当返回 Mock 的业务响应
- **AND** 不调用实际的业务 API
- **AND** 将 Mock 响应存储到执行变量中

#### Scenario: Mock 模式降级到真实执行
- **WHEN** 拦截器配置为 Mock 模式但未设置 Mock 数据
- **AND** 调用 `ExecuteFromNode` 执行 ServiceTask 节点
- **THEN** 系统应当降级执行真实的节点逻辑
- **AND** 调用实际的业务 API
- **AND** 返回真实的业务响应

### Requirement: ExecuteNode 支持 Record 模式
ExecuteNode 方法 MUST 支持拦截器的 Record 模式，执行真实逻辑并记录结果供后续 Mock 使用。

#### Scenario: Record 模式执行并记录业务响应
- **WHEN** 拦截器配置为 Record 模式
- **AND** 调用 `ExecuteFromNode` 执行 ServiceTask 节点
- **THEN** 系统应当执行真实的节点逻辑
- **AND** 调用实际的业务 API
- **AND** 将业务响应记录到拦截器配置中
- **AND** 返回真实的业务响应

#### Scenario: Record 模式记录所有节点执行
- **WHEN** 拦截器配置为 Record 模式
- **AND** 工作流包含多个不同类型的节点
- **AND** 调用 `ExecuteFromNode` 执行流程
- **THEN** 系统应当执行所有节点的真实逻辑
- **AND** 记录所有 ExecuteNode 调用的结果
- **AND** 记录的数据可用于后续的 Mock 模式

### Requirement: ExecuteNodeParams 结构体定义
工作流引擎服务 MUST 定义 `ExecuteNodeParams` 结构体，包含节点执行所需的所有参数，并符合拦截器架构的要求。

#### Scenario: ExecuteNodeParams 包含必要字段
- **WHEN** 定义 ExecuteNodeParams 结构体
- **THEN** 结构体必须包含以下字段：
  - `NodeID string` - 节点唯一标识符（带 `intercept:"id"` tag）
  - `Node *models.Node` - 节点对象引用
  - `BusinessParams map[string]interface{}` - 业务参数映射
  - `Variables map[string]interface{}` - 流程变量映射
  - `Execution *models.WorkflowExecution` - 执行上下文引用
- **AND** 所有字段必须有适当的 JSON 标签
- **AND** NodeID 字段必须有 `intercept:"id"` 标签用于生成拦截器 ID

#### Scenario: ExecuteNodeParams 用于拦截器 ID 生成
- **WHEN** 创建 ExecuteNodeParams 实例
- **AND** 通过拦截器调用 ExecuteNode
- **THEN** 拦截器应当使用 NodeID 字段生成唯一的拦截器 ID
- **AND** 拦截器 ID 格式应为 "ExecuteNode:{nodeId}"
- **AND** 相同的 NodeID 应当生成相同的拦截器 ID

## MODIFIED Requirements

### Requirement: ExecuteFromNode 方法通过拦截器执行节点
工作流引擎的 `ExecuteFromNode` 方法 MUST 使用拦截器架构调用独立的节点执行方法，而不是直接包含节点执行逻辑。

#### Scenario: 通过拦截器调用 ExecuteNode
- **WHEN** ExecuteFromNode 需要执行节点
- **THEN** 系统必须调用 `interceptor.Intercept` 方法
- **AND** 传递操作名称 "ExecuteNode"
- **AND** 传递 `s.ExecuteNode` 方法引用
- **AND** 传递 `ExecuteNodeParams` 结构体实例
- **AND** ExecuteNodeParams 包含当前节点的所有必要信息

#### Scenario: 处理 ExecuteNode 的执行错误
- **WHEN** ExecuteNode 返回错误
- **THEN** 系统必须记录错误日志
- **AND** 调用 `updateExecutionStatus` 更新执行状态为失败
- **AND** 返回包装后的错误信息
- **AND** 中止后续节点的执行

#### Scenario: 处理 ExecuteNode 的成功响应
- **WHEN** ExecuteNode 成功返回业务响应
- **THEN** 系统必须继续执行后续流程控制逻辑
- **AND** 检查是否应该自动推进到下一节点
- **AND** 根据节点类型执行相应的流程控制

#### Scenario: 简化 ExecuteFromNode 的代码结构
- **WHEN** 重构完成后
- **THEN** ExecuteFromNode 方法不应包含节点类型的 switch-case 逻辑
- **AND** 节点执行代码行数应减少约 20-30 行
- **AND** 方法职责应更加清晰（专注于流程控制）
- **AND** 代码可读性应得到提升

### Requirement: 工作流节点执行的可测试性
工作流引擎的节点执行逻辑 MUST 支持独立测试，而不依赖完整的流程执行上下文。

#### Scenario: 独立测试 ServiceTask 执行
- **WHEN** 编写单元测试
- **THEN** 可以直接调用 `ExecuteNode` 方法测试 ServiceTask
- **AND** 只需提供 ExecuteNodeParams 参数
- **AND** 不需要构造完整的 ExecuteFromNode 上下文

#### Scenario: 独立测试不同节点类型
- **WHEN** 编写单元测试
- **THEN** 可以分别测试每种节点类型的执行逻辑
- **AND** UserTask、IntermediateCatchEvent、EventBasedGateway 的测试应验证日志输出
- **AND** ServiceTask 的测试应验证业务 API 调用和变量更新
- **AND** EndEvent 的测试应验证日志输出

#### Scenario: 测试拦截器集成
- **WHEN** 编写集成测试
- **THEN** 可以验证 ExecuteNode 与拦截器的集成
- **AND** 测试 Dry-run 模式的拦截器收集
- **AND** 测试 Mock 模式的数据返回
- **AND** 测试 Record 模式的数据记录
