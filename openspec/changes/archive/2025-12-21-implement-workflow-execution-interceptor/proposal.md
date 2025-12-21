# 变更：实现工作流执行拦截器（Interceptor）

## 为什么

当前 Mock 执行功能存在以下问题：

1. **与真实执行逻辑不一致**：Mock 执行有独立的执行逻辑，与真实的 `WorkflowEngineService` 不同，导致行为可能不一致
2. **数据层耦合**：Mock 数据直接嵌入执行逻辑中，缺乏统一的拦截机制
3. **停留点机制缺失**：没有利用工作流中天然的停留点（UserTask、EventBasedGateway 等），而是在每个节点都停留
4. **模式切换困难**：无法灵活地在 Mock 模式、真实模式和记录模式之间切换
5. **调试能力弱**：缺乏完整的执行日志，无法追踪哪些调用使用了 Mock 数据

为了解决这些问题，我们需要实现一个**工作流执行拦截器（Workflow Execution Interceptor）**框架，它能够：

- **复用真实逻辑**：使用与真实执行完全相同的业务代码
- **数据层拦截**：只在数据访问层进行拦截，不修改流程控制
- **自然停留点**：利用工作流中已有的 `shouldAutoAdvance=false` 节点作为停留点
- **统一拦截机制**：通过统一的 `intercept()` 函数处理所有数据访问
- **多模式支持**：支持 Mock 模式、真实模式和记录模式

## 变更内容

### ADDED: 拦截器框架核心

- 创建 `server/internal/interceptor` 包
- 实现核心拦截器函数 `Intercept[T](ctx, operation, realFn)`
- 支持三种执行模式：
  - `InterceptModeDisabled`: 禁用拦截，直接执行真实函数
  - `InterceptModeEnabled`: 启用拦截，优先返回 Mock 数据
  - `InterceptModeRecord`: 记录模式，执行真实函数并记录结果作为 Mock 数据

### ADDED: 拦截会话（Intercept Session）管理

- `InterceptSession` 数据结构，包含：
  - `ID`: 会话 ID
  - `InstanceID`: 工作流实例 ID
  - `Mode`: 拦截模式
  - `DataStore`: Mock 数据存储
  - `ExecutionLog`: 执行日志（记录每次调用是 Mock 还是真实）
- 通过 Context 传递 Session
- Session 存储管理（内存存储，可选 Redis）

### ADDED: Mock 数据存储

- `InterceptDataStore` 实现
- 支持按操作名称存储和获取 Mock 数据
- 支持批量设置 Mock 数据
- 支持从 JSON 加载/导出 Mock 数据
- 线程安全（使用 sync.RWMutex）

### MODIFIED: WorkflowEngineService 集成拦截器

- 在所有数据访问点使用 `Intercept()` 包装：
  - `GetWorkflowInstance` - 获取工作流实例
  - `GetWorkflow` - 获取工作流定义
  - `ServiceTask` 调用 - 调用外部服务
  - `UserTask` 创建 - 创建用户任务
  - `IntermediateCatchEvent` - 等待事件
  - `UpdateInstance` - 更新实例
- 保持 `shouldAutoAdvance()` 机制不变，利用自然停留点

### ADDED: 拦截器 HTTP API

新增以下 API 端点：

- `POST /api/interceptor/workflows/:workflowId/execute` - 初始化拦截执行
- `POST /api/interceptor/instances/:instanceId/trigger` - 触发节点继续执行
- `GET /api/interceptor/sessions/:sessionId` - 获取会话信息
- `GET /api/interceptor/sessions/:sessionId/log` - 获取执行日志
- `POST /api/interceptor/sessions/:sessionId/reset` - 重置执行

### MODIFIED: 前端 Mock 控制面板

- 更新为"执行拦截器控制面板"
- 支持初始化拦截会话
- 支持触发停留点节点（UserTask、EventBasedGateway 等）
- 显示当前节点信息和是否需要手动触发
- 为 UserTask 显示表单，为 EventBasedGateway 显示事件选项
- 显示执行日志，区分 Mock 调用和真实调用

## 影响

### 受影响的规范

- **backend-server**: 添加拦截器框架和 API
- **workflow-editor**: 更新 Mock 控制面板为拦截器控制面板

### 受影响的代码

#### 新增文件

- `server/internal/interceptor/interceptor.go` - 核心拦截器
- `server/internal/interceptor/data_store.go` - 数据存储
- `server/internal/interceptor/session_store.go` - 会话存储
- `server/internal/handlers/interceptor.go` - HTTP 处理器
- `client/src/services/interceptorService.ts` - 前端服务
- `client/src/components/InterceptorControlPanel.vue` - 控制面板

#### 修改文件

- `server/internal/services/workflow_engine.go` - 集成拦截器
- `server/internal/routes/routes.go` - 添加路由
- `client/src/pages/BpmnEditorPage.vue` - 集成新控制面板

#### 可能废弃的文件（向后兼容保留）

- `server/internal/handlers/mock.go` - 旧的 Mock Handler
- `server/internal/services/mock_executor.go` - 旧的 Mock 执行器
- `client/src/components/MockControlPanel.vue` - 旧的控制面板

### 数据库影响

无需数据库更改。拦截会话和 Mock 数据存储在内存中。

### API 兼容性

- 新增 API 端点，不影响现有 API
- 旧的 Mock API 保持向后兼容
- 建议新功能使用拦截器 API

### 性能影响

- 拦截器增加轻微的函数调用开销（纳秒级）
- Mock 数据查询为 O(1) 复杂度（map 查询）
- 执行日志会占用内存，建议限制日志条数

## 实施计划

分为 4 个阶段，共约 10 天：

1. **Phase 1: 核心框架** (2天)
2. **Phase 2: 引擎集成** (3天)
3. **Phase 3: HTTP API** (2天)
4. **Phase 4: 前端集成** (3天)

详见 `tasks.md`

## 验收标准

- [ ] 拦截器框架通过单元测试
- [ ] 工作流引擎正确集成拦截器
- [ ] 所有数据访问点都使用 `Intercept()` 包装
- [ ] `shouldAutoAdvance` 机制正确工作
- [ ] HTTP API 正常工作，返回正确的数据结构
- [ ] 前端控制面板可以初始化会话并触发节点
- [ ] UserTask 和 EventBasedGateway 等停留点正确暂停
- [ ] 执行日志正确记录 Mock 和真实调用
- [ ] 记录模式可以自动生成 Mock 数据
- [ ] 代码通过所有测试（单元测试、集成测试）

## 风险

1. **性能风险**: 拦截器增加的开销
   - **缓解措施**: 基准测试验证，预期影响小于 1%

2. **兼容性风险**: 与现有 Mock 功能的兼容性
   - **缓解措施**: 保留旧 API，提供迁移文档

3. **复杂度风险**: 引入新的抽象层
   - **缓解措施**: 详细的文档和示例代码

## 参考

- 设计文档: `docs/MOCK_MOCKER_FRAMEWORK_DESIGN.md`
- 现有 Mock 实现: `server/internal/services/mock_executor.go`
- 工作流引擎: `server/internal/services/workflow_engine.go`
