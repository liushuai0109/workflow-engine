# 任务列表:重构拦截器调用方式(结构体方案)

## 当前状态

**Phase 1 完成 - 核心架构 + 完整示例迁移**:
- ✅ 新的泛型 `Intercept[T, P any]` 函数已实现,支持结构体参数和反射ID生成
- ✅ HTTP中间件已实现并注册,支持 `X-Intercept-Dry-Run` 和 `X-Intercept-Config` headers
- ✅ 添加了 `InterceptLegacy` 兼容层,使现有代码可以继续运行
- ✅ **Task 2 完成**: 已将 WorkflowEngineService 中的所有 4 个拦截器迁移到新架构
  - GetInstance (支持 Mock 和真实实例)
  - GetWorkflow (通过 WorkflowID 获取工作流)
  - UpdateInstance (更新实例状态和节点)
  - ServiceTask (执行业务 API 调用,支持 Mock 模式)
- ✅ WorkflowEngineService 不再使用 InterceptLegacy,完全切换到新架构
- ⏳ 下一步: 编写单元测试 (Task 6) 和集成测试 (Task 7)

## 后端实现

### 1. 实现单一泛型拦截器函数 (后端核心)
- [x] 在 `server/internal/interceptor/interceptor.go` 中实现 `Intercept[T, P any]` 函数
- [x] 实现参数结构体反射遍历逻辑
- [x] 实现 `intercept:"id"` tag 解析
- [x] 实现 `generateInterceptorId` 函数(基于结构体 tag)
- [x] 实现 `serializeField` 函数支持各种类型
- [x] 支持复杂类型的哈希序列化(避免过长)
- [x] 验证: 编译通过,函数签名正确

### 2. 定义参数结构体和改造业务方法 (后端服务层 - 最大工作量)
- [x] 统计 `server/internal/services/` 目录下所有需要改造的方法 (已识别 4 个拦截器)
- [x] 为每个方法定义对应的 Params 结构体 (已完成 4 个: GetInstanceParams, GetWorkflowParams, UpdateInstanceParams, ExecuteServiceTaskParams)
- [x] 结构体字段添加 `json` 和 `intercept` tags (已完成,所有 ID 字段都标记为 intercept:"id")
- [x] 改造方法签名接受结构体参数 (已完成 4/4: getInstance, getWorkflow, updateInstance, executeServiceTaskWithParams)
- [x] 更新方法内部使用 `params.字段名` 访问参数 (已完成 4/4,所有方法都使用结构体参数)
- [x] 更新所有调用这些方法的地方 (已完成 4/4 - 所有 InterceptLegacy 已替换为 Intercept)
- [x] 验证: 编译通过,函数签名正确 (workflow_engine.go 语法正确,go fmt 通过)
- [x] 完成 ServiceTask 的复杂场景重构 (已完成 - 将 node.Id 和 node.BusinessApiUrl 提取到 params)
- [x] 扩展到其他服务文件的方法 (已确认 - workflow_engine.go 是唯一使用拦截器的服务文件)

### 3. 实现 HTTP 中间件 (后端 HTTP 层)
- [x] 创建 `server/internal/middleware/interceptor.go` 文件
- [x] 实现 `InterceptorMiddleware` 函数
- [x] 解析 `X-Intercept-Dry-Run` 和 `X-Intercept-Config` headers
- [x] 创建 `InterceptConfig` 结构体和相关方法
- [x] 实现 Dry-run 收集器逻辑
- [x] 使用 context 传递配置
- [x] 添加错误处理和日志记录
- [ ] 验证: 中间件单元测试,模拟不同 header 场景

### 4. 注册中间件到路由 (后端路由)
- [x] 在 `server/internal/routes/routes.go` 中引入中间件
- [x] 将 `InterceptorMiddleware` 注册到全局或 API 路由组
- [x] 确保中间件在业务 handler 之前执行
- [x] 验证: 启动服务器,检查中间件是否生效

### 5. 更新拦截器调用点 - WorkflowEngineService (后端服务层 - 调用点更新)
- [x] 定位 `server/internal/services/workflow_engine.go` 中所有 `interceptor.Intercept` 调用
- [x] 为每个调用创建对应的 Params 结构体(如果还没创建)
- [x] 更新调用为 `InterceptLegacy(ctx, operation, method)` (临时兼容层)
- [x] 验证: 编译通过,功能测试确认执行正常

### 6. 更新拦截器单元测试 (后端测试)
- [ ] 更新 `server/internal/interceptor/interceptor_test.go`
- [ ] 添加泛型 `Intercept` 的测试用例
- [ ] 测试不同结构体参数类型
- [ ] 测试 `intercept:"id"` tag 解析
- [ ] 测试三种模式(enabled/disabled/record)的行为
- [ ] 测试错误处理和降级逻辑
- [ ] 验证: 测试覆盖率 > 80%

### 7. 集成测试 - 端到端拦截器流程 (后端集成测试)
- [ ] 在 `server/internal/services/integration_test.go` 中添加测试
- [ ] 测试 HTTP Header 传递到 ctx 的完整流程
- [ ] 测试 Dry-run 模式返回拦截器清单
- [ ] 测试拦截器日志记录功能
- [ ] 测试 mock 数据的设置和使用
- [ ] 验证: 集成测试通过,覆盖主要场景

## 前端实现

### 8. 更新 API 客户端支持 Header (前端核心)
- [ ] 在 `client/src/services/api.ts` 中添加或更新 `ApiClient` 类
- [ ] 实现 `setInterceptorConfig(config: Record<string, string>)` 方法
- [ ] 实现 `updateInterceptorMode(interceptorId, mode)` 方法
- [ ] 实现 `clearInterceptorConfig()` 方法
- [ ] 实现 `dryRun(url, options)` 方法获取拦截器清单
- [ ] 实现 `getHeaders()` 私有方法,自动注入拦截器 Headers
- [ ] 更新 `request()` 方法合并自定义和拦截器 Headers
- [ ] 验证: 控制台检查请求 Headers 是否正确

### 9. 设计新的拦截器控制 UI (前端 UI - 待设计)
- [ ] 设计 UI 方案(独立窗口 / 集成到现有面板 / 其他)
- [ ] 实现 Dry-run 触发和拦截器清单展示
- [ ] 实现每个拦截器的模式选择(enabled/disabled/record)
- [ ] 显示当前配置状态
- [ ] 实现配置应用和执行流程
- [ ] 验证: UI 功能正常,配置生效

### 10. 前端单元测试 (前端测试)
- [ ] 为 `ApiClient` 编写单元测试
- [ ] 测试 `setInterceptorConfig` 和 `clearInterceptorConfig` 方法
- [ ] 测试 Header 自动注入逻辑
- [ ] 测试 Dry-run 请求
- [ ] 验证: 前端测试覆盖率 > 70%

## 文档和测试

### 11. 更新 API 文档 (文档)
- [ ] 在 API 文档中添加拦截器 HTTP Headers 说明
- [ ] 文档化 `X-Intercept-Dry-Run` 和 `X-Intercept-Config` 的用法
- [ ] 添加参数结构体定义规范
- [ ] 添加 `intercept:"id"` tag 使用说明
- [ ] 添加使用示例和最佳实践
- [ ] 验证: 文档清晰易懂,示例可运行

### 12. 编写迁移指南 (文档)
- [ ] 创建 `docs/INTERCEPTOR_MIGRATION_GUIDE.md`
- [ ] 说明从闭包方式到结构体方式的迁移步骤
- [ ] 提供方法改造示例(Before/After)
- [ ] 说明参数结构体定义规范
- [ ] 列出需要更新的文件清单
- [ ] 提供迁移检查清单
- [ ] 验证: 开发者可以按指南完成迁移

### 13. 性能测试 (测试)
- [ ] 对比旧闭包方式和新结构体方式的性能
- [ ] 测试 HTTP 中间件的解析开销
- [ ] 测试反射和 tag 解析的性能影响
- [ ] 测试高并发场景下的配置管理性能
- [ ] 生成性能测试报告
- [ ] 验证: 性能影响在可接受范围内(< 5% 额外开销)

### 14. 回归测试 (测试)
- [ ] 运行完整的回归测试套件
- [ ] 验证所有现有功能未受影响
- [ ] 测试新的拦截器调用方式正常工作
- [ ] 测试 Dry-run 和配置功能
- [ ] 验证: 所有回归测试通过

### 15. 代码审查和优化 (质量)
- [ ] 提交代码审查请求
- [ ] 解决审查意见和代码风格问题
- [ ] 优化错误处理和日志输出
- [ ] 检查代码中的 TODO 和 FIXME
- [ ] 验证: 代码审查通过,无阻塞性问题

## 依赖关系

- 任务 1-2 是核心,必须优先完成
- 任务 3-4 依赖任务 1 完成
- 任务 5 依赖任务 1-4 完成
- 任务 6-7 依赖任务 5 完成
- 任务 8-10 可与后端任务并行执行
- 任务 11-12 可与开发任务并行进行
- 任务 13-14 依赖所有开发任务完成
- 任务 15 依赖所有测试任务完成

## 工作量估算

- 后端核心实现(任务 1): 2 天
- 业务方法改造(任务 2): 5-7 天(最大工作量)
- 后端中间件和路由(任务 3-4): 1-2 天
- 后端调用点更新(任务 5): 2-3 天
- 后端测试(任务 6-7): 2 天
- 前端实现(任务 8-9): 3-4 天
- 前端测试(任务 10): 1 天
- 文档和测试(任务 11-14): 3-4 天
- 审查和优化(任务 15): 1-2 天

**总计**: 20-28 天(约 4-6 周)

**注意**: 任务 2 (业务方法改造) 是最大工作量,建议分模块逐步完成。

## 验收标准

- [ ] 所有业务方法改造为结构体参数
- [ ] 单一泛型 `Intercept` 函数正常工作
- [ ] Dry-run 模式正确返回拦截器清单
- [ ] 细粒度配置功能正常工作
- [ ] 单元测试覆盖率达到 80% 以上
- [ ] 集成测试覆盖主要使用场景
- [ ] 性能测试表明额外开销 < 5%
- [ ] 回归测试全部通过
- [ ] 文档完整,包含迁移指南
- [ ] 代码审查通过
