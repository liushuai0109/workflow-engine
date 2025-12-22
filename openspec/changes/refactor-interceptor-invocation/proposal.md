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

理想的调用方式应该是:
```go
// 期望方式
workflow, err := interceptor.Intercept(ctx, "GetWorkflow", s.workflowSvc.GetWorkflowByID, instance.WorkflowId)
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

## 变更内容

- **MODIFIED**: 拦截器核心函数签名
  - 重构 `Intercept` 函数,支持直接传入方法引用和参数
  - 使用 Go 泛型支持不同参数数量的方法调用
  - 提供多个重载版本:Intercept0, Intercept1, Intercept2, Intercept3 等

- **ADDED**: 拦截器唯一标识机制
  - 拦截器标识格式: `{operation}:{param1}:{param2}:...`
  - 示例: `GetWorkflow:workflow-123`, `UpdateInstance:instance-456:running`
  - 参数值使用关键参数(如 ID、状态等),确保唯一性
  - 在拦截器内部自动生成标识

- **ADDED**: Dry-run 执行模式
  - 添加 HTTP Header: `X-Intercept-Dry-Run: true`
  - Dry-run 模式下不实际执行方法,但记录会调用的拦截器清单
  - 返回拦截器列表,包含标识、操作名、参数等信息
  - 用于前端获取可配置的拦截器清单

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
  - 拦截器功能将通过其他方式集成(待设计)

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
  - `server/internal/interceptor/interceptor.go` - 重构核心拦截器函数
  - `server/internal/middleware/interceptor.go` - 新增 HTTP 中间件
  - `server/internal/services/workflow_engine.go` - 更新所有拦截器调用点
  - `client/src/services/api.ts` - 添加 Dry-run 和配置 Header 支持
  - `client/src/components/RightPanelContainer.vue` - 删除拦截器 Tab
  - `client/src/components/InterceptorControlPanel.vue` - 待删除或重构

- **兼容性影响**:
  - 破坏性变更:需要更新所有现有的拦截器调用代码
  - 建议提供兼容层以支持旧调用方式的平滑迁移
  - 新旧方式可以共存一段时间,逐步迁移

- **性能影响**:
  - 使用泛型和方法引用可能轻微提升性能(减少闭包分配)
  - HTTP Header 解析开销可忽略不计
  - 整体性能影响为中性或轻微正向

## 风险

- **实施风险**:
  - 中等 - 需要修改多个调用点,但逻辑清晰
  - 需要充分的单元测试覆盖新旧两种调用方式
  - 需要谨慎处理泛型的类型推断和编译错误

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

3. **使用代码生成**
   - 优点:可以生成类型安全的包装代码
   - 缺点:增加构建复杂度,需要维护代码生成器

**推荐方案**: 使用泛型重载(当前提案),平衡了类型安全、性能和实施复杂度。
