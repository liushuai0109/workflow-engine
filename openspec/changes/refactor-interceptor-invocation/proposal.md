# 变更:重构拦截器调用方式

## 为什么

当前拦截器的实现方式存在以下问题:

1. **调用方式不够直观**:当前需要将方法调用包装在一个闭包中传递给拦截器,导致代码冗长且不够清晰
   ```go
   // 当前方式
   workflow, err := interceptor.Intercept(ctx,
       fmt.Sprintf("GetWorkflow:%s", instance.WorkflowId),
       func(ctx context.Context) (*models.Workflow, error) {
           return s.workflowSvc.GetWorkflowByID(ctx, instance.WorkflowId)
       },
   )
   ```

2. **方法参数处理复杂**:需要在闭包中手动捕获和传递参数,增加代码复杂度和出错风险

3. **不利于记录和调试**:闭包方式难以记录完整的方法签名和参数信息,影响调试和日志分析

4. **前端控制不便**:当前 ctx 参数主要在后端内部传递,缺少从前端控制拦截器行为的标准机制

5. **缺乏细粒度控制**:当前无法对单个拦截器调用进行独立配置,只能统一控制整个请求

6. **拦截器透明度不足**:前端无法提前知道一个请求会调用哪些拦截器,难以进行精确配置

7. **Mock 机制冗余**:当前存在独立的 mock 服务(mockService, mock_executor)与拦截器机制功能重叠,增加系统复杂度

## 设计理念

**拦截器即 Mock**: 拦截器机制本身就提供了完整的 mock 能力,不需要单独的 mock 服务:

- **真实执行器**: 始终使用真实的 `workflow_executor` 执行流程
- **拦截器控制**: 通过拦截器的 enabled 模式返回预设数据,实现 mock 效果
- **统一机制**: 拦截、记录、mock 都由同一套拦截器机制完成,架构更清晰

**语义澄清**:
- `GetApiSchemas` 等方法获取的是**真实的 API schema**,不是 mock 数据
- 执行流程时调用**真实的 workflow_executor**,而不是 mock_executor
- 只有被拦截的服务调用(如 GetWorkflow, GetInstance)可能返回 mock 数据

理想的调用方式应该是:
```go
// 期望方式 - 使用结构体参数
workflow, err := interceptor.Intercept(ctx, "GetWorkflow",
    s.workflowSvc.GetWorkflowByID,
    GetWorkflowParams{WorkflowID: instance.WorkflowId})
```

理想的控制方式应该是:
- 前端可以通过 Dry-run 模式获取拦截器调用清单
- 前端可以为每个拦截器单独配置模式(enabled/disabled/record)
- 拦截器有唯一标识(如 `GetWorkflow:workflow-123`),包含操作名和关键参数
- 配置通过 HTTP Header 以 JSON 格式传递到后端

这样可以:
- 直接传递方法引用和参数,代码更简洁
- 由拦截器统一执行方法,便于记录完整的调用信息
- 更容易从 ctx 中提取会话信息来控制拦截行为
- 支持从前端对每个拦截器进行细粒度控制

## 使用流程

### Mock 面板执行流程 (全程 Mock 模式)

当用户在 BPMN 编辑器的 Mock 面板点击"开始执行"时，使用**全程 Mock 模式**：

**流程说明**:
1. **前端准备数据**:
   - 生成新的 UUID v4 作为 `workflowInstanceId`
   - 构造 `workflow` 对象（包含当前编辑器中的 bpmnXml）
   - 构造 `workflowInstance` 对象（mock 实例数据）
   - **选择起始节点**: 从流程图中提取所有可作为起始节点的节点供用户选择
     - 可作为起始节点的类型：StartEvent（开始节点）、BoundaryEvent（边界事件）、IntermediateCatchEvent（消息中间事件）
     - 显示格式：`节点类型:节点名称:节点ID`
     - 示例：`StartEvent:流程开始:StartEvent_1`、`BoundaryEvent:超时处理:BoundaryEvent_1abc`
     - **默认选择开始节点（StartEvent）**
   - 准备 `fromNodeId`（用户选择的起始节点 ID）和 `businessParams`（可选）

2. **发送请求**:
   ```http
   POST /api/execute
   Content-Type: application/json

   {
     "fromNodeId": "StartEvent_1",  // 用户选择的起始节点 ID
     "businessParams": {},
     "workflow": {
       "id": "Process_1",
       "name": "Mock Workflow Process_1",
       "bpmnXml": "<bpmn:definitions>...</bpmn:definitions>",
       "createdAt": "2025-01-15T10:00:00Z",
       "updatedAt": "2025-01-15T10:00:00Z"
     },
     "workflowInstance": {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "workflowId": "Process_1",
       "name": "Mock Instance 550e8400...",
       "status": "running",
       "currentNodeIds": [],
       "instanceVersion": 1,
       "createdAt": "2025-01-15T10:00:00Z",
       "updatedAt": "2025-01-15T10:00:00Z"
     }
   }
   ```

   **注意**：全程 Mock 模式使用 `POST /api/execute`（无 URL 参数），实例 ID 在请求体的 `workflowInstance.id` 中。

3. **后端处理**:
   - Handler 检测到 `workflow` 和 `workflowInstance` 参数
   - 调用 `ExecuteFromNodeWithOptionalData` 方法
   - **跳过数据库查询**，直接使用提供的 workflow 和 instance 数据
   - 解析 bpmnXml 并执行工作流
   - 对于需要调用外部服务的 ServiceTask，可以配置拦截器进行 mock

4. **响应返回**:
   ```json
   {
     "businessResponse": {...},
     "engineResponse": {
       "instanceId": "550e8400-e29b-41d4-a716-446655440000",
       "currentNodeIds": ["Activity_xxx"],
       "status": "running",
       "executionId": "exec-001",
       "variables": {}
     },
     "interceptorCalls": [...],
     "requestParams": {...}
   }
   ```

**关键特性**:
- ✅ 无需数据库中存在 workflow 和 instance 记录
- ✅ 支持使用当前编辑器中的 BPMN XML（即时测试）
- ✅ 与拦截器机制兼容（可对 ServiceTask 进行细粒度 mock）
- ✅ 返回完整的执行结果和拦截器调用列表

### 典型 Mock 测试流程（基于数据库）

适用于已有 workflow 和 instance 记录的情况：

1. **前端选择接口并配置入参**
   - 用户在 Mock 面板选择要测试的接口(如 ExecuteWorkflow)
   - 配置接口入参(如 workflowId, fromNodeId, businessParams)
   - 点击"执行"按钮

2. **首次执行 - 记录模式**
   - 前端不传递 `X-Intercept-Config` header(或所有拦截器配置为 record)
   - 后端接收请求,所有拦截器以 **record 模式**执行
   - 拦截器执行真实方法,并记录:
     - 拦截器唯一标识(如 `GetWorkflow:workflow-123`)
     - 调用时间戳
     - 入参(完整的参数结构体)
     - 返回值(真实执行的结果)
     - 错误信息(如果有)
   - 记录数据持久化到数据库表 `interceptor_records`
   - 接口正常返回业务结果

3. **查看拦截器调用列表**

   前端有两种方式获取拦截器调用列表：

   **方式一: 从执行响应中直接获取** (推荐用于实时展示)
   - 执行 API 的响应中包含 `interceptorCalls` 字段
   - 响应格式:
     ```json
     {
       "businessResponse": {...},
       "engineResponse": {
         "instanceId": "workflow-001_instance_abc123",
         "currentNodeIds": ["node-1"],
         "status": "running",
         "executionId": "exec-001",
         "variables": {}
       },
       "interceptorCalls": [
         {
           "name": "GetWorkflow:workflow-123",
           "order": 1,
           "timestamp": "2025-01-15T10:30:00Z",
           "input": {"workflowId": "workflow-123"},
           "output": {...}
         },
         {
           "name": "GetInstance:instance-456",
           "order": 2,
           "timestamp": "2025-01-15T10:30:01Z",
           "input": {"instanceId": "instance-456"},
           "output": {...}
         }
       ],
       "requestParams": {...}
     }
     ```
   - 前端直接从 `result.interceptorCalls` 读取并展示在 UI 中

   **方式二: 通过 API 查询历史记录** (用于查询过往执行)
   - 前端调用 `GET /api/interceptor/records?executionId={id}` 获取本次执行的所有拦截器记录
   - 后端查询 `interceptor_records` 表,返回拦截器列表:
     ```json
     [
       {
         "id": "rec-001",
         "interceptorId": "GetWorkflow:workflow-123",
         "operation": "GetWorkflow",
         "params": {"workflowId": "workflow-123"},
         "result": {...},
         "timestamp": "2025-01-15T10:30:00Z"
       },
       {
         "id": "rec-002",
         "interceptorId": "GetInstance:instance-456",
         "operation": "GetInstance",
         "params": {"instanceId": "instance-456"},
         "result": {...},
         "timestamp": "2025-01-15T10:30:01Z"
       }
     ]
     ```

   **当前前端实现**: MockControlPanel 使用方式一,从执行响应的 `result.interceptorCalls` 直接获取并展示

4. **选择启用的拦截器**
   - 前端展示拦截器调用列表
   - 用户勾选需要启用 mock 的拦截器(如 `GetWorkflow:workflow-123`)
   - 系统将该拦截器的真实执行结果作为 mock 数据的初始版本
   - 用户可以编辑 mock 数据(可选)
   - 前端构造配置:
     ```json
     {
       "GetWorkflow:workflow-123": "enabled",
       "GetInstance:instance-456": "record"
     }
     ```

5. **再次执行 - Mock 模式**
   - 前端传递 `X-Intercept-Config` header,包含上述配置
   - 后端接收请求,根据配置执行:
     - `GetWorkflow:workflow-123` - **enabled 模式**,返回 mock 数据(不调用真实方法)
     - `GetInstance:instance-456` - **record 模式**,真实执行并记录
   - 接口返回结果(部分来自 mock,部分来自真实执行)

### 迭代调试流程

- **调整 Mock 数据**: 用户可以编辑已启用拦截器的 mock 数据,测试不同场景
- **部分 Mock**: 可以只 mock 部分拦截器,其他保持真实执行,便于隔离问题
- **对比测试**: 可以在 enabled 和 record 模式间切换,对比真实数据和 mock 数据

## 变更内容

- **MODIFIED**: 业务方法签名规范化
  - 所有业务方法必须接受结构体参数,而不是多个离散参数
  - 结构体字段使用 `json` tag 定义序列化行为
  - 结构体字段使用 `intercept:"id"` tag 标记用于生成拦截器唯一标识的字段
  - 示例:
    ```go
    type GetWorkflowParams struct {
        WorkflowID string `json:"workflowId" intercept:"id"`
        IncludeDeleted bool `json:"includeDeleted"`
    }
    func (s *Service) GetWorkflow(ctx context.Context, params GetWorkflowParams) (*Workflow, error)
    ```

- **MODIFIED**: 拦截器核心函数签名
  - 重构 `Intercept` 函数为单一泛型函数,无需多个重载版本
  - 使用 Go 泛型支持任意结构体参数类型
  - 签名: `func Intercept[T any, P any](ctx context.Context, operation string, fn func(context.Context, P) (T, error), params P) (T, error)`
  - 只需一个函数即可处理所有场景

- **MODIFIED**: ExecuteFromNode 方法签名调整
  - 原签名：`ExecuteFromNode(ctx, instanceId, fromNodeId, businessParams)` - 通过 ID 查询数据
  - 新签名：`ExecuteFromNode(ctx, workflow, workflowInstance, fromNodeId, businessParams)` - 接收数据对象
  - **职责分离**：
    - Handler 层负责数据准备（从 request body 获取或通过 ID 从数据库查询）
    - Service 层只负责执行逻辑，不关心数据来源
  - **移除内部拦截器调用**：
    - 删除 `interceptor.Intercept(ctx, "GetInstance", ...)` 调用
    - 删除 `interceptor.Intercept(ctx, "GetWorkflow", ...)` 调用
  - **简化依赖**：ExecuteFromNode 不再依赖 workflowSvc 和 instanceSvc
  - **好处**：
    - 测试更容易：可以直接传入 mock 对象而不需要数据库
    - 职责更清晰：数据获取和业务逻辑完全分离
    - 代码更简洁：减少不必要的拦截器调用

- **ADDED**: 拦截器唯一标识机制
  - 拦截器标识从参数结构体自动生成
  - 格式: `{operation}:{json字段1}:{json字段2}:...`
  - 只使用带 `intercept:"id"` tag 的字段生成标识
  - 示例: `GetWorkflow:workflow-123`, `UpdateInstance:instance-456:running`
  - 参数序列化使用 JSON,天然支持复杂类型

- **ADDED**: Dry-run 执行模式
  - 添加 HTTP Header: `X-Intercept-Dry-Run: true`
  - Dry-run 模式下不实际执行方法,但记录会调用的拦截器清单
  - 返回拦截器列表,包含标识、操作名、参数等信息
  - 用于前端获取可配置的拦截器清单

- **ADDED**: 拦截器记录持久化
  - 创建数据库表 `interceptor_records` 存储拦截器执行记录
  - 表结构包含:
    - `id` - 记录唯一标识
    - `execution_id` - 关联的执行ID(用于分组查询)
    - `interceptor_id` - 拦截器唯一标识
    - `operation` - 操作名称
    - `params` - 入参(JSON)
    - `result` - 返回值(JSON)
    - `error` - 错误信息
    - `duration_ms` - 执行耗时(毫秒)
    - `timestamp` - 执行时间戳
    - `mode` - 执行模式(record/enabled/disabled)
  - Record 模式下自动保存执行记录
  - 支持按 execution_id 查询所有相关拦截器记录

- **ADDED**: 拦截器记录查询 API
  - `GET /api/interceptor/records?executionId={id}` - 查询指定执行的所有拦截器记录
  - `GET /api/interceptor/records/{recordId}` - 查询单条记录详情
  - `DELETE /api/interceptor/records/{recordId}` - 删除记录
  - 返回记录包含完整的入参、返回值和元数据

- **ADDED**: Mock 数据管理
  - Enabled 模式首次执行时,从 `interceptor_records` 加载对应记录的 result 作为 mock 数据
  - Mock 数据存储在内存中(InterceptConfig)
  - 前端可以通过编辑界面修改 mock 数据
  - 修改后的 mock 数据通过配置传递(未来可考虑持久化)

- **ADDED**: 细粒度拦截器配置
  - 添加 HTTP Header: `X-Intercept-Config: {"GetWorkflow:id1":"enabled", "GetInstance:id2":"disabled"}`
  - 配置为 JSON 对象,键为拦截器标识,值为模式(enabled/disabled/record)
  - 中间件解析配置并注入到 ctx
  - 每个拦截器根据自己的标识查找配置,未配置的默认为 record 模式
  - **通配符支持**: 使用 `"*"` 作为键可以配置所有拦截器的默认模式
    - `{"*": "enabled"}` - **全程 Mock 模式**，所有拦截器启用 mock（包括 GetInstance, GetWorkflow 等）
    - `{"*": "record"}` - **默认模式**，所有拦截器启用记录模式（系统默认行为）
    - `{"*": "disabled"}` - 所有拦截器禁用，直接执行真实方法
    - 优先级: 具体拦截器配置 > 通配符配置 > 系统默认（record）
    - 示例: `{"*": "enabled", "GetInstance:123": "record"}` - 全程 mock，但 GetInstance:123 真实执行并记录

- **ADDED**: 新增 API 路由 `POST /api/execute`（区别于 `POST /api/execute/:workflowInstanceId`）
  - **路由差异**:
    - `POST /api/execute` - workflow 和 instance 从**请求体**获取（无需数据库）
    - `POST /api/execute/:workflowInstanceId` - workflow 和 instance 从**数据库**获取
  - **请求体参数** (`POST /api/execute`)：
    - `workflow` (必需) - 完整的 workflow 对象
      ```typescript
      {
        id: string              // 工作流 ID，与 workflowInstance.workflowId 对应
        name: string            // 工作流名称
        bpmnXml: string         // 完整的 BPMN XML 定义
        createdAt: string       // ISO 8601 时间戳
        updatedAt: string       // ISO 8601 时间戳
      }
      ```
    - `workflowInstance` (必需) - 完整的 workflowInstance 对象
      ```typescript
      {
        id: string              // 实例 ID（UUID v4），由前端生成
        workflowId: string      // 工作流 ID，与 workflow.id 对应
        name: string            // 实例名称
        status: string          // 实例状态，通常为 "running"
        currentNodeIds: string[] // 当前节点 ID 列表，初始为空数组
        instanceVersion: number  // 实例版本，通常为 1
        createdAt: string       // ISO 8601 时间戳
        updatedAt: string       // ISO 8601 时间戳
      }
      ```
    - `fromNodeId` (可选) - 起始节点 ID
      - 支持从 StartEvent、BoundaryEvent、IntermediateCatchEvent 开始执行
      - 如果为空，默认使用第一个 StartEvent
    - `businessParams` (可选) - 业务参数
  - **后端实现**：
    - Handler 层负责数据准备：从 request body 获取或通过 ID 从数据库查询
    - `ExecuteFromNode` 方法接收已准备好的 `workflow` 和 `workflowInstance` 参数
    - 数据获取逻辑在 Handler 层完成，执行逻辑在 Service 层保持纯粹
  - **架构优势**：
    - 职责分离：Handler 负责数据获取，Service 负责业务逻辑
    - 不需要在 Service 内部使用拦截器获取 workflow/instance
    - 简化依赖：ExecuteFromNode 不依赖 workflowSvc 和 instanceSvc
  - **适用场景**：编辑器中即时测试尚未保存到数据库的流程定义
  - **与拦截器机制互补**：
    - 传递完整数据解决了 GetInstance 和 GetWorkflow 的数据来源问题
    - 仍可使用拦截器配置（如 `X-Intercept-Config`）对 ServiceTask 等其他操作进行 mock

- **MODIFIED**: 上下文参数传递
  - 优化 ctx 中的拦截器配置管理
  - 支持从 HTTP Header 加载拦截器配置映射
  - 拦截器根据自身标识从配置中查找对应模式

- **MODIFIED**: 方法调用记录
  - 记录完整的方法签名(包括所有参数)
  - 支持记录方法的输入参数和输出结果
  - 优化日志格式,便于调试和分析

- **REMOVED**: 前端右侧拦截器面板
  - 删除 RightPanelContainer 中的拦截器 Tab
  - 删除 InterceptorControlPanel 组件的引用
  - 拦截器功能集成到 MockControlPanel 中

- **REMOVED**: 冗余的 Mock 服务
  - 删除或废弃独立的 mockService
  - 删除或废弃 mock_executor
  - 移除 Mock 相关的独立服务端实现
  - **理由**: 拦截器机制已经提供了完整的 mock 能力,无需单独服务
  - **影响**: 简化架构,减少代码维护成本

- **CLARIFIED**: 执行语义
  - Mock 面板调用的是**真实的 workflow_executor**
  - `GetApiSchemas` 返回**真实的 API schema**,不是 mock 数据
  - Mock 效果通过拦截器 enabled 模式实现,而非替换执行器
  - 拦截器只作用于被标记的服务方法调用

- **MODIFIED**: Mock 面板 UI 变更
  - **执行接口选择器 → 起始节点选择器**
    - 原来：用户选择要调用的 API 接口（如 `/api/execute/:workflowInstanceId`）
    - 现在：用户选择从哪个节点开始执行工作流
  - 起始节点选择器实现
    - 自动从当前 BPMN XML 中提取所有可作为起始节点的节点
    - 支持的节点类型：
      - `StartEvent` - 开始节点（流程的正常入口）
      - `BoundaryEvent` - 边界事件（异常处理入口）
      - `IntermediateCatchEvent` - 消息中间事件（等待外部触发的入口）
    - 显示格式：`节点类型:节点名称:节点ID`
      - 示例：`StartEvent:流程开始:StartEvent_1`
      - 示例：`BoundaryEvent:超时处理:BoundaryEvent_1abc`
      - 示例：`IntermediateCatchEvent:等待审批:IntermediateCatchEvent_xyz`
    - **默认选择：第一个 StartEvent（开始节点）**
  - 点击"开始执行"调用 `POST /api/execute`（全程 Mock 模式）
    - 自动生成 UUID v4 作为 workflowInstance.id
    - 传递完整的 workflow 对象（包含当前编辑器的 bpmnXml）
    - 传递完整的 workflowInstance 对象
    - 传递用户选择的 fromNodeId 作为执行起点
    - 无需 URL 参数，所有数据在请求体中

- **ADDED**: 前端拦截器控制增强
  - 在前端 API 调用中添加 HTTP Header 支持
  - 支持 Dry-run 模式获取拦截器清单
  - 支持为每个拦截器单独设置模式
  - 显示拦截器列表和当前配置状态

## 影响

- **受影响的规范**:
  - `backend-server` - 修改拦截器 API 和调用方式
  - `workflow-editor` - 更新前端拦截器控制组件

- **受影响的代码**:
  - `server/internal/interceptor/interceptor.go` - 重构为单一泛型函数，添加 createDefaultMock
  - `server/internal/middleware/interceptor.go` - 新增 HTTP 中间件
  - `server/internal/services/` - 所有业务方法改造为结构体参数
  - `server/internal/services/` - 新增参数结构体定义(如 GetWorkflowParams)
  - `server/internal/services/workflow_engine.go` - 修改 ExecuteFromNode 方法签名，接收 workflow 和 workflowInstance 参数，移除内部数据获取逻辑
  - `server/internal/handlers/workflow_executor.go` - Handler 层负责数据准备（从 request body 或数据库获取），然后调用 ExecuteFromNode
  - `server/internal/routes/routes.go` - 新增 `POST /api/execute` 路由，简化服务初始化，移除 interceptor routes
  - `server/internal/models/interceptor_record.go` - 新增拦截器记录数据模型
  - `server/internal/repository/interceptor_repository.go` - 新增拦截器记录存储层
  - `server/migrations/` - 新增数据库迁移(创建 interceptor_records 表)
  - **删除**: `server/internal/services/mock_service.go` - 冗余的 mock 服务
  - **删除**: `server/internal/services/mock_instance_service.go` - 冗余的 mock 实例服务
  - **删除**: `server/internal/executor/mock_executor.go` - 冗余的 mock 执行器
  - **删除**: `server/internal/handlers/interceptor_handler.go` - 废弃的拦截器 handler
  - **删除**: `/api/interceptor/*` routes - 废弃的拦截器 API 路由
  - `client/src/services/api.ts` - 添加 Dry-run 和配置 Header 支持
  - `client/src/services/interceptorService.ts` - 新增拦截器记录查询服务
  - `client/src/components/RightPanelContainer.vue` - 删除拦截器 Tab
  - **删除**: `client/src/components/InterceptorControlPanel.vue` - 独立拦截器面板
  - `client/src/components/MockControlPanel.vue` - 集成拦截器列表和配置功能，支持全程 Mock 模式

- **兼容性影响**:
  - 破坏性变更:需要重构所有业务方法签名和调用点
  - 移除 mock 相关服务,依赖这些服务的代码需要迁移到拦截器机制
  - 不提供兼容层,一次性全面重构
  - 工作量较大但架构更清晰,长期收益明显

- **性能影响**:
  - 使用泛型和方法引用可能轻微提升性能(减少闭包分配)
  - 结构体参数传递性能与多参数传递相当
  - JSON 序列化用于日志和标识生成,不在热路径上
  - HTTP Header 解析开销可忽略不计
  - 移除冗余 mock 服务,减少代码路径,可能轻微提升性能
  - 整体性能影响为中性或轻微正向

## 风险

- **实施风险**:
  - 高 - 需要全面重构所有业务方法签名和调用点
  - 需要定义大量参数结构体(每个方法一个)
  - 需要充分的单元测试覆盖所有改造的方法
  - 需要谨慎处理泛型的类型推断和编译错误
  - 建议分模块逐步重构,每个模块完成后立即测试

- **运维风险**:
  - 低 - 主要是代码层面的重构,不涉及数据结构变更
  - HTTP Header 是标准实践,不会引入新的运维复杂度

## 替代方案

1. **保持当前闭包方式**
   - 优点:不需要修改现有代码
   - 缺点:无法解决当前的可读性和可维护性问题

2. **使用反射(reflect)动态调用**
   - 优点:最大灵活性,支持任意方法签名
   - 缺点:性能开销大,失去编译时类型检查,代码复杂度高

3. **使用泛型穷举(Intercept0-5)**
   - 优点:类型安全,性能好
   - 缺点:需要定义多个重载函数,代码重复,扩展性差

4. **使用代码生成**
   - 优点:可以生成类型安全的包装代码
   - 缺点:增加构建复杂度,需要维护代码生成器

**推荐方案**: 结构体参数 + 单一泛型函数(当前提案),平衡了类型安全、性能、可维护性和扩展性。

### 方案对比

| 方案 | 类型安全 | 性能 | 代码量 | 扩展性 | 推荐度 |
|------|---------|------|--------|--------|--------|
| 闭包 | ❌ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ❌ |
| 反射 | ❌ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ |
| 泛型穷举 | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 代码生成 | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **结构体+泛型** | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 实施日志

### 2025-01-16: 完成全程 Mock 模式实现

#### 架构调整：ExecuteFromNode 方法签名重构
**设计原则**：职责分离 - Handler 负责数据准备，Service 负责业务逻辑

**方法签名变更**：
```go
// 旧方法（已删除）
ExecuteFromNode(ctx, instanceId, fromNodeId, businessParams)
ExecuteFromNodeWithOptionalData(ctx, instanceId, fromNodeId, businessParams, optionalWorkflow, optionalInstance)

// 新方法（统一签名）
ExecuteFromNode(ctx, workflow, workflowInstance, fromNodeId, businessParams)
```

**数据准备职责**：
- `POST /api/execute/:workflowInstanceId` - Handler 通过 ID 从数据库查询 workflow 和 instance
- `POST /api/execute` - Handler 从 request body 直接获取 workflow 和 instance

**好处**：
1. 职责清晰：Handler 层负责数据获取，Service 层专注业务逻辑
2. 简化依赖：ExecuteFromNode 不再依赖 workflowSvc 和 instanceSvc
3. 易于测试：可以直接传入 mock 对象，无需数据库
4. 代码简洁：移除不必要的 GetInstance 和 GetWorkflow 拦截器调用

#### 后端实现
1. **添加通配符支持** (`server/internal/interceptor/interceptor.go`)
   - 更新 `InterceptConfig.GetMode()` 方法支持通配符 `"*"`
   - 优先级：具体拦截器配置 > 通配符配置 > 系统默认（record）
   ```go
   func (c *InterceptConfig) GetMode(interceptorID string) InterceptMode {
       // 1. Check for specific interceptor configuration
       if mode, exists := c.configMap[interceptorID]; exists {
           return InterceptMode(mode)
       }
       // 2. Check for wildcard "*" configuration
       if mode, exists := c.configMap["*"]; exists {
           return InterceptMode(mode)
       }
       // 3. Return system default
       return InterceptModeRecord
   }
   ```

2. **新增 Mock 模式路由** (`server/internal/routes/routes.go`)
   - 添加 `POST /api/execute` 路由（无 URL 参数）
   - 保留 `POST /api/execute/:workflowInstanceId` 路由（正常模式）
   ```go
   api.POST("/execute", executorHandler.ExecuteWorkflowMock)                   // Mock mode
   api.POST("/execute/:workflowInstanceId", executorHandler.ExecuteWorkflow)   // Normal mode
   ```

3. **重构 Handler 层数据准备逻辑** (`server/internal/handlers/workflow_executor.go`)
   - `ExecuteWorkflow` (正常模式)：从数据库查询 workflow 和 instance
     ```go
     // 1. 获取 workflow 和 instance
     workflow, err := workflowSvc.GetWorkflowByID(ctx, workflowId)
     instance, err := instanceSvc.GetWorkflowInstanceByID(ctx, workflowInstanceId)

     // 2. 调用执行引擎
     result, err := h.engineService.ExecuteFromNode(ctx, workflow, instance, fromNodeId, businessParams)
     ```
   - `ExecuteWorkflowMock` (Mock 模式)：从 request body 获取数据
     ```go
     // 1. 从 request body 获取 workflow 和 instance
     var req struct {
         Workflow         *models.Workflow         `json:"workflow" binding:"required"`
         WorkflowInstance *models.WorkflowInstance `json:"workflowInstance" binding:"required"`
         // ...
     }

     // 2. 调用执行引擎
     result, err := h.engineService.ExecuteFromNode(ctx, req.Workflow, req.WorkflowInstance, req.FromNodeId, req.BusinessParams)
     ```

4. **简化 ExecuteFromNode 方法** (`server/internal/services/workflow_engine.go`)
   - 删除 `ExecuteFromNodeWithOptionalData` 方法
   - 修改 `ExecuteFromNode` 签名为接收 workflow 和 workflowInstance 对象
   - 移除内部的 GetInstance 和 GetWorkflow 拦截器调用
   - 移除对 workflowSvc 和 instanceSvc 的依赖
   ```go
   func (s *WorkflowEngineService) ExecuteFromNode(
       ctx context.Context,
       workflow *models.Workflow,
       instance *models.WorkflowInstance,
       fromNodeId string,
       businessParams map[string]interface{},
   ) (*ExecuteResult, error) {
       // 直接使用传入的 workflow 和 instance，无需查询数据库
       // ...
   }
   ```

#### 前端实现
1. **更新 Mock 面板请求** (`client/src/components/MockControlPanel.vue`)
   - 修改 API 调用为 `POST /api/execute`（无 URL 参数）
   - 应用通配符拦截器配置 `{"*": "enabled"}` 实现全程 Mock
   - 传递完整的 workflow 和 workflowInstance 对象
   ```typescript
   // Apply wildcard interceptor configuration for full mock mode
   const fullMockConfig = { '*': 'enabled' }
   apiClient.setInterceptorConfig(fullMockConfig)

   // Call /api/execute without instanceId in URL
   const result = await apiClient.post<ExecuteResult>(`/execute`, {
       fromNodeId: undefined,
       businessParams: {},
       workflow: workflow,
       workflowInstance: workflowInstance
   })
   ```

#### 验证
- ✅ 后端编译通过 (`go build ./...`)
- ✅ 路由正确注册：`POST /api/execute` 和 `POST /api/execute/:workflowInstanceId`
- ✅ 拦截器通配符支持已实现
- ✅ Proposal 文档已更新，说明新的架构设计

#### 实施完成
- ✅ **重构 ExecuteFromNode 方法签名** (2025-01-16)
  - ✅ 修改方法签名接收 workflow 和 workflowInstance 对象
  - ✅ Handler 层实现数据准备逻辑（从 request body 或数据库获取）
  - ✅ 移除 Service 层的 getInstance 和 getWorkflow 方法
  - ✅ 移除 GetInstanceParams 和 GetWorkflowParams 结构体
  - ✅ 删除废弃的 interceptor_handler.go 文件
  - ✅ 后端编译通过

#### 待实施（下一步）
- ⏳ **更新单元测试**（7个测试需要更新为新签名）
  - 测试需要创建 workflow 和 instance 对象
  - 测试需要调用新的 ExecuteFromNode 签名
- ⏳ 前端起始节点选择器 UI（当前仍为"执行接口"选择器）
- ⏳ 从 BPMN XML 提取可用起始节点（StartEvent, BoundaryEvent, IntermediateCatchEvent）
- ⏳ 更新 UI 显示格式为"节点类型:节点名称:节点ID"

### 2025-01-15: UUID 生成和完整数据传递

#### 问题和修复
1. **UUID 格式错误**
   - 问题：PostgreSQL 拒绝自定义字符串 ID 格式
   - 解决：使用 `uuid` 库的 `uuidv4()` 生成标准 UUID v4 格式

2. **API 服务器地址错误**
   - 问题：前端调用编辑器服务器而非 API 服务器
   - 解决：更新 apiClient baseUrl 为 `http://api.workflow.com:3000/api`

3. **路由参数缺失**
   - 问题：路由需要 workflowInstanceId 参数
   - 解决：在 URL 中添加 instanceId：`/execute/${instanceId}`

4. **架构方向错误**
   - 初始方案：通过拦截器自动配置处理缺失数据
   - 正确方案：前端传递完整的 workflow 和 workflowInstance 数据

#### 实现
1. **后端支持可选数据** (`server/internal/services/workflow_engine.go`)
   - 添加 `ExecuteFromNodeWithOptionalData` 方法
   - 支持传入可选的 workflow 和 workflowInstance
   - 如果提供则直接使用，否则从数据库获取

2. **Handler 支持两种模式** (`server/internal/handlers/workflow_executor.go`)
   - 检测请求体中是否包含 workflow 和 workflowInstance
   - 如果包含则调用 ExecuteFromNodeWithOptionalData
   - 否则调用正常的 ExecuteFromNode

3. **清理废弃路由** (`server/internal/routes/routes.go`)
   - 删除 `/api/interceptor/*` 相关路由
   - 删除 mockInstanceService 依赖
   - 简化服务初始化

---