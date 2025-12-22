# 后端服务器规范(变更)

## MODIFIED Requirements

### Requirement: 拦截器核心功能

系统 SHALL 提供拦截器机制以支持方法调用的拦截、mock 数据返回和执行记录。

#### Scenario: 使用泛型重载函数拦截方法调用

- **当** 服务层需要拦截一个方法调用时
- **则** 应使用对应参数数量的 Intercept 函数:
  - `Intercept0[T any](ctx, operation, fn func(context.Context) (T, error)) (T, error)` - 无额外参数
  - `Intercept1[T, P1 any](ctx, operation, fn func(context.Context, P1) (T, error), p1 P1) (T, error)` - 1 个参数
  - `Intercept2[T, P1, P2 any](ctx, operation, fn func(context.Context, P1, P2) (T, error), p1 P1, p2 P2) (T, error)` - 2 个参数
  - `Intercept3[T, P1, P2, P3 any](...)` - 3 个参数
  - `Intercept4[T, P1, P2, P3, P4 any](...)` - 4 个参数
  - `Intercept5[T, P1, P2, P3, P4, P5 any](...)` - 5 个参数
- **并且** 第一个参数必须是 `context.Context`
- **并且** 返回值必须是 `(T, error)` 格式
- **并且** 拦截器应直接调用传入的方法引用,而非闭包

#### Scenario: 自动生成拦截器唯一标识

- **当** 拦截器执行时
- **则** 应自动生成唯一标识,格式为 `{operation}:{param1}:{param2}:...`
- **并且** 参数序列化规则:
  - 字符串类型直接使用
  - 数字类型转换为字符串
  - 布尔值转换为 "true" 或 "false"
  - 复杂类型 JSON 序列化后截断(最多 50 字符)
- **并且** 同一操作和参数组合应生成相同的标识
- **并且** 标识用于配置查找和日志记录

#### Scenario: 根据配置决定拦截行为

- **当** 拦截器执行时
- **则** 应根据自身标识从配置中查找对应模式
- **并且** 支持的模式包括:
  - `disabled` - 直接执行真实方法,不记录
  - `enabled` - 优先返回 mock 数据,无 mock 数据则执行真实方法
  - `record` - 执行真实方法并记录入参和输出(默认)
- **并且** 未配置的拦截器默认使用 record 模式
- **并且** 记录的数据应存储在配置的 mock 数据存储中

#### Scenario: 兼容旧的闭包调用方式

- **当** 现有代码使用旧的 `Intercept(ctx, operation, func(ctx) (T, error))` 方式时
- **则** 系统应继续支持该调用方式
- **并且** 内部应将其映射到 `Intercept0` 函数
- **并且** 应在日志中标记使用了废弃的 API(可选)

## ADDED Requirements

### Requirement: Dry-run 执行模式

系统 SHALL 支持 Dry-run 模式以获取拦截器调用清单而不实际执行方法。

#### Scenario: 通过 HTTP Header 启用 Dry-run

- **当** HTTP 请求包含 `X-Intercept-Dry-Run: true` header 时
- **则** 中间件应:
  - 在 context 中设置 Dry-run 标志
  - 创建拦截器收集器并注入到 context
  - 允许请求继续处理
- **并且** 不应阻塞请求或返回错误

#### Scenario: Dry-run 模式下记录拦截器调用

- **当** 拦截器在 Dry-run 模式下被调用时
- **则** 应:
  - 记录拦截器标识、操作名和参数到收集器
  - 不执行真实方法
  - 返回零值和特殊错误 `ErrDryRunMode`
- **并且** 收集器应按调用顺序存储所有拦截器信息

#### Scenario: 返回拦截器清单

- **当** Dry-run 请求完成时
- **则** 中间件应:
  - 从收集器获取拦截器列表
  - 构造响应 JSON 包含 `isDryRun: true` 和 `interceptors` 数组
  - 返回 200 状态码
  - 终止请求处理(不返回正常的业务响应)
- **并且** 拦截器列表应包含每个拦截器的:
  - `id`: 唯一标识(如 "GetWorkflow:workflow-123")
  - `operation`: 操作名(如 "GetWorkflow")
  - `params`: 参数数组

### Requirement: 细粒度拦截器配置

系统 SHALL 支持通过 HTTP Header 传递细粒度的拦截器配置。

#### Scenario: 通过 HTTP Header 传递配置

- **当** HTTP 请求包含 `X-Intercept-Config` header 时
- **则** 中间件应:
  - URL decode header 值
  - 解析为 JSON 对象 (map[string]string)
  - 创建 `InterceptConfig` 对象
  - 注入到 request context
- **并且** JSON 格式为: `{"interceptorId1": "mode1", "interceptorId2": "mode2"}`
- **并且** 解析失败时应记录警告但不阻塞请求

#### Scenario: 配置查找和默认值

- **当** 拦截器查找自己的配置时
- **则** 应:
  - 从 context 获取 `InterceptConfig`
  - 使用自己的标识查找配置模式
  - 如果未找到配置,返回默认模式 "record"
- **并且** 查找应线程安全(使用 RWMutex)
- **并且** 配置对象应对整个请求期间有效

#### Scenario: Mock 数据存储和检索

- **当** 拦截器处于 enabled 模式时
- **则** 应:
  - 使用标识从 mock 数据存储中查找数据
  - 如果找到,返回 mock 数据并标记为 mocked
  - 如果未找到,执行真实方法
- **并且** 当拦截器处于 record 模式时
- **则** 应:
  - 执行真实方法
  - 将返回结果存储到 mock 数据存储
  - 使用拦截器标识作为键
- **并且** mock 数据存储应线程安全

### Requirement: 拦截器 HTTP 中间件

系统 SHALL 提供 HTTP 中间件以自动处理拦截器 Headers 和配置管理。

#### Scenario: 注册中间件到路由

- **当** 服务启动时
- **则** 应在全局或指定路由组上注册 `InterceptorMiddleware`
- **并且** 中间件应在业务 handler 之前执行
- **并且** 中间件不应依赖外部状态(无需注入依赖)

#### Scenario: 中间件执行流程

- **当** HTTP 请求到达时
- **则** 中间件应按以下顺序执行:
  1. 读取 `X-Intercept-Dry-Run` header,判断是否 Dry-run
  2. 读取 `X-Intercept-Config` header 并解析为配置映射
  3. 创建 `InterceptConfig` 对象(空配置使用默认)
  4. 如果是 Dry-run,创建拦截器收集器
  5. 将配置和收集器注入到 context
  6. 调用 `c.Next()` 继续处理
  7. 如果是 Dry-run,返回拦截器清单并终止
- **并且** 错误应记录日志但不阻塞请求

#### Scenario: Dry-run 响应格式

- **当** Dry-run 请求完成时
- **则** 中间件应返回:
  ```json
  {
    "isDryRun": true,
    "interceptors": [
      {
        "id": "GetWorkflow:workflow-123",
        "operation": "GetWorkflow",
        "params": ["workflow-123"]
      },
      {
        "id": "UpdateInstance:instance-456:running",
        "operation": "UpdateInstance",
        "params": ["instance-456", "running"]
      }
    ]
  }
  ```
- **并且** 返回 200 状态码
- **并且** Content-Type 为 "application/json"

### Requirement: 方法参数序列化

系统 SHALL 提供方法参数的序列化功能以支持日志记录和标识生成。

#### Scenario: 序列化基本类型参数

- **当** 拦截器需要序列化基本类型参数时(string, int, bool, float, etc.)
- **则** 应直接使用参数值或转换为字符串
- **并且** 数值类型应保持精度
- **并且** 字符串应保留原始内容

#### Scenario: 序列化复杂类型

- **当** 拦截器需要序列化结构体或指针参数时
- **则** 应使用 JSON 序列化
- **并且** 应处理循环引用(避免无限递归)
- **并且** 空指针应序列化为 "null"
- **并且** 序列化失败时应返回占位符(如 "error")

#### Scenario: 序列化长度限制

- **当** 序列化结果过长时
- **则** 应截断为最多 50 字符
- **并且** 添加 "..." 后缀表示截断
- **并且** 记录警告日志

## REMOVED Requirements

无移除的需求。

## 交叉引用

- 依赖于 `workflow-editor` 规范中的前端 Dry-run 请求和配置管理功能
- 与现有的拦截器 API 兼容,提供向后兼容层
- 扩展现有功能,不破坏现有实现
