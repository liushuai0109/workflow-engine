# 设计文档:拦截器调用方式重构

## 概述

本文档描述了拦截器调用方式重构的详细设计方案,包括新的函数签名、上下文传递机制、HTTP Header 集成以及前后端协作流程。

## 架构决策

### 1. 泛型 vs 反射 vs 可变参数

**决策**: 使用 Go 泛型创建多个重载版本的 Intercept 函数。

**理由**:
- **类型安全**: 泛型在编译时检查类型,避免运行时错误
- **性能**: 无反射开销,性能接近直接调用
- **可读性**: 函数签名清晰,IDE 支持良好
- **实施成本**: 适中,需要定义有限数量的重载函数(0-5 个参数基本覆盖所有场景)

**权衡**:
- 需要为不同参数数量定义多个函数
- Go 泛型目前不支持可变参数泛型,需要手动定义重载

### 2. 上下文传递机制

**决策**: 使用细粒度的拦截器控制,通过 HTTP Header 传递拦截器配置映射。

**架构流程**:
```
前端 → Dry-run 请求 → 获取拦截器清单 → 配置每个拦截器 → HTTP Header (X-Intercept-Config) → 中间件 → ctx.WithValue → 拦截器查找自己的配置
```

**理由**:
- **灵活性**: 每个拦截器可以独立配置,满足不同场景需求
- **精确性**: 前端可以精确控制哪些拦截器使用 mock 数据
- **可见性**: Dry-run 模式让前端提前知道会调用哪些拦截器
- **标准化**: 符合 HTTP 协议规范,易于调试和监控
- **默认安全**: 未配置的拦截器默认 record 模式,记录但正常执行

### 3. HTTP Header 定义

**标准 Headers**:
- `X-Intercept-Dry-Run`: 是否为 Dry-run 模式,值为 `true` 或 `false`
  - `true` - 不实际执行,只返回拦截器清单
  - `false` 或不存在 - 正常执行

- `X-Intercept-Config`: 拦截器配置映射(JSON 格式,需 URL encode)
  - 格式: `{"interceptorId1":"mode1", "interceptorId2":"mode2"}`
  - 示例: `{"GetWorkflow:workflow-123":"enabled", "GetInstance:instance-456":"disabled"}`
  - 模式可选值:
    - `enabled` - 启用拦截,优先返回 mock 数据,无 mock 数据则执行真实方法
    - `disabled` - 禁用拦截,直接执行真实方法,不记录
    - `record` - 记录模式,执行真实方法并记录入参和输出(默认)

**为什么使用 X- 前缀**:
- 遵循自定义 HTTP Header 的命名约定
- 避免与标准 Header 冲突
- 清晰表明这是扩展功能

### 4. 拦截器唯一标识生成规则

**标识格式**: `{operation}:{param1}:{param2}:...`

**生成规则**:
1. 从函数名或 operation 字符串中提取操作名
2. 序列化关键参数(通常是 ID、名称等字符串类型)
3. 用冒号 `:` 连接

**示例**:
```go
// Intercept1 调用
workflow, err := interceptor.Intercept1(ctx,
    "GetWorkflow",
    s.workflowSvc.GetWorkflowByID,
    "workflow-123",
)
// 生成标识: "GetWorkflow:workflow-123"

// Intercept2 调用
instance, err := interceptor.Intercept2(ctx,
    "UpdateInstance",
    s.instanceSvc.UpdateWorkflowInstance,
    "instance-456",
    "running",
)
// 生成标识: "UpdateInstance:instance-456:running"
```

**可序列化参数类型**:
- 字符串: 直接使用
- 整数/数字: 转换为字符串
- 布尔值: "true" 或 "false"
- 其他类型: JSON 序列化后截断(最多 50 字符)

**唯一性保证**:
- 对于同一个操作和同一组参数,始终生成相同的标识
- 不同参数值生成不同标识
- 标识包含足够信息用于调试和日志追踪

## 详细设计

### 1. 拦截器核心函数签名

#### Intercept1 - 单参数方法
```go
func Intercept1[T any, P1 any](
    ctx context.Context,
    operation string,
    fn func(context.Context, P1) (T, error),
    p1 P1,
) (T, error)
```

**调用示例**:
```go
// 旧方式
workflow, err := interceptor.Intercept(ctx,
    "GetWorkflow",
    func(ctx context.Context) (*models.Workflow, error) {
        return s.workflowSvc.GetWorkflowByID(ctx, workflowId)
    },
)

// 新方式
workflow, err := interceptor.Intercept1(ctx,
    "GetWorkflow",
    s.workflowSvc.GetWorkflowByID,
    workflowId,
)
```

#### Intercept2 - 双参数方法
```go
func Intercept2[T any, P1 any, P2 any](
    ctx context.Context,
    operation string,
    fn func(context.Context, P1, P2) (T, error),
    p1 P1,
    p2 P2,
) (T, error)
```

**调用示例**:
```go
// 调用双参数方法
result, err := interceptor.Intercept2(ctx,
    "UpdateInstance",
    s.instanceSvc.UpdateWorkflowInstance,
    instanceId,
    status,
)
```

#### Intercept0 - 无额外参数方法
```go
func Intercept0[T any](
    ctx context.Context,
    operation string,
    fn func(context.Context) (T, error),
) (T, error)
```

**说明**: 保留当前方式以支持无参数方法,提供兼容性。

#### 完整重载列表
- `Intercept0`: context 参数,无额外参数
- `Intercept1`: context + 1 个参数
- `Intercept2`: context + 2 个参数
- `Intercept3`: context + 3 个参数
- `Intercept4`: context + 4 个参数
- `Intercept5`: context + 5 个参数

**覆盖率分析**:
根据代码分析,当前项目中 90% 以上的调用只需要 0-2 个参数,5 个参数足以覆盖所有场景。

### 2. 中间件实现

#### HTTP 中间件架构(细粒度配置版本)
```go
// server/internal/middleware/interceptor.go
func InterceptorMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 检查是否为 Dry-run 模式
        isDryRun := c.GetHeader("X-Intercept-Dry-Run") == "true"

        // 2. 解析拦截器配置
        configHeader := c.GetHeader("X-Intercept-Config")
        var config *InterceptConfig

        if configHeader != "" {
            // URL decode 并解析 JSON
            decoded, err := url.QueryUnescape(configHeader)
            if err != nil {
                logger.Warn("Failed to decode X-Intercept-Config header")
            } else {
                var configMap map[string]string
                if err := json.Unmarshal([]byte(decoded), &configMap); err != nil {
                    logger.Warn("Failed to parse X-Intercept-Config JSON")
                } else {
                    config = NewInterceptConfig(configMap)
                }
            }
        }

        // 3. 创建默认配置(如果没有提供)
        if config == nil {
            config = NewInterceptConfig(nil) // 空配置,使用默认 record 模式
        }

        // 4. 设置 Dry-run 标志和配置到 context
        ctx := c.Request.Context()
        if isDryRun {
            ctx = WithDryRunMode(ctx)
            // 创建拦截器清单收集器
            collector := NewInterceptorCollector()
            ctx = WithInterceptorCollector(ctx, collector)
        }
        ctx = WithInterceptConfig(ctx, config)
        c.Request = c.Request.WithContext(ctx)

        c.Next()

        // 5. Dry-run 模式:返回拦截器清单
        if isDryRun {
            collector := GetInterceptorCollector(ctx)
            if collector != nil {
                c.JSON(http.StatusOK, gin.H{
                    "isDryRun": true,
                    "interceptors": collector.GetList(),
                })
                c.Abort()
                return
            }
        }
    }
}

// InterceptConfig 拦截器配置
type InterceptConfig struct {
    configMap map[string]string // interceptorId -> mode
    mockData  map[string]interface{} // interceptorId -> mock data
    mu        sync.RWMutex
}

func NewInterceptConfig(configMap map[string]string) *InterceptConfig {
    if configMap == nil {
        configMap = make(map[string]string)
    }
    return &InterceptConfig{
        configMap: configMap,
        mockData:  make(map[string]interface{}),
    }
}

func (c *InterceptConfig) GetMode(interceptorId string) InterceptMode {
    c.mu.RLock()
    defer c.mu.RUnlock()

    if mode, exists := c.configMap[interceptorId]; exists {
        return InterceptMode(mode)
    }
    return InterceptModeRecord // 默认 record 模式
}

func (c *InterceptConfig) GetMockData(interceptorId string) (interface{}, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    data, exists := c.mockData[interceptorId]
    return data, exists
}

func (c *InterceptConfig) SetMockData(interceptorId string, data interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()

    c.mockData[interceptorId] = data
}
```

**中间件职责**:
- 解析 `X-Intercept-Dry-Run` 和 `X-Intercept-Config` Headers
- 创建拦截器配置对象并注入到 context
- Dry-run 模式下创建收集器,收集拦截器清单
- Dry-run 完成后返回拦截器清单而非正常响应

### 3. 拦截器内部实现

#### 核心逻辑(带细粒度配置)
```go
func Intercept1[T any, P1 any](
    ctx context.Context,
    operation string,
    fn func(context.Context, P1) (T, error),
    p1 P1,
) (T, error) {
    var zero T

    // 1. 生成拦截器唯一标识
    interceptorId := generateInterceptorId(operation, p1)

    // 2. 检查是否为 Dry-run 模式
    if IsDryRunMode(ctx) {
        // Dry-run: 记录拦截器信息但不执行
        RecordInterceptorCall(ctx, interceptorId, operation, p1)
        return zero, ErrDryRunMode // 特殊错误,表示 dry-run
    }

    // 3. 获取拦截器配置
    config := GetInterceptConfig(ctx)
    mode := config.GetMode(interceptorId) // 未配置则返回默认 "record"

    // 4. 根据模式决定行为
    switch mode {
    case InterceptModeDisabled:
        // 禁用模式:直接执行,不记录
        return fn(ctx, p1)

    case InterceptModeEnabled:
        // 启用模式:优先使用 mock 数据
        mockData, exists := config.GetMockData(interceptorId)
        if exists {
            result, ok := mockData.(T)
            if ok {
                LogExecution(ctx, interceptorId, p1, result, true, "")
                RecordCall(ctx, interceptorId, p1, result)
                return result, nil
            }
        }
        // 未找到 mock 数据,回退到真实调用
        result, err := fn(ctx, p1)
        LogExecution(ctx, interceptorId, p1, result, false, errString(err))
        RecordCall(ctx, interceptorId, p1, result)
        return result, err

    case InterceptModeRecord:
        // 记录模式:执行真实方法并记录
        result, err := fn(ctx, p1)
        if err == nil {
            config.SetMockData(interceptorId, result)
        }
        LogExecution(ctx, interceptorId, p1, result, false, errString(err))
        RecordCall(ctx, interceptorId, p1, result)
        return result, err

    default:
        // 默认:记录模式
        result, err := fn(ctx, p1)
        LogExecution(ctx, interceptorId, p1, result, false, errString(err))
        RecordCall(ctx, interceptorId, p1, result)
        return result, err
    }
}

// generateInterceptorId 生成拦截器唯一标识
func generateInterceptorId(operation string, params ...interface{}) string {
    parts := []string{operation}
    for _, param := range params {
        parts = append(parts, serializeParam(param))
    }
    return strings.Join(parts, ":")
}

// serializeParam 序列化参数为字符串
func serializeParam(param interface{}) string {
    switch v := param.(type) {
    case string:
        return v
    case int, int8, int16, int32, int64:
        return fmt.Sprintf("%d", v)
    case uint, uint8, uint16, uint32, uint64:
        return fmt.Sprintf("%d", v)
    case bool:
        return fmt.Sprintf("%t", v)
    case float32, float64:
        return fmt.Sprintf("%f", v)
    default:
        // 复杂类型:JSON 序列化并截断
        data, _ := json.Marshal(v)
        str := string(data)
        if len(str) > 50 {
            str = str[:50] + "..."
        }
        return str
    }
}
```

**关键改进**:
- 自动生成拦截器唯一标识
- 支持 Dry-run 模式记录拦截器清单
- 根据配置查找每个拦截器的模式
- 未配置的拦截器默认使用 record 模式
- 完整记录参数和输出

### 4. 前端集成

#### API 服务更新(细粒度配置版本)
```typescript
// client/src/services/api.ts

export interface InterceptorInfo {
    id: string // 唯一标识,如 "GetWorkflow:workflow-123"
    operation: string // 操作名,如 "GetWorkflow"
    params: any[] // 参数列表
    mode?: string // 当前配置的模式(如果有)
}

export class ApiClient {
    private interceptConfig: Record<string, string> = {} // interceptorId -> mode

    // 设置拦截器配置
    setInterceptorConfig(config: Record<string, string>) {
        this.interceptConfig = config
    }

    // 更新单个拦截器的模式
    updateInterceptorMode(interceptorId: string, mode: string) {
        if (mode === 'default') {
            delete this.interceptConfig[interceptorId]
        } else {
            this.interceptConfig[interceptorId] = mode
        }
    }

    // 清除所有拦截器配置
    clearInterceptorConfig() {
        this.interceptConfig = {}
    }

    // 获取当前配置
    getInterceptorConfig(): Record<string, string> {
        return { ...this.interceptConfig }
    }

    private getHeaders(options?: { dryRun?: boolean }): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        // Dry-run 模式
        if (options?.dryRun) {
            headers['X-Intercept-Dry-Run'] = 'true'
        }

        // 拦截器配置
        if (Object.keys(this.interceptConfig).length > 0 && !options?.dryRun) {
            const configJson = JSON.stringify(this.interceptConfig)
            headers['X-Intercept-Config'] = encodeURIComponent(configJson)
        }

        return headers
    }

    async request(url: string, options: RequestInit & { dryRun?: boolean } = {}) {
        const { dryRun, ...fetchOptions } = options
        return fetch(url, {
            ...fetchOptions,
            headers: {
                ...this.getHeaders({ dryRun }),
                ...fetchOptions.headers,
            },
        })
    }

    // Dry-run 请求获取拦截器清单
    async dryRun(url: string, options: RequestInit = {}): Promise<InterceptorInfo[]> {
        const response = await this.request(url, { ...options, dryRun: true })
        if (!response.ok) {
            throw new Error('Dry-run request failed')
        }
        const data = await response.json()
        return data.interceptors || []
    }
}

export const apiClient = new ApiClient()
```

#### 拦截器控制面板(细粒度配置版本)
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { apiClient, type InterceptorInfo } from '@/services/api'

// 拦截器列表
const interceptors = ref<InterceptorInfo[]>([])
// 拦截器配置: interceptorId -> mode
const config = ref<Record<string, string>>({})
const isLoading = ref(false)

// 步骤 1: Dry-run 获取拦截器清单
async function fetchInterceptorList() {
    isLoading.value = true
    try {
        // 发起 Dry-run 请求
        const list = await apiClient.dryRun('/api/workflows/workflow-123/execute', {
            method: 'POST',
            body: JSON.stringify({
                fromNodeId: 'start-event-1',
                businessParams: {}
            })
        })

        interceptors.value = list
        // 初始化配置(所有拦截器默认 record 模式)
        config.value = {}
        list.forEach(item => {
            config.value[item.id] = 'record' // 默认模式
        })
    } catch (error) {
        console.error('Failed to fetch interceptor list:', error)
    } finally {
        isLoading.value = false
    }
}

// 步骤 2: 更新单个拦截器的模式
function updateMode(interceptorId: string, mode: string) {
    config.value[interceptorId] = mode
    // 同步到 API 客户端
    apiClient.setInterceptorConfig(config.value)
}

// 步骤 3: 应用配置并执行请求
async function executeWithConfig() {
    isLoading.value = true
    try {
        // 配置已经通过 updateMode 设置到 apiClient
        // 发起真实请求,会自动携带 X-Intercept-Config Header
        const response = await apiClient.request('/api/workflows/workflow-123/execute', {
            method: 'POST',
            body: JSON.stringify({
                fromNodeId: 'start-event-1',
                businessParams: {}
            })
        })

        const result = await response.json()
        console.log('Execution result:', result)
    } catch (error) {
        console.error('Execution failed:', error)
    } finally {
        isLoading.value = false
    }
}

// 重置配置
function resetConfig() {
    config.value = {}
    interceptors.value = []
    apiClient.clearInterceptorConfig()
}
</script>

<template>
  <div class="interceptor-control-panel">
    <h3>拦截器控制面板</h3>

    <!-- 步骤 1: 获取拦截器清单 -->
    <button @click="fetchInterceptorList" :disabled="isLoading">
      获取拦截器清单 (Dry-run)
    </button>

    <!-- 步骤 2: 配置每个拦截器 -->
    <div v-if="interceptors.length > 0" class="interceptor-list">
      <h4>拦截器列表 ({{ interceptors.length }} 个)</h4>
      <div v-for="item in interceptors" :key="item.id" class="interceptor-item">
        <div class="interceptor-info">
          <strong>{{ item.operation }}</strong>
          <code>{{ item.id }}</code>
        </div>
        <select v-model="config[item.id]" @change="updateMode(item.id, config[item.id])">
          <option value="record">Record (记录,默认)</option>
          <option value="enabled">Enabled (使用 Mock)</option>
          <option value="disabled">Disabled (禁用)</option>
        </select>
      </div>
    </div>

    <!-- 步骤 3: 执行 -->
    <div v-if="interceptors.length > 0" class="actions">
      <button @click="executeWithConfig" :disabled="isLoading">
        应用配置并执行
      </button>
      <button @click="resetConfig">
        重置
      </button>
    </div>
  </div>
</template>
```

**工作流程**:
1. 用户点击"获取拦截器清单",发起 Dry-run 请求
2. 后端返回会调用的所有拦截器列表
3. 用户为每个拦截器选择模式(record/enabled/disabled)
4. 用户点击"应用配置并执行",发起真实请求
5. 请求自动携带 `X-Intercept-Config` Header
6. 每个拦截器根据配置决定行为

### 5. 迁移策略

#### 阶段 1: 添加新函数(向后兼容)
- 实现 Intercept0-5 系列函数
- 保留原有 `Intercept` 函数不变
- 新旧函数可以共存

#### 阶段 2: 逐步迁移调用点
- 识别所有 `Intercept` 调用点
- 根据参数数量选择合适的新函数
- 更新调用代码
- 通过单元测试验证

#### 阶段 3: 废弃旧函数
- 标记原 `Intercept` 函数为 deprecated
- 所有调用点迁移完成后删除

#### 兼容层实现
```go
// 保留旧的 Intercept 函数作为兼容层
func Intercept[T any](
    ctx context.Context,
    operation string,
    realFn func(context.Context) (T, error),
) (T, error) {
    // 直接调用 Intercept0
    return Intercept0(ctx, operation, realFn)
}
```

## 数据流示意图

```
┌─────────────┐
│   Frontend  │
│  Component  │
└──────┬──────┘
       │ 1. Initialize Session
       │
       ▼
┌─────────────────────────────┐
│  POST /api/interceptor/...  │
│  Response: {sessionId, ...} │
└──────┬──────────────────────┘
       │ 2. Set Session to API Client
       │
       ▼
┌─────────────────────────────┐
│   All API Requests          │
│   + X-Intercept-Session-Id  │
│   + X-Intercept-Mode        │
└──────┬──────────────────────┘
       │ 3. HTTP Request
       │
       ▼
┌─────────────────────────────┐
│  Interceptor Middleware     │
│  - Parse Headers            │
│  - Load Session             │
│  - Inject to ctx            │
└──────┬──────────────────────┘
       │ 4. ctx with Session
       │
       ▼
┌─────────────────────────────┐
│  Business Handler           │
│  - Call Service Method      │
└──────┬──────────────────────┘
       │ 5. Service Call
       │
       ▼
┌─────────────────────────────┐
│  Interceptor.Intercept1/2/3 │
│  - Check Session Mode       │
│  - Return Mock or Real Data │
│  - Log Execution            │
└──────┬──────────────────────┘
       │ 6. Result
       │
       ▼
┌─────────────────────────────┐
│  HTTP Response              │
│  - Business Data            │
│  - Execution Log            │
└─────────────────────────────┘
```

## 测试策略

### 单元测试
- 每个 Intercept 重载函数的独立测试
- 不同模式(enabled/disabled/record)的行为测试
- 参数类型转换和序列化测试
- 错误处理测试

### 集成测试
- 中间件 Header 解析测试
- 端到端会话管理测试
- 多个调用点的拦截器协同测试
- 前后端集成测试

### 性能测试
- 对比新旧调用方式的性能
- 中间件开销测试
- 高并发场景下的会话管理测试

## 风险与缓解措施

### 风险 1: 泛型编译错误
**缓解**:
- 提供详细的使用文档和示例
- 在 IDE 中配置类型提示
- 提供类型辅助函数

### 风险 2: 迁移工作量大
**缓解**:
- 提供自动化迁移脚本(可选)
- 分阶段迁移,不强制一次性完成
- 保留兼容层支持旧代码

### 风险 3: Header 传递失败
**缓解**:
- 添加日志记录 Header 解析过程
- 提供降级机制(Header 缺失时仍可工作)
- 在开发环境提供调试工具

## 总结

本设计方案通过以下方式优化了拦截器的实现:
1. **更简洁的 API**: 使用泛型直接传递方法引用
2. **标准化的集成**: 通过 HTTP Header 和中间件集成
3. **更好的可观测性**: 完整记录方法调用信息
4. **灵活的控制**: 支持前端动态控制拦截行为
5. **平滑的迁移**: 提供兼容层和分阶段迁移策略

这些改进将显著提升代码的可读性、可维护性和可调试性,同时保持良好的性能和类型安全。
