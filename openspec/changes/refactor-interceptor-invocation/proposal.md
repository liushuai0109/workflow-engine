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

### 典型 Mock 测试流程

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

- **ADDED**: 前端拦截器控制增强
  - 在前端 API 调用中添加 HTTP Header 支持
  - 支持 Dry-run 模式获取拦截器清单
  - 支持为每个拦截器单独设置模式
  - 显示拦截器列表和当前配置状态
  - 新的 UI 集成方式待在实施阶段设计

## 影响

- **受影响的规范**:
  - `backend-server` - 修改拦截器 API 和调用方式
  - `workflow-editor` - 更新前端拦截器控制组件

- **受影响的代码**:
  - `server/internal/interceptor/interceptor.go` - 重构为单一泛型函数
  - `server/internal/middleware/interceptor.go` - 新增 HTTP 中间件
  - `server/internal/services/` - 所有业务方法改造为结构体参数
  - `server/internal/services/` - 新增参数结构体定义(如 GetWorkflowParams)
  - `server/internal/services/workflow_engine.go` - 更新所有拦截器调用点
  - `server/internal/models/interceptor_record.go` - 新增拦截器记录数据模型
  - `server/internal/repository/interceptor_repository.go` - 新增拦截器记录存储层
  - `server/internal/handlers/interceptor_handler.go` - 新增拦截器记录查询 API
  - `server/migrations/` - 新增数据库迁移(创建 interceptor_records 表)
  - **删除**: `server/internal/services/mock_service.go` - 冗余的 mock 服务
  - **删除**: `server/internal/executor/mock_executor.go` - 冗余的 mock 执行器
  - `client/src/services/api.ts` - 添加 Dry-run 和配置 Header 支持
  - `client/src/services/interceptorService.ts` - 新增拦截器记录查询服务
  - `client/src/components/RightPanelContainer.vue` - 删除拦截器 Tab
  - **删除**: `client/src/components/InterceptorControlPanel.vue` - 独立拦截器面板
  - `client/src/components/MockControlPanel.vue` - 集成拦截器列表和配置功能

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

### 2025-01-XX - Phase 1 完成: 核心架构 + 完整迁移

**实施内容**:
1. ✅ **核心拦截器实现** (Task 1)
   - 实现了泛型函数 `Intercept[T any, P any]`
   - 实现了基于反射的 `generateInterceptorID()` 函数,支持自动从结构体 `intercept:"id"` tag 生成 ID
   - 实现了 `InterceptLegacy[T any]` 兼容层,确保现有代码无缝运行

2. ✅ **HTTP 中间件** (Tasks 3-4)
   - 创建了 `server/internal/middleware/interceptor.go` 中间件
   - 支持解析 `X-Intercept-Dry-Run` 和 `X-Intercept-Config` headers
   - 在 `routes.go` 中全局注册中间件

3. ✅ **业务方法完整迁移** (Task 2)
   - 在 `workflow_engine.go` 中定义了 4 个参数结构体:
     - `GetInstanceParams`: 获取工作流实例 (支持 Mock 和真实实例)
     - `GetWorkflowParams`: 获取工作流定义
     - `UpdateInstanceParams`: 更新实例状态和当前节点
     - `ExecuteServiceTaskParams`: 执行业务服务任务 (包含 node ID 和 API URL)
   - 创建了 4 个对应的 helper 方法,将原闭包逻辑提取为独立方法
   - 将所有 4 个 `InterceptLegacy` 调用替换为新的 `Intercept` 调用
   - 移除了不再需要的 `callRealService` 方法 (逻辑已合并到 `executeServiceTaskWithParams`)

**迁移对比示例**:
```go
// OLD (闭包方式):
instance, err := interceptor.InterceptLegacy(ctx,
    fmt.Sprintf("GetInstance:%s", instanceId),
    func(ctx context.Context) (*models.WorkflowInstance, error) {
        // 20+ 行闭包逻辑 (Mock 判断、获取实例等)
    },
)

// NEW (结构体方式):
instance, err := interceptor.Intercept(ctx,
    "GetInstance",
    s.getInstance,
    GetInstanceParams{InstanceID: instanceId},
)
// ID 自动生成为 "GetInstance:xxx",params 类型安全,代码更清晰
```

**验证结果**:
- ✅ `go fmt` 通过,代码格式正确
- ✅ `go build` 成功,无编译错误
- ✅ 所有 4 个拦截器已完全迁移,workflow_engine.go 中无 `InterceptLegacy` 残留
- ✅ 确认 `workflow_engine.go` 是 services 目录中唯一使用拦截器的文件

**后续任务**:
- ⏳ Task 7: 编写集成测试,测试 HTTP Header → Context 完整流程
- ⏳ Tasks 8-10: 前端实现 (API 客户端、UI 配置界面)
- ⏳ Tasks 11-15: 文档、性能测试、回归测试

### 2025-01-XX - Task 6 完成: 单元测试

**实施内容**:
1. ✅ **添加结构体参数测试** (13+ 新测试用例)
   - 单一 ID 字段结构体测试 (`SimpleParams`)
   - 多 ID 字段结构体测试 (`MultiIDParams` with multiple `intercept:"id"` tags)
   - 无 ID 标签结构体测试 (`NoIDParams`)
   - 复杂类型结构体测试 (`ComplexParams` with maps, slices)

2. ✅ **ID 生成逻辑测试** (`TestGenerateInterceptorID`)
   - 验证单个 ID 字段生成格式: `"Operation:value"`
   - 验证多个 ID 字段生成格式: `"Operation:value1:value2"`
   - 验证无 ID 字段时只返回 operation 名称
   - 验证复杂类型（map, slice）的哈希处理

3. ✅ **三种模式完整测试**
   - Enabled 模式: 使用 mock 数据，不执行真实函数
   - Record 模式: 执行真实函数并记录结果为 mock 数据
   - Disabled 模式: 直接执行真实函数（通过 InterceptLegacy）

4. ✅ **错误处理和边界情况**
   - 类型不匹配: mock 数据类型与期望返回类型不一致
   - 函数执行错误: 真实函数返回错误
   - Mock 数据不存在时的降级逻辑

5. ✅ **兼容性改进**
   - 更新旧的 closure-based 测试使用 `InterceptLegacy`
   - 新增 `interceptWithSession` helper 函数，使新 `Intercept` 支持旧的 `InterceptSession`
   - 确保新旧两种方式都能正常工作

**测试结果**:
- ✅ 所有 28 个测试用例全部通过
- ✅ 核心功能测试覆盖率:
  - `interceptWithSession`: 92.0%
  - `generateInterceptorID`: 86.7%
  - `InterceptLegacy`: 83.3%
- ✅ 总体测试覆盖率: 62.1%
  - HTTP middleware 相关函数 (0% coverage) 将在 Task 7 集成测试中验证

**关键测试示例**:
```go
// 测试结构体参数和自动 ID 生成
func TestIntercept_StructParams_EnabledMode_WithMock(t *testing.T) {
    session := &InterceptSession{
        Mode: InterceptModeEnabled,
        DataStore: NewInterceptDataStore(),
    }
    // Mock 数据使用自动生成的 ID "SimpleOp:test-123"
    session.DataStore.Set("SimpleOp:test-123", "mocked-result")

    ctx := WithInterceptSession(context.Background(), session)

    // 调用新的 Intercept 函数，传入结构体参数
    result, err := Intercept(ctx, "SimpleOp", mockableOp, SimpleParams{ID: "test-123"})

    // 验证: 返回 mock 数据，真实函数未被调用
    assert.Equal(t, "mocked-result", result)
    assert.False(t, realCalled)
}
```

