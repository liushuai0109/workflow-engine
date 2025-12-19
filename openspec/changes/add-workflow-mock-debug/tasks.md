# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1 | 6 | 3-4 天 | | 无 |
| Phase 2 | 8 | 5-6 天 | | Phase 1 |
| Phase 3 | 6 | 3-4 天 | | Phase 2 |
| Phase 4 | 4 | 2-3 天 | | Phase 3 |
| **总计** | **24** | **13-17 天** | | |

## Phase 1: 后端 Mock 执行引擎基础

- [ ] 1.1 创建 Mock 执行引擎服务 (`server/internal/services/mockExecutor.go`)
  - 实现 BPMN XML 解析
  - 实现节点执行逻辑（支持任务、网关、事件）
  - 实现 Mock 响应处理
  - 实现执行状态管理

- [ ] 1.2 创建 Mock 配置数据模型 (`server/internal/models/mockConfig.go`)
  - 定义 MockConfig 结构体
  - 定义 NodeMockConfig 结构体
  - 定义 GatewayMockConfig 结构体
  - 实现数据库迁移脚本

- [ ] 1.3 创建 Mock 执行 API 处理器 (`server/internal/handlers/mock.go`)
  - 实现 `POST /api/workflows/:workflowId/mock/execute`
  - 实现 `GET /api/workflows/mock/executions/:executionId`
  - 实现 `POST /api/workflows/mock/executions/:executionId/step`
  - 实现 `POST /api/workflows/mock/executions/:executionId/continue`
  - 实现 `POST /api/workflows/mock/executions/:executionId/stop`

- [ ] 1.4 创建 Mock 配置管理 API (`server/internal/handlers/mockConfig.go`)
  - 实现 `POST /api/workflows/:workflowId/mock/configs`
  - 实现 `GET /api/workflows/:workflowId/mock/configs`
  - 实现 `GET /api/workflows/mock/configs/:configId`
  - 实现 `PUT /api/workflows/mock/configs/:configId`
  - 实现 `DELETE /api/workflows/mock/configs/:configId`

- [ ] 1.5 注册路由 (`server/internal/routes/`)
  - 添加 Mock 相关路由
  - 添加路由中间件

- [ ] 1.6 编写单元测试
  - 测试 Mock 执行引擎
  - 测试 Mock 配置管理
  - 测试 API 端点

## Phase 2: 后端 Debug 功能

- [ ] 2.1 创建 Debug 会话管理服务 (`server/internal/services/debugSession.go`)
  - 实现 Debug 会话创建和管理
  - 实现断点管理
  - 实现调用栈管理
  - 实现执行历史记录

- [ ] 2.2 创建 Debug 数据模型 (`server/internal/models/debugSession.go`)
  - 定义 DebugSession 结构体
  - 定义 Breakpoint 结构体
  - 实现数据库迁移脚本

- [ ] 2.3 创建 Debug API 处理器 (`server/internal/handlers/debug.go`)
  - 实现 `POST /api/workflows/:workflowId/debug/start`
  - 实现 `POST /api/workflows/debug/sessions/:sessionId/step`
  - 实现 `POST /api/workflows/debug/sessions/:sessionId/continue`
  - 实现 `GET /api/workflows/debug/sessions/:sessionId`
  - 实现 `POST /api/workflows/debug/sessions/:sessionId/breakpoints`
  - 实现 `GET /api/workflows/debug/sessions/:sessionId/variables`
  - 实现 `GET /api/workflows/debug/sessions/:sessionId/nodes/:nodeId`
  - 实现 `POST /api/workflows/debug/sessions/:sessionId/stop`

- [ ] 2.4 集成 Debug 功能到执行引擎
  - 在执行引擎中添加断点检查
  - 添加单步执行支持
  - 添加变量监控

- [ ] 2.5 注册 Debug 路由
  - 添加 Debug 相关路由

- [ ] 2.6 编写单元测试
  - 测试 Debug 会话管理
  - 测试断点功能
  - 测试 Debug API

- [ ] 2.7 实现执行历史记录
  - 记录每个节点的执行信息
  - 实现历史查询接口

- [ ] 2.8 实现变量监控
  - 实现变量值跟踪
  - 实现变量变化通知

## Phase 3: 前端 Mock 功能 UI

- [ ] 3.1 创建 Mock 控制面板组件 (`client/src/components/MockControlPanel.vue`)
  - 实现 Mock 执行控制按钮（开始、暂停、停止）
  - 实现执行状态显示
  - 实现执行进度显示

- [ ] 3.2 创建 Mock 配置面板组件 (`client/src/components/MockConfigPanel.vue`)
  - 实现节点 Mock 配置表单
  - 实现网关分支选择
  - 实现配置保存/加载

- [ ] 3.3 创建 Mock 服务 (`client/src/services/mockService.ts`)
  - 实现 Mock 执行 API 调用
  - 实现 Mock 配置管理 API 调用
  - 实现执行状态轮询

- [ ] 3.4 集成到 BpmnEditor 组件
  - 添加 Mock 控制面板到编辑器
  - 实现节点高亮显示（执行状态）
  - 实现执行路径高亮

- [ ] 3.5 实现 Mock 执行可视化
  - 节点状态高亮（运行中、已完成、失败）
  - 执行路径连线高亮
  - 执行进度百分比显示

- [ ] 3.6 实现 Mock 结果展示
  - 执行结果摘要面板
  - 节点执行详情列表
  - 变量最终值显示

## Phase 4: 前端 Debug 功能 UI

- [ ] 4.1 创建 Debug 控制面板组件 (`client/src/components/DebugControlPanel.vue`)
  - 实现 Debug 控制按钮（开始、单步、继续、停止）
  - 实现断点管理 UI
  - 实现执行状态显示

- [ ] 4.2 创建变量监视面板组件 (`client/src/components/VariableWatchPanel.vue`)
  - 实现变量列表显示
  - 实现变量值展开/折叠
  - 实现变量搜索过滤
  - 实现变量值变化高亮

- [ ] 4.3 创建执行历史时间线组件 (`client/src/components/ExecutionTimeline.vue`)
  - 实现时间线视图
  - 实现历史记录详情
  - 实现记录跳转功能

- [ ] 4.4 创建 Debug 服务 (`client/src/services/debugService.ts`)
  - 实现 Debug API 调用
  - 实现断点管理
  - 实现变量监控
  - 实现执行历史获取

- [ ] 4.5 集成到 BpmnEditor 组件
  - 添加 Debug 控制面板
  - 添加变量监视面板
  - 添加执行历史面板
  - 实现断点标记显示

- [ ] 4.6 实现 Debug 可视化
  - 当前执行节点高亮
  - 断点节点标记
  - 执行路径高亮
  - 节点输入输出显示

- [ ] 4.7 实现节点右键菜单
  - 添加"设置断点"选项
  - 添加"移除断点"选项
  - 添加"查看详情"选项

- [ ] 4.8 编写前端测试
  - 测试 Mock 功能组件
  - 测试 Debug 功能组件
  - 测试服务层

## 验收标准

- [ ] Mock 执行可以成功模拟工作流执行
- [ ] Mock 配置可以保存和加载
- [ ] Debug 模式支持单步执行和断点
- [ ] 变量监视面板正确显示变量值
- [ ] 执行历史时间线正确显示执行记录
- [ ] 所有 API 端点正常工作
- [ ] 前端 UI 响应式且易用
- [ ] 代码通过所有测试

