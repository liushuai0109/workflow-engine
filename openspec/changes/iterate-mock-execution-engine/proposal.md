# 变更：迭代 Mock 执行引擎功能

## 为什么

当前的 Mock 功能直接基于工作流定义（BPMN XML）执行，与实际的生产执行引擎（通过 `POST /api/execute/:workflowInstanceId` 接口）存在差异。为了更真实地模拟生产环境，Mock 功能应该：

1. **模拟真实的执行接口**：Mock 应该能够模拟真实的流程引擎执行接口（如 `POST /api/execute/:workflowInstanceId`），使用相同的参数和数据结构
2. **Mock 工作流实例数据**：在执行 Mock 时，应该能够创建和管理 Mock 的工作流实例（workflow_instance），就像真实环境一样
3. **统一的执行流程**：Mock 执行应该使用与真实执行引擎相同的代码路径，只是用 Mock 数据替代真实的外部服务调用
4. **更好的可视化**：执行结果应该与流程图更好地关联，清晰显示当前执行位置
5. **简化架构**：移除不必要的配置管理接口和调试面板，聚焦核心执行功能

这样可以确保 Mock 环境与生产环境的行为一致性，提高测试的可靠性，同时降低系统复杂度。

## 变更内容

### 删除的功能

- **REMOVED**: Debug 面板
  - 移除前端的 Debug 面板组件
  - 移除 Debug 面板相关的路由和状态管理
  - Debug 功能整合到 Mock 控制面板的 Tabs 中（日志、拦截器调用等）

- **REMOVED**: 所有 Mock 专用 API 接口
  - Mock 功能将通过其他方式传递参数，不再使用独立的 Mock API 端点
  - **删除 Mock 配置管理接口**：
    - 删除 `POST /api/workflows/:workflowId/mock/configs`（创建 Mock 配置）
    - 删除 `GET /api/workflows/:workflowId/mock/configs`（获取工作流的所有 Mock 配置）
    - 删除 `GET /api/workflows/mock/configs/:configId`（获取单个 Mock 配置）
    - 删除 `PUT /api/workflows/mock/configs/:configId`（更新 Mock 配置）
    - 删除 `DELETE /api/workflows/mock/configs/:configId`（删除 Mock 配置）
    - 删除后端 `MockConfigHandler` 和 `MockConfigService`
    - 删除 `mock_configs` 数据库表（如果有）
  - **删除 Mock 实例管理接口**：
    - 删除 `POST /api/workflows/mock/instances`（手动创建 Mock 实例）
    - 删除 `PUT /api/workflows/mock/instances/:instanceId`（更新 Mock 实例）
    - 删除 `GET /api/workflows/mock/instances`（列出所有 Mock 实例）
    - 删除 `GET /api/workflows/mock/instances/:instanceId`（获取单个实例）
  - **删除 Mock 执行接口**：
    - 删除 `POST /api/workflows/:workflowId/mock/execute`（启动 Mock 执行）
    - 删除 `POST /api/workflows/mock/instances/:instanceId/step`（单步执行）
    - 删除 `GET /api/workflows/mock/executions/:executionId`（旧的执行查询接口）
    - 删除 `POST /api/workflows/mock/executions/:executionId/continue`（继续执行）
    - 删除 `POST /api/workflows/mock/executions/:executionId/stop`（停止执行）
  - **删除 Mock API 元数据接口**：
    - 删除计划中的 `GET /api/workflows/mock/api-schemas`（获取接口定义）
  - Mock 数据将通过其他方式传递（具体方式待定）

### 保留和修改的功能

- **MODIFIED**: Mock 执行方式（前端配置方案）
  - Mock 功能不再使用独立的 API 端点
  - **接口选择列表数据源**：直接在前端 Mock 控制面板中硬编码配置
    - 前端定义支持的接口列表（如 `POST /api/execute/:workflowInstanceId`）
    - 前端定义每个接口的参数结构和默认值
    - 不需要从后端获取接口定义
  - **Mock 数据配置**：在前端组件中配置 Mock 数据和执行逻辑
    - 用户可以在"请求/回包" Tab 中直接编辑请求参数
    - Mock 执行逻辑在前端实现（模拟执行流程）
  - 前端 Mock 控制面板保留，用于配置和触发 Mock 执行

- **MODIFIED**: Mock 执行引擎
  - Mock 执行可以选择两种模式：
    - **前端模拟模式**：完全在前端模拟执行流程，不调用后端
    - **真实引擎模式**：调用真实的执行引擎服务（WorkflowEngineService）
  - 使用 Mock 数据替代真实的外部服务调用
  - 保持与真实执行引擎相同的执行逻辑和状态管理

- **MODIFIED**: Mock 执行可视化
  - 执行结果与流程图节点关联
  - 清晰显示当前执行节点（currentNodeIds）
  - 支持通过"开始执行"按钮触发执行

- **MODIFIED**: Mock 控制面板布局
  - 标题栏布局调整：
    - 标题"Mock 执行控制"居左
    - "开始执行"按钮移至标题栏右侧
  - 面板内容区域布局：
    - 接口选择器显示在顶部（数据源为前端硬编码配置）
    - Tabs 组件占据面板主要空间
  - 移除原有的控制按钮区域（buttons section）
  - 移除"单步 (Step)"按钮
  - 移除执行状态信息显示区域（执行状态、当前节点、实例ID）

- **ADDED**: 接口选择器（前端配置）
  - 在面板内容区域顶部添加接口选择器
  - 接口列表在前端硬编码配置，包括：
    - 接口路径（如 `POST /api/execute/:workflowInstanceId`）
    - 接口描述
    - 参数结构定义（字段名、类型、是否必填、默认值、占位符等）
  - 选择接口后，自动在"请求/回包" Tab 中填充该接口的默认请求参数
  - 参数默认值根据前端配置的参数结构生成

- **ADDED**: Mock 执行信息展示 Tabs
  - Tabs 直接放置在控制面板内容区域
  - Tabs 始终可见，不依赖是否有执行结果
  - 点击"开始执行"后，Tabs 内容会动态更新显示执行信息
  - Tab 项包括：
    - **请求/回包**：显示执行接口的请求参数和响应数据
    - **拦截器调用**：展示执行过程中调用的拦截器列表及其参数和返回值
    - **日志**：显示执行过程中的日志信息（待实现）

- **ADDED**: 请求/回包 Tab 内容
  - Tab 面板分为上下两个代码输入框（可编辑）
  - 上半部分：显示和编辑请求的入参（JSON 格式）
    - 数据从执行请求的入参转化而来
    - 支持 JSON 格式编辑
  - 下半部分：显示和编辑回包数据（JSON 格式）
    - 数据从执行响应的回包转化而来
    - 包含 businessResponse 和 engineResponse
    - 支持 JSON 格式编辑
  - 执行前为空，执行后动态填充数据
  - 支持代码高亮和格式化

- **ADDED**: 拦截器调用 Tab 内容
  - Tab 面板分为上下两部分
  - 上半部分：显示调用的拦截器列表（可选择）
  - 下半部分：显示选中拦截器的详细信息（使用 Tabs）
    - Tab 项：
      - "入参" Tab：显示和编辑拦截器函数的入参（JSON 格式代码输入框）
      - "回包" Tab：显示和编辑拦截器函数的出参（JSON 格式代码输入框）
    - 支持 JSON 格式编辑和代码高亮
  - 支持按调用顺序展示拦截器
  - 执行前列表为空，执行后动态填充拦截器调用记录

## 影响

- **受影响的规范**：
  - `backend-server` - 删除所有 Mock API（配置管理、实例管理、执行接口）
  - `workflow-editor` - 删除 Debug 面板，优化 Mock 控制面板布局

- **删除的代码**：
  - `server/internal/handlers/mock_config.go` - 删除整个文件（Mock 配置管理）
  - `server/internal/services/mock_config_service.go` - 删除整个文件
  - `server/internal/models/mock_config.go` - 删除整个文件
  - `server/internal/handlers/mock.go` 中的所有 API 方法（删除整个 handler）
  - `client/src/components/DebugPanel.vue` - 删除 Debug 面板组件（如果存在）
  - `client/src/services/mockService.ts` 中的所有 Mock API 方法

- **修改的代码**：
  - `server/internal/services/mock_executor.go` - 重构 Mock 执行逻辑（不使用 API 端点）
  - `server/internal/services/workflow_engine.go` - 添加 Mock 模式支持和拦截器跟踪
  - `server/internal/services/interceptor_call_recorder.go` - 新增拦截器调用记录器
  - `server/internal/interceptor/interceptor.go` - 添加调用记录回调机制
  - `client/src/components/MockControlPanel.vue` - 重构 UI 布局，优化按钮位置和面板布局，添加接口选择器
  - `client/src/services/mockService.ts` - 重构为前端配置方案，不依赖 Mock API
  - `client/src/config/mockApiConfig.ts` - 新增前端接口配置文件（硬编码接口列表和参数结构）

- **数据库变更**：
  - 删除 `mock_configs` 表（如果存在）
  - 保留 `mock_instances` 内存存储（不需要数据库持久化）

