# 工作流 Mock 和 Debug 功能技术设计

## 上下文

工作流 Mock 和 Debug 功能需要在 BPMN 工作流编辑器中实现，用于：
1. **Mock 执行**：在不连接真实服务的情况下模拟工作流执行，用于测试和验证
2. **Debug 调试**：提供单步执行、断点、变量监控等调试功能

这是一个跨领域的变更，涉及前端 UI、后端 API、执行引擎等多个组件。

## 目标 / 非目标

### 目标
- 提供完整的 Mock 执行功能，支持配置节点响应和网关分支
- 提供完整的 Debug 功能，支持单步执行、断点、变量监控
- 提供直观的可视化界面，实时显示执行状态
- 支持 Mock 配置的保存和加载
- 提供执行历史记录和变量追踪

### 非目标
- 不实现真实的工作流执行引擎（仅 Mock 和 Debug）
- 不实现复杂的工作流编排功能
- 不实现分布式执行（单机执行即可）
- 不实现性能优化（优先功能完整性）

## 决策

### 决策 1: Mock 执行引擎架构

**选择**：在后端实现轻量级的 Mock 执行引擎，解析 BPMN XML 并模拟执行。

**理由**：
- 后端执行可以复用，前端只需调用 API
- 执行逻辑集中管理，易于维护
- 可以支持未来的真实执行引擎集成

**考虑的替代方案**：
- 前端执行：执行逻辑复杂，前端性能受限
- 使用现有工作流引擎（如 Camunda）：过于重量级，不符合 Mock 需求

### 决策 2: BPMN 解析库

**选择**：使用 Go 语言的 BPMN 解析库（如 `github.com/deemount/gobpmn`）或自行实现简单解析。

**理由**：
- 后端使用 Go，需要 Go 语言的 BPMN 解析能力
- 如果现有库不满足需求，可以实现最小化的解析器（仅解析需要的元素）

**考虑的替代方案**：
- 使用 Node.js 后端：项目已有 Go 后端，保持一致性
- 前端解析后传给后端：增加复杂度，不利于复用

### 决策 3: 执行状态管理

**选择**：使用内存存储 + 数据库持久化的混合方案。

**理由**：
- 活跃的执行会话存储在内存中，响应快速
- 执行历史持久化到数据库，支持查询和恢复
- 支持 WebSocket 实时推送（未来扩展）

**考虑的替代方案**：
- 纯内存存储：数据易丢失，不支持历史查询
- 纯数据库存储：性能较差，不适合频繁更新

### 决策 4: 前端可视化方案

**选择**：使用 bpmn-js 的渲染能力，通过自定义模块实现节点高亮和状态显示。

**理由**：
- 复用现有的 bpmn-js 渲染能力
- 可以通过自定义样式和标记实现状态可视化
- 与现有编辑器无缝集成

**考虑的替代方案**：
- 使用独立的可视化库：增加复杂度，与编辑器分离
- 完全自定义渲染：工作量大，维护成本高

### 决策 5: Mock 配置存储

**选择**：Mock 配置存储在数据库中，与工作流关联。

**理由**：
- 配置可以持久化，支持多用户共享
- 可以版本化管理配置
- 支持配置的导入导出

**考虑的替代方案**：
- 仅前端存储：数据易丢失，不支持共享
- 配置文件存储：不利于管理和查询

## 技术架构

### 后端架构

```
┌─────────────────────────────────────────┐
│         API Handlers                    │
│  - mock.go (Mock API)                   │
│  - debug.go (Debug API)                 │
│  - mockConfig.go (配置管理)              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Services                        │
│  - mockExecutor.go (Mock 执行引擎)       │
│  - debugSession.go (Debug 会话管理)      │
│  - mockConfigService.go (配置服务)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Models                          │
│  - mockConfig.go                        │
│  - debugSession.go                      │
│  - executionHistory.go                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Database                        │
│  - mock_configs 表                      │
│  - debug_sessions 表                    │
│  - execution_histories 表                │
└─────────────────────────────────────────┘
```

### 前端架构

```
┌─────────────────────────────────────────┐
│         BpmnEditor.vue                  │
│  - 集成 Mock/Debug 面板                  │
│  - 节点状态可视化                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Components                      │
│  - MockControlPanel.vue                 │
│  - MockConfigPanel.vue                  │
│  - DebugControlPanel.vue                │
│  - VariableWatchPanel.vue               │
│  - ExecutionTimeline.vue                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Services                        │
│  - mockService.ts                       │
│  - debugService.ts                      │
└─────────────────────────────────────────┘
```

### 数据模型

#### MockConfig
```go
type MockConfig struct {
    ID          string                 `json:"id" db:"id"`
    WorkflowID string                 `json:"workflowId" db:"workflow_id"`
    Name        string                 `json:"name" db:"name"`
    Description string                 `json:"description" db:"description"`
    NodeConfigs map[string]NodeConfig  `json:"nodeConfigs" db:"node_configs"`
    GatewayConfigs map[string]GatewayConfig `json:"gatewayConfigs" db:"gateway_configs"`
    CreatedAt   time.Time              `json:"createdAt" db:"created_at"`
    UpdatedAt   time.Time              `json:"updatedAt" db:"updated_at"`
}

type NodeConfig struct {
    MockResponse interface{} `json:"mockResponse"`
    Delay        int         `json:"delay"`        // 毫秒
    ShouldFail   bool        `json:"shouldFail"`
    ErrorMessage string      `json:"errorMessage"`
}

type GatewayConfig struct {
    SelectedPath string `json:"selectedPath"` // 选择的路径 ID
}
```

#### DebugSession
```go
type DebugSession struct {
    ID            string            `json:"id" db:"id"`
    WorkflowID    string            `json:"workflowId" db:"workflow_id"`
    ExecutionID   string            `json:"executionId" db:"execution_id"`
    Status        string            `json:"status" db:"status"`
    CurrentNodeID string            `json:"currentNodeId" db:"current_node_id"`
    Variables     map[string]interface{} `json:"variables" db:"variables"`
    Breakpoints   []string          `json:"breakpoints" db:"breakpoints"`
    CallStack     []CallStackFrame  `json:"callStack" db:"call_stack"`
    CreatedAt     time.Time         `json:"createdAt" db:"created_at"`
    UpdatedAt     time.Time         `json:"updatedAt" db:"updated_at"`
}
```

## 风险 / 权衡

### 风险 1: BPMN 解析复杂度
**风险**：BPMN XML 结构复杂，完整解析可能工作量较大。

**缓解措施**：
- 先实现最小化解析器，仅解析需要的元素（任务、网关、事件、连线）
- 如果现有库可用，优先使用库
- 分阶段实现，先支持简单流程，再扩展复杂场景

### 风险 2: 执行状态同步
**风险**：前端需要实时显示执行状态，轮询可能延迟。

**缓解措施**：
- 使用短轮询（1-2秒）获取状态
- 未来可以扩展 WebSocket 实时推送
- 前端缓存状态，减少不必要的请求

### 风险 3: 性能问题
**风险**：复杂工作流的 Mock 执行可能较慢。

**缓解措施**：
- Mock 执行不涉及真实 I/O，性能应该足够
- 如果性能有问题，可以优化执行引擎算法
- 支持异步执行，不阻塞 UI

### 风险 4: 前端可视化复杂度
**风险**：在 bpmn-js 上实现状态可视化可能复杂。

**缓解措施**：
- 使用 bpmn-js 的自定义模块和标记功能
- 参考 bpmn-js 文档和示例
- 分阶段实现，先实现基本高亮，再扩展复杂效果

## 实施计划

### Phase 1: 后端 Mock 执行引擎（3-4 天）
1. 实现 BPMN 解析器（最小化）
2. 实现 Mock 执行引擎核心逻辑
3. 实现 Mock 配置管理
4. 实现 API 端点
5. 编写测试

### Phase 2: 后端 Debug 功能（5-6 天）
1. 实现 Debug 会话管理
2. 实现断点功能
3. 实现单步执行
4. 实现变量监控
5. 实现执行历史
6. 实现 API 端点
7. 编写测试

### Phase 3: 前端 Mock 功能 UI（3-4 天）
1. 实现 Mock 控制面板
2. 实现 Mock 配置面板
3. 实现 Mock 服务
4. 集成到编辑器
5. 实现可视化效果

### Phase 4: 前端 Debug 功能 UI（2-3 天）
1. 实现 Debug 控制面板
2. 实现变量监视面板
3. 实现执行历史时间线
4. 实现 Debug 服务
5. 集成到编辑器
6. 实现可视化效果

## 未决问题

- [ ] 选择哪个 Go BPMN 解析库，还是自行实现？
- [ ] Mock 执行是否需要支持并行网关？
- [ ] Debug 断点是否支持条件断点？
- [ ] 执行历史是否需要支持回放功能？

## 后续优化

- 支持 WebSocket 实时推送执行状态
- 支持执行历史回放
- 支持条件断点
- 支持变量值修改（在 Debug 模式下）
- 支持执行性能分析
- 支持 Mock 配置模板和共享

