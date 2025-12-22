# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 0: 清理和删除 | 3 | 0.5 天 | | 无 |
| Phase 1: Mock 实例管理 | 4 | 1-2 天 | | Phase 0 |
| Phase 2: 执行引擎 Mock 模式支持 | 5 | 2-3 天 | | Phase 1 |
| Phase 3: Mock 执行 API 重构 | 4 | 1-2 天 | | Phase 2 |
| Phase 4: 前端 UI 更新 | 4 | 1-2 天 | | Phase 3 |
| Phase 5: 拦截器调用跟踪功能 | 3 | 1-2 天 | | Phase 2, Phase 3 |
| Phase 6: 前端执行结果展示面板 | 6 | 2-3 天 | | Phase 4, Phase 5 |
| Phase 7: Mock 控制面板布局优化 | 4 | 0.5 天 | | Phase 6 |
| **总计** | **33** | **9-15.5 天** | | |

## Phase 0: 清理和删除

- [x] 0.1 删除后端 Mock 配置管理代码
  - [x] 删除 `server/internal/handlers/mock_config.go`
  - [x] 删除 `server/internal/services/mock_config_service.go`
  - [x] 删除 `server/internal/models/mock_config.go`
  - [x] 从路由中移除 mock config 相关的路由注册
  - [x] 删除 mock_configs 数据库表迁移文件（如果有）

- [x] 0.2 删除后端所有 Mock API 接口
  - [x] 删除整个 `server/internal/handlers/mock.go` 文件
  - [x] 从路由中移除所有 Mock API 的路由注册：
    - `POST /api/workflows/:workflowId/mock/execute`
    - `POST /api/workflows/mock/instances/:instanceId/step`
    - `GET /api/workflows/mock/instances/:instanceId`
    - `POST /api/workflows/mock/instances` (如果存在)
    - `PUT /api/workflows/mock/instances/:instanceId` (如果存在)
    - `GET /api/workflows/mock/instances` (如果存在)
    - `GET /api/workflows/mock/executions/:executionId` (如果存在)
    - `POST /api/workflows/mock/executions/:executionId/continue` (如果存在)
    - `POST /api/workflows/mock/executions/:executionId/stop` (如果存在)
  - [x] 清理相关的测试文件
  - [x] 删除 `server/internal/services/mock_executor.go`
  - [x] 删除 `server/internal/services/mock_execution_store.go`

- [x] 0.3 删除前端 Debug 面板和 Mock API 调用代码
  - [x] 删除 `client/src/components/DebugPanel.vue`（如果存在）
  - [x] 从 `mockService.ts` 中删除所有 Mock API 方法
  - [x] 删除 `client/src/components/MockConfigPanel.vue` 组件
  - [x] 从 `BpmnEditorPage.vue` 中移除 MockConfigPanel 相关引用
  - [x] 从 MockControlPanel.vue、RightPanelContainer.vue、BpmnEditorPage.vue 中移除 configId prop
  - [x] 清理相关的路由和状态管理代码
  - [x] 删除相关的 TypeScript 类型定义（MockConfig, NodeConfig, GatewayConfig）


## Phase 1: Mock 实例管理

- [x] 1.1 创建 Mock 工作流实例数据模型
  - [x] 定义 `MockWorkflowInstance` 结构体
  - [x] 定义 `MockInstanceStore` 接口和内存实现
  - [x] 实现 Mock 实例的 CRUD 操作

- [x] 1.2 创建 Mock 实例管理服务
  - [x] 实现 `MockInstanceService`
  - [x] 实现创建 Mock 实例逻辑
  - [x] 实现获取和更新 Mock 实例逻辑

- [x] 1.3 创建 Mock 实例 API 端点
  - [x] 实现 `GET /api/workflows/mock/instances/:instanceId`
  - [x] 实现 `POST /api/workflows/mock/instances`（可选，用于手动创建）
  - [x] 实现 `PUT /api/workflows/mock/instances/:instanceId`（可选）

- [ ] 1.4 编写单元测试
  - [ ] 测试 Mock 实例创建和管理
  - [ ] 测试 Mock 实例存储

## Phase 2: 执行引擎 Mock 模式支持

- [x] 2.1 在执行引擎中添加 Mock 模式支持
  - [x] 在 `WorkflowEngineService` 中添加 Mock 模式标识（通过 context）
  - [x] 修改 `ExecuteFromNode` 方法支持 Mock 模式
  - [x] 添加 Mock 模式检查逻辑

- [x] 2.2 实现 Mock 服务调用器
  - [x] 创建 `MockServiceCaller` 接口和实现
  - [x] 在 `executeServiceTask` 中集成 Mock 调用器
  - [x] 实现 Mock 数据查找和返回逻辑

- [x] 2.3 修改执行引擎以支持 Mock 实例
  - [x] 修改 `ExecuteFromNode` 以接受 Mock 实例
  - [x] 确保 Mock 实例的状态更新逻辑与真实实例一致
  - [x] 处理 Mock 实例的版本管理

- [x] 2.4 实现 Mock 数据配置管理
  - [x] 定义 `MockExecutionConfig` 结构体
  - [x] 实现节点级别的 Mock 数据查找
  - [x] 实现 Mock 数据注入逻辑

- [ ] 2.5 编写单元测试
  - [ ] 测试 Mock 模式下的执行引擎
  - [ ] 测试 Mock 服务调用器
  - [ ] 测试 Mock 数据注入

## Phase 3: Mock 执行 API 重构

- [x] 3.1 重构 `ExecuteMock` 处理器
  - [x] 修改请求体结构，添加 `startNodeId`、`nodeMockData` 等字段
  - [x] 实现 Mock 实例自动创建逻辑
  - [x] 调用真实的执行引擎服务（Mock 模式）

- [x] 3.2 重构 `StepMockExecution` 处理器
  - [x] 修改请求体，支持 `businessParams` 和 `nodeMockData`
  - [x] 从 Mock 实例获取 `currentNodeIds`
  - [x] 调用执行引擎执行下一步

- [x] 3.3 更新 Mock 执行响应格式
  - [x] 响应包含 `workflowInstanceId`
  - [x] 响应包含 `currentNodeIds`（数组）
  - [x] 响应包含 `businessResponse` 和 `engineResponse`

- [ ] 3.4 编写集成测试
  - [ ] 测试完整的 Mock 执行流程
  - [ ] 测试 Mock 实例创建和更新
  - [ ] 测试多步骤执行

## Phase 4: 前端 UI 更新

- [x] 4.1 更新 Mock 控制面板
  - [x] 更新请求体结构以支持新的 API
  - [x] 添加执行结果显示（businessResponse 和 engineResponse）
  - [x] 更新状态管理以使用 instanceId 和 currentNodeIds

- [x] 4.2 更新 Mock 执行可视化
  - [x] 基于 `currentNodeIds` 数组显示当前节点
  - [x] 显示 Mock 实例信息（instanceId）
  - [x] 更新响应数据显示

- [x] 4.3 实现"下一步"功能
  - [x] 更新"单步"按钮使用新的 API（stepExecution）
  - [x] 支持传递 businessParams 和 nodeMockData

- [x] 4.4 更新 Mock 服务
  - [x] 修改 `executeWorkflow` 方法支持新的请求格式
  - [x] 修改 `stepExecution` 方法支持参数传递
  - [x] 添加获取 Mock 实例的方法（getInstance）
  - [x] 添加新的数据类型（ExecuteResult, MockInstance, NodeMockData）

## Phase 5: 拦截器调用跟踪功能

- [x] 5.1 后端：实现拦截器调用记录
  - [x] 在执行引擎中添加拦截器调用跟踪器
  - [x] 实现 `InterceptorCallRecorder` 接口和实现
  - [x] 在每个拦截器调用点添加记录逻辑
  - [x] 记录拦截器名称、调用顺序、时间戳、入参和出参

- [x] 5.2 后端：更新 Mock 执行响应
  - [x] 在 `ExecuteMockResponse` 中添加 `interceptorCalls` 字段
  - [x] 在 `StepExecutionResponse` 中添加 `interceptorCalls` 字段
  - [x] 确保拦截器调用记录按调用顺序返回

- [x] 5.3 后端：编写拦截器跟踪单元测试
  - [x] 测试拦截器调用记录功能
  - [x] 测试多种拦截器类型的跟踪
  - [x] 测试拦截器调用顺序和时间戳

## Phase 6: 前端执行结果展示面板

- [x] 6.1 添加接口选择器组件
  - [x] 在"开始执行"按钮上方添加下拉菜单
  - [x] 实现接口选择器逻辑（当前支持 `/api/execute/:workflowInstanceId`）
  - [x] 更新状态管理以存储选中的接口

- [x] 6.2 创建执行结果 Tabs 组件
  - [x] 在"开始执行"按钮下方添加 Ant Design Tabs 组件
  - [x] 创建三个 Tab 面板：请求/回包、拦截器调用、日志
  - [x] 实现 Tab 切换和状态保持

- [x] 6.3 实现"请求/回包" Tab 面板
  - [x] 创建上下分割的代码展示区域
  - [x] 上半部分：显示请求入参（可编辑 textarea）
  - [x] 下半部分：显示响应数据（可编辑 textarea）
  - [x] 添加 computed 属性处理 JSON 转换
  - [x] 添加代码编辑器样式（monospace 字体）
  - [x] 实现分隔条拖拽调整高度

- [x] 6.4 实现"拦截器调用" Tab 面板
  - [x] 创建上下分割的展示区域
  - [x] 上半部分：显示拦截器列表（支持点击选择）
  - [x] 下半部分：使用嵌套 Tabs 显示选中拦截器的入参和出参
  - [x] 入参/出参使用可编辑 textarea 显示 JSON
  - [x] 添加拦截器高亮选中效果
  - [x] 实现分隔条拖拽调整高度

- [x] 6.5 实现"日志" Tab 面板占位
  - [x] 创建占位区域
  - [x] 显示 "日志功能开发中，敬请期待" 提示文本
  - [x] 预留日志展示的空间布局

- [x] 6.6 更新 Mock 服务类型定义
  - [x] 添加 `InterceptorCall` 类型定义
  - [x] 更新 `ExecuteResult` 类型，添加 `interceptorCalls` 和 `requestParams` 字段
  - [x] 更新 TypeScript 类型声明

## Phase 7: Mock 控制面板布局优化

- [x] 7.1 调整标题栏布局
  - [x] 修改 panel-header 结构，添加按钮容器
  - [x] 将"开始执行"按钮移至标题栏右侧
  - [x] 调整标题栏 CSS 样式，使用 flexbox 布局
  - [x] 移除原有的 control-buttons 区域

- [x] 7.2 删除多余的UI元素
  - [x] 移除"单步 (Step)"按钮及相关逻辑
  - [x] 移除执行状态信息显示区域（执行状态、当前节点、实例ID）
  - [x] 保留接口选择器组件（数据源为前端配置）

- [x] 7.3 调整面板内容布局
  - [x] 确保 Tabs 占据面板主要空间
  - [x] 优化面板内容区域的 padding 和 margin

- [x] 7.4 更新按钮样式
  - [x] 调整"开始执行"按钮大小，适应标题栏高度
  - [x] 确保按钮的悬停状态样式正确
  - [x] 保持按钮的加载状态（loading spinner）显示

- [x] 7.5 测试和验证
  - [x] 测试"开始执行"按钮交互（点击、悬停）
  - [x] 验证面板布局在不同屏幕尺寸下的表现
  - [x] 验证 Tabs 内容区域的滚动和显示

## 验收标准

### Phase 0：清理和删除
- [x] 所有 Mock 配置管理相关代码已删除
- [x] 整个 `server/internal/handlers/mock.go` 文件已删除
- [x] 所有 Mock API 路由已从路由器中移除
- [x] MockConfigPanel 组件已删除
- [x] 前端 mockService 中的所有 Mock API 调用方法已删除
- [x] 相关的 TypeScript 类型定义已清理（MockConfig, NodeConfig, GatewayConfig）
- [x] configId prop 已从所有组件中移除
- [x] 代码编译通过，无引用错误
- [x] Mock 功能改为通过其他方式实现（不使用独立 API 端点）

### 基础功能（Phase 1-4，已完成）
- [ ] Mock 执行可以模拟真实的执行引擎接口
- [ ] Mock 执行自动创建和管理 Mock 工作流实例
- [ ] Mock 执行使用真实的执行引擎代码路径
- [ ] Mock 执行结果与流程图正确关联
- [ ] "下一步"功能可以继续执行并更新状态
- [ ] 所有 API 端点正常工作
- [ ] 前端 UI 响应式且易用
- [ ] 代码通过所有测试

### 新增功能（Phase 5-6）
- [x] 接口选择器当前支持 `/api/execute/:workflowInstanceId`
- [x] 执行结果 Tabs 正确显示在"开始执行"按钮下方
- [x] Tabs 包含"请求/回包"、"拦截器调用"、"日志"三个标签
- [x] "请求/回包" Tab 正确显示请求入参和响应数据
- [x] "请求/回包" Tab 的上下区域支持拖拽调整高度
- [x] "拦截器调用" Tab 正确显示拦截器列表
- [x] 点击拦截器列表项可以查看该拦截器的入参和出参
- [x] "拦截器调用" Tab 的上下区域支持拖拽调整高度
- [x] "日志" Tab 显示占位提示信息
- [x] 拦截器调用信息按调用顺序正确展示
- [x] 后端 API 正确返回拦截器调用记录（`interceptorCalls`）
- [x] 后端 API 正确返回请求入参（`requestParams`）
- [x] JSON 数据支持代码高亮和格式化
- [x] 所有代码展示区域支持复制功能
- [x] 前端 TypeScript 类型定义完整且正确
- [ ] 所有新功能的单元测试和集成测试通过（测试待编写）

### 新增功能（Phase 7 - Mock 控制面板布局优化）
- [x] "开始执行"按钮移至标题栏右侧
- [x] 标题栏使用 flexbox 布局（标题居左，按钮居右）
- [x] 按钮大小和样式适应标题栏高度
- [x] 原有独立控制按钮区域已移除
- [x] "单步 (Step)"按钮已移除
- [x] 执行状态信息显示区域已移除
- [x] 接口选择器保留（数据源为前端配置）
- [x] Tabs 占据面板主要空间
- [x] 标题栏有明显的底部边框分隔线
- [x] "开始执行"按钮交互状态正确（悬停、加载）

