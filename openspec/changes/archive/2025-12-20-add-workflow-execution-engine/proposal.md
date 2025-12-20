# 变更：实现工作流执行引擎接口

## Why

当前系统已经实现了工作流定义、实例和执行的数据模型和 CRUD 操作，但缺少实际的工作流执行引擎。系统需要能够：

1. **从指定节点开始执行工作流**：根据 `fromNodeId` 参数，从工作流定义中的特定节点开始执行
2. **调用业务接口**：对于 ServiceTask 等需要调用外部业务接口的节点，需要能够执行 HTTP 请求并获取响应
3. **推进流程**：根据 BPMN 定义和序列流，自动推进到下一个节点
4. **返回执行结果**：返回业务接口的响应和流程引擎的执行状态

## What Changes

### 1. 工作流执行引擎接口

- **新增 `POST /api/execute/:workflowInstanceId` 接口**：
  - 路径参数：`workflowInstanceId` - 工作流实例 ID（驼峰命名）
  - 请求体参数：
    - `fromNodeId`：从哪个节点开始执行（必填，驼峰命名）
    - `businessParams`：业务接口参数 JSON 字符串（可选，用于传递给业务接口，驼峰命名）
  - 响应包含：
    - `businessResponse`：业务接口回包（如果调用了业务接口）
    - `engineResponse`：流程引擎回包（包含执行状态、当前节点、下一步节点等）

### 2. 工作流执行引擎服务

- **创建 `WorkflowEngineService`**：
  - 解析工作流定义（从数据库获取 BPMN XML 并解析）
  - 验证 `fromNodeId` 是否存在于工作流定义中
  - 根据节点类型执行相应逻辑：
    - ServiceTask：调用外部业务接口
    - UserTask：等待用户操作（返回待处理状态）
    - Gateway：根据条件表达式选择下一个节点
    - EndEvent：标记实例为完成状态
  - 根据序列流和条件表达式推进到下一个节点
  - 更新工作流实例的 `current_node_ids` 和状态
  - 创建或更新工作流执行记录

### 3. 业务接口调用

- **实现业务接口调用逻辑**：
  - 从 ServiceTask 节点配置中获取业务接口 URL（可能需要扩展 BPMN 解析以支持扩展属性）
  - 使用 `businessParams` 作为请求体调用业务接口
  - 处理 HTTP 请求和响应
  - 将业务接口响应存储到执行记录的 `variables` 中

### 4. 流程推进逻辑

- **实现流程推进算法**：
  - 根据 `fromNodeId` 找到当前节点
  - 查找该节点的所有出边（`OutgoingSequenceFlowIds`）
  - 对于 ExclusiveGateway，评估条件表达式选择符合条件的序列流
  - 对于 ParallelGateway，等待所有入边完成（需要支持多实例）
  - 更新实例的 `current_node_ids` 为下一个节点 ID
  - 如果到达 EndEvent，将实例状态更新为 `completed`

### 5. 错误处理

- **处理执行错误**：
  - 业务接口调用失败：记录错误，更新执行状态为 `failed`
  - 节点不存在：返回 404 错误
  - 流程定义解析失败：返回 500 错误
  - 条件表达式评估失败：记录错误并停止执行

## 影响

- **受影响的规范**：
  - `backend-server` - 添加工作流执行引擎 API 需求

- **受影响的代码**：
  - 新建 `server/internal/services/workflow_engine.go` - 工作流执行引擎服务
  - 新建 `server/internal/handlers/workflow_execution.go` - 工作流执行处理器
  - 修改 `server/internal/routes/routes.go` - 添加执行接口路由
  - 可能需要扩展 `server/internal/parser/bpmn_parser.go` - 支持解析 ServiceTask 的业务接口配置

- **依赖**：
  - 需要能够解析和访问工作流定义的 BPMN XML
  - 需要 HTTP 客户端库用于调用业务接口
  - 可能需要表达式评估库用于条件表达式（如 JavaScript 表达式）

- **BREAKING**: 无破坏性变更，这是新功能

