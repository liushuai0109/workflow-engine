# 工作流编辑器规范(变更)

## REMOVED Requirements

### Requirement: 右侧拦截器控制面板

系统 SHALL 删除右侧面板中的拦截器 Tab 和相关组件。

#### Scenario: 删除拦截器 Tab

- **当** 重构拦截器控制方式时
- **则** 应从 RightPanelContainer 中删除拦截器 Tab
- **并且** 应删除 FilterOutlined 图标的导入
- **并且** 应删除 InterceptorControlPanel 组件的导入
- **并且** 应从 Props 类型中移除 'interceptor' 选项
- **并且** 应从 tabKeys 数组中移除 'interceptor'
- **并且** 应删除 interceptor-session-update 事件

#### Scenario: 保留拦截器服务

- **当** 删除 UI 组件时
- **则** 应保留 interceptorService.ts
- **并且** 拦截器逻辑将通过其他 UI 方式集成
- **并且** 具体集成方式在实施阶段确定

## ADDED Requirements

### Requirement: 全局 API 客户端拦截器支持

系统 SHALL 提供全局 API 客户端以统一管理拦截器配置和 Headers。

#### Scenario: 设置拦截器配置

- **当** 需要为请求配置拦截器时
- **则** 应调用 `apiClient.setInterceptorConfig(config)`
- **并且** config 为对象,键为拦截器 ID,值为模式(enabled/disabled/record)
- **并且** 后续所有请求自动携带 `X-Intercept-Config` Header
- **并且** Header 值应为 URL encoded 的 JSON 字符串

#### Scenario: 更新单个拦截器模式

- **当** 需要修改某个拦截器的模式时
- **则** 应调用 `apiClient.updateInterceptorMode(interceptorId, mode)`
- **并且** 如果 mode 为 'default',应从配置中删除该拦截器
- **并且** 配置应立即同步,影响后续请求

#### Scenario: 清除拦截器配置

- **当** 需要清除所有拦截器配置时
- **则** 应调用 `apiClient.clearInterceptorConfig()`
- **并且** 后续请求不再包含 `X-Intercept-Config` Header
- **并且** 所有拦截器使用默认 record 模式

#### Scenario: Dry-run 请求

- **当** 需要获取拦截器清单时
- **则** 应调用 `apiClient.dryRun(url, options)`
- **并且** 请求应包含 `X-Intercept-Dry-Run: true` Header
- **并且** 返回 Promise<InterceptorInfo[]>
- **并且** InterceptorInfo 包含 id, operation, params 字段

### Requirement: 拦截器配置 UI(待设计)

系统 SHALL 提供用户界面以管理拦截器配置(具体实现待定)。

#### Scenario: 获取拦截器清单

- **当** 用户需要配置拦截器时
- **则** UI 应提供方式触发 Dry-run 请求
- **并且** 显示返回的拦截器列表
- **并且** 列表应包含:
  - 拦截器 ID(唯一标识)
  - 操作名称
  - 参数信息

#### Scenario: 配置拦截器模式

- **当** 用户选择某个拦截器时
- **则** UI 应提供模式选择(enabled/disabled/record)
- **并且** 应显示当前配置的模式
- **并且** 模式变更应实时生效

#### Scenario: 应用配置并执行

- **当** 用户完成配置后
- **则** UI 应提供执行按钮
- **并且** 执行时应自动携带配置 Header
- **并且** 应显示执行结果和拦截器调用信息

## MODIFIED Requirements

无修改的需求。

## 交叉引用

- 依赖于 `backend-server` 规范中的 Dry-run API 和配置解析功能
- 与 RightPanelContainer 组件集成
- 扩展现有的 API 客户端功能
