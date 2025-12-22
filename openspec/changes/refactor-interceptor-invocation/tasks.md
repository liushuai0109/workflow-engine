# 任务列表:重构拦截器调用方式

## 后端实现

### 1. 实现泛型拦截器函数 (后端核心)
- [ ] 在 `server/internal/interceptor/interceptor.go` 中实现 `Intercept0` 函数
- [ ] 实现 `Intercept1` 函数(1 个参数)
- [ ] 实现 `Intercept2` 函数(2 个参数)
- [ ] 实现 `Intercept3` 函数(3 个参数)
- [ ] 实现 `Intercept4` 函数(4 个参数)
- [ ] 实现 `Intercept5` 函数(5 个参数)
- [ ] 保留原 `Intercept` 函数作为兼容层,映射到 `Intercept0`
- [ ] 验证: 编译通过,所有新函数签名正确

### 2. 实现参数序列化功能 (后端工具)
- [ ] 在 `interceptor.go` 中实现 `serializeParam` 函数
- [ ] 支持基本类型序列化(string, int, bool, float, etc.)
- [ ] 支持结构体和指针的 JSON 序列化
- [ ] 实现循环引用检测和处理
- [ ] 添加序列化深度和大小限制(最大 3 层,10KB)
- [ ] 处理序列化失败的降级逻辑
- [ ] 验证: 单元测试覆盖各种参数类型

### 3. 实现 HTTP 中间件 (后端 HTTP 层)
- [ ] 创建 `server/internal/middleware/interceptor.go` 文件
- [ ] 实现 `InterceptorMiddleware` 函数
- [ ] 解析 `X-Intercept-Session-Id` 和 `X-Intercept-Mode` headers
- [ ] 从 SessionStore 查找或创建会话
- [ ] 使用 `interceptor.WithInterceptSession` 注入会话到 ctx
- [ ] 添加错误处理和日志记录
- [ ] 实现降级逻辑(解析失败时不中断请求)
- [ ] 验证: 中间件单元测试,模拟不同 header 场景

### 4. 注册中间件到路由 (后端路由)
- [ ] 在 `server/internal/routes/routes.go` 中引入中间件
- [ ] 将 `InterceptorMiddleware` 注册到全局或 API 路由组
- [ ] 确保中间件在业务 handler 之前执行
- [ ] 注入 SessionStore 依赖到中间件
- [ ] 验证: 启动服务器,检查中间件是否生效

### 5. 更新拦截器调用点 - WorkflowEngineService (后端服务层 1/3)
- [ ] 定位 `server/internal/services/workflow_engine.go` 中所有 `interceptor.Intercept` 调用
- [ ] 更新 `GetInstance` 调用为 `Intercept1`(1 个参数: instanceId)
- [ ] 更新 `GetWorkflow` 调用为 `Intercept1`(1 个参数: workflowId)
- [ ] 更新 `UpdateInstance` 调用为 `Intercept4`(4 个参数)
- [ ] 更新 `ServiceTask` 调用为 `Intercept3` 或适当版本
- [ ] 验证: 编译通过,功能测试确认执行正常

### 6. 更新拦截器调用点 - 其他服务 (后端服务层 2/3)
- [ ] 搜索整个 `server/internal/services/` 目录的所有拦截器调用
- [ ] 统计每个调用的参数数量
- [ ] 逐个更新为对应的 InterceptN 函数
- [ ] 更新单元测试以匹配新签名
- [ ] 验证: 所有服务的单元测试通过

### 7. 更新拦截器单元测试 (后端测试)
- [ ] 更新 `server/internal/interceptor/interceptor_test.go`
- [ ] 添加 `Intercept0-5` 的测试用例
- [ ] 测试不同参数类型的序列化
- [ ] 测试三种模式(enabled/disabled/record)的行为
- [ ] 测试错误处理和降级逻辑
- [ ] 验证: 测试覆盖率 > 80%

### 8. 集成测试 - 端到端拦截器流程 (后端集成测试)
- [ ] 在 `server/internal/services/integration_test.go` 中添加测试
- [ ] 测试 HTTP Header 传递到 ctx 的完整流程
- [ ] 测试会话管理和跨请求一致性
- [ ] 测试拦截器日志记录功能
- [ ] 测试 mock 数据的设置和使用
- [ ] 验证: 集成测试通过,覆盖主要场景

## 前端实现

### 9. 更新 API 客户端支持 Header (前端核心)
- [ ] 在 `client/src/services/api.ts` 中添加 `ApiClient` 类(如果不存在)
- [ ] 实现 `setInterceptSession(sessionId, mode)` 方法
- [ ] 实现 `clearInterceptSession()` 方法
- [ ] 实现 `getHeaders()` 私有方法,自动注入拦截器 Headers
- [ ] 更新 `request()` 方法合并自定义和拦截器 Headers
- [ ] 验证: 控制台检查请求 Headers 是否正确

### 10. 更新拦截器控制面板 (前端 UI)
- [ ] 更新 `client/src/components/InterceptorControlPanel.vue`
- [ ] 在 `handleInitialize` 中调用 `apiClient.setInterceptSession`
- [ ] 在 `handleReset` 中调用 `apiClient.clearInterceptSession`
- [ ] 添加模式切换 UI(下拉选择器或按钮组)
- [ ] 实现模式切换的事件处理
- [ ] 显示当前会话 ID 和模式状态
- [ ] 验证: UI 功能正常,会话控制生效

### 11. 增强拦截器调用信息展示 (前端 UI)
- [ ] 在控制面板中添加"调用列表"展示区域
- [ ] 显示 `interceptorCalls` 数组中的每个调用
- [ ] 实现调用项的选择和高亮
- [ ] 添加详细信息面板,显示选中调用的 input/output
- [ ] 使用 JSON 语法高亮组件(如 CodeMirror 或 Monaco Editor)
- [ ] 实现 JSON 折叠/展开和搜索功能
- [ ] 验证: UI 展示清晰,JSON 格式正确

### 12. 实现导出功能 (前端功能)
- [ ] 在控制面板添加"导出"按钮
- [ ] 实现导出逻辑:收集所有拦截器调用记录
- [ ] 生成 JSON 文件并触发浏览器下载
- [ ] 文件名格式: `interceptor-calls-{sessionId}-{timestamp}.json`
- [ ] 验证: 导出文件完整,可以重新导入和查看

### 13. 前端单元测试 (前端测试)
- [ ] 为 `ApiClient` 编写单元测试
- [ ] 测试 `setInterceptSession` 和 `clearInterceptSession` 方法
- [ ] 测试 Header 自动注入逻辑
- [ ] 为 `InterceptorControlPanel` 编写组件测试
- [ ] 测试初始化、触发、重置流程
- [ ] 验证: 前端测试覆盖率 > 70%

## 文档和部署

### 14. 更新 API 文档 (文档)
- [ ] 在 API 文档中添加拦截器 HTTP Headers 说明
- [ ] 文档化 `X-Intercept-Session-Id` 和 `X-Intercept-Mode` 的用法
- [ ] 添加使用示例和最佳实践
- [ ] 更新拦截器 API 参考文档
- [ ] 验证: 文档清晰易懂,示例可运行

### 15. 编写迁移指南 (文档)
- [ ] 创建 `docs/INTERCEPTOR_MIGRATION_GUIDE.md`
- [ ] 说明旧 API 到新 API 的迁移步骤
- [ ] 提供代码对比示例(Before/After)
- [ ] 列出需要更新的文件清单
- [ ] 提供迁移检查清单
- [ ] 验证: 开发者可以按指南完成迁移

### 16. 性能测试 (测试)
- [ ] 对比新旧拦截器调用方式的性能
- [ ] 测试 HTTP 中间件的解析开销
- [ ] 测试高并发场景下的会话管理性能
- [ ] 测试参数序列化的性能影响
- [ ] 生成性能测试报告
- [ ] 验证: 性能影响在可接受范围内(< 5% 额外开销)

### 17. 回归测试 (测试)
- [ ] 运行完整的回归测试套件
- [ ] 验证所有现有功能未受影响
- [ ] 测试旧的拦截器调用方式仍然工作
- [ ] 测试新旧方式混合使用的场景
- [ ] 验证: 所有回归测试通过

### 18. 代码审查和优化 (质量)
- [ ] 提交代码审查请求
- [ ] 解决审查意见和代码风格问题
- [ ] 优化错误处理和日志输出
- [ ] 检查代码中的 TODO 和 FIXME
- [ ] 验证: 代码审查通过,无阻塞性问题

### 19. 部署和监控 (运维)
- [ ] 准备灰度发布计划
- [ ] 在测试环境部署并验证
- [ ] 在生产环境进行灰度发布
- [ ] 监控错误日志和性能指标
- [ ] 收集用户反馈
- [ ] 验证: 生产环境稳定运行,无重大问题

## 依赖关系

- 任务 1-2 可并行执行
- 任务 3 依赖任务 1 完成
- 任务 4 依赖任务 3 完成
- 任务 5-6 依赖任务 1-4 完成
- 任务 7-8 依赖任务 5-6 完成
- 任务 9-12 可与后端任务并行执行
- 任务 13 依赖任务 9-12 完成
- 任务 14-15 可与开发任务并行进行
- 任务 16-17 依赖所有开发任务完成
- 任务 18-19 依赖所有测试任务完成

## 时间估算

- 后端核心实现(任务 1-4): 3-5 天
- 后端调用点迁移(任务 5-6): 2-3 天
- 后端测试(任务 7-8): 2 天
- 前端实现(任务 9-12): 3-4 天
- 前端测试(任务 13): 1 天
- 文档和测试(任务 14-17): 2-3 天
- 审查和部署(任务 18-19): 2 天

**总计**: 15-20 天(约 3-4 周)

## 验收标准

- [x] 所有新函数编译通过,类型检查正确
- [x] 单元测试覆盖率达到 80% 以上
- [x] 集成测试覆盖主要使用场景
- [x] 性能测试表明额外开销 < 5%
- [x] 回归测试全部通过
- [x] 文档完整,包含迁移指南
- [x] 代码审查通过
- [x] 生产环境稳定运行 1 周无重大问题
