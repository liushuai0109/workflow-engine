# 设计文档:拦截器调用方式重构

## 概述

本文档描述了拦截器调用方式重构的详细设计方案,包括新的函数签名、上下文传递机制、HTTP Header 集成以及前后端协作流程。

## 架构决策

### 1. 参数传递方式:结构体 vs 离散参数 vs 可变参数

**决策**: 使用结构体参数 + 单一泛型函数。

**理由**:
- **类型安全**: 泛型在编译时检查类型,避免运行时错误
- **代码简洁**: 只需一个 Intercept 函数,无需多个重载版本
- **参数语义化**: 结构体字段有明确名称,可读性强
- **扩展性好**: 添加新参数只需修改结构体,不影响函数签名
- **序列化友好**: 结构体天然支持 JSON 序列化,便于日志和标识生成
- **IDE 支持**: 结构体字面量有自动补全和类型检查

**权衡**:
- 需要为每个业务方法定义参数结构体
- 单参数方法显得略微繁琐(但换来统一性)

**对比其他方案**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| **结构体(采用)** | 代码量少,扩展性好,语义清晰 | 需要定义结构体 |
| 泛型穷举 | 类型安全,性能好 | 需要 Intercept0-5,代码重复 |
| 反射 | 最灵活 | 性能差,失去类型检查 |
| 可变参数 | Go 不支持泛型可变参数 | 技术上不可行 |

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

**标识格式**: `{operation}:{idField1}:{idField2}:...`

**生成规则**:
1. 从 operation 字符串提取操作名
2. 使用反射遍历参数结构体字段
3. 提取带 `intercept:"id"` tag 的字段值
4. 序列化这些字段值(使用 JSON)
5. 用冒号 `:` 连接

**示例**:
```go
// 参数结构体定义
type GetWorkflowParams struct {
    WorkflowID string `json:"workflowId" intercept:"id"`
    IncludeDeleted bool `json:"includeDeleted"`
    Cache bool `json:"-"`
}

// 调用
workflow, err := interceptor.Intercept(ctx,
    "GetWorkflow",
    s.workflowSvc.GetWorkflowByID,
    GetWorkflowParams{
        WorkflowID: "workflow-123",
        IncludeDeleted: true,
        Cache: false,
    },
)
// 生成标识: "GetWorkflow:workflow-123"
// 注意: IncludeDeleted 和 Cache 不参与 ID 生成

type UpdateInstanceParams struct {
    InstanceID string `json:"instanceId" intercept:"id"`
    Status string `json:"status" intercept:"id"`
    Variables map[string]interface{} `json:"variables"`
}

instance, err := interceptor.Intercept(ctx,
    "UpdateInstance",
    s.instanceSvc.UpdateWorkflowInstance,
    UpdateInstanceParams{
        InstanceID: "instance-456",
        Status: "running",
        Variables: vars,
    },
)
// 生成标识: "UpdateInstance:instance-456:running"
```

**字段序列化规则**:
- 字符串: 直接使用
- 数字: 转换为字符串
- 布尔值: "true" 或 "false"
- 复杂类型: JSON 序列化后哈希(避免过长)
- nil/空值: 使用 "null"

**Tag 规范**:
- `intercept:"id"` - 字段参与唯一标识生成
- `intercept:"-"` - 字段不参与任何拦截器逻辑
- 无 tag - 字段不参与 ID 生成,但会被完整记录

**唯一性保证**:
- 对于同一操作和同一组 ID 字段值,始终生成相同标识
- 不同 ID 字段值生成不同标识
- 标识包含足够信息用于调试和日志追踪

## 详细设计

### 1. 拦截器核心函数签名

#### 单一泛型函数

```go
// 唯一的拦截器函数,处理所有场景
func Intercept[T any, P any](
    ctx context.Context,
    operation string,
    fn func(context.Context, P) (T, error),
    params P,
) (T, error)
```

**类型参数**:
- `T`: 方法返回值类型
- `P`: 参数结构体类型

**调用示例**:

```go
// 示例 1: 单参数方法
type GetWorkflowParams struct {
    WorkflowID string `json:"workflowId" intercept:"id"`
}

workflow, err := interceptor.Intercept(ctx,
    "GetWorkflow",
    s.workflowSvc.GetWorkflowByID,
    GetWorkflowParams{WorkflowID: "workflow-123"},
)

// 示例 2: 多参数方法
type UpdateInstanceParams struct {
    InstanceID string `json:"instanceId" intercept:"id"`
    Status string `json:"status" intercept:"id"`
    Variables map[string]interface{} `json:"variables"`
    Force bool `json:"force"`
}

instance, err := interceptor.Intercept(ctx,
    "UpdateInstance",
    s.instanceSvc.UpdateInstance,
    UpdateInstanceParams{
        InstanceID: "instance-456",
        Status: "running",
        Variables: vars,
        Force: false,
    },
)

// 示例 3: 无额外参数的方法(使用空结构体)
type ListWorkflowsParams struct{}

workflows, err := interceptor.Intercept(ctx,
    "ListWorkflows",
    s.workflowSvc.ListWorkflows,
    ListWorkflowsParams{},
)
```

**旧方式对比**:

```go
// 旧方式 - 闭包
workflow, err := interceptor.Intercept(ctx,
    "GetWorkflow",
    func(ctx context.Context) (*models.Workflow, error) {
        return s.workflowSvc.GetWorkflowByID(ctx, workflowId)
    },
)

// 新方式 - 结构体参数
workflow, err := interceptor.Intercept(ctx,
    "GetWorkflow",
    s.workflowSvc.GetWorkflowByID,
    GetWorkflowParams{WorkflowID: workflowId},
)
```

### 2. 业务方法改造规范

#### 原方法签名
```go
func (s *WorkflowService) GetWorkflowByID(
    ctx context.Context,
    workflowID string,
) (*Workflow, error)

func (s *WorkflowService) UpdateInstance(
    ctx context.Context,
    instanceID string,
    status string,
    variables map[string]interface{},
    force bool,
) (*Instance, error)
```

#### 改造后签名
```go
// 1. 定义参数结构体
type GetWorkflowParams struct {
    WorkflowID string `json:"workflowId" intercept:"id"`
}

type UpdateInstanceParams struct {
    InstanceID string `json:"instanceId" intercept:"id"`
    Status string `json:"status" intercept:"id"`
    Variables map[string]interface{} `json:"variables"`
    Force bool `json:"force"`
}

// 2. 方法改为接受结构体参数
func (s *WorkflowService) GetWorkflowByID(
    ctx context.Context,
    params GetWorkflowParams,
) (*Workflow, error) {
    // 使用 params.WorkflowID
}

func (s *WorkflowService) UpdateInstance(
    ctx context.Context,
    params UpdateInstanceParams,
) (*Instance, error) {
    // 使用 params.InstanceID, params.Status 等
}
```

#### 参数结构体命名规范
- 格式: `{MethodName}Params`
- 示例: `GetWorkflowParams`, `UpdateInstanceParams`, `ListWorkflowsParams`
- 放置位置: 紧邻方法定义,或集中在 `types.go` 文件

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

#### 核心逻辑
```go
func Intercept[T any, P any](
    ctx context.Context,
    operation string,
    fn func(context.Context, P) (T, error),
    params P,
) (T, error) {
    var zero T

    // 1. 生成拦截器唯一标识(从结构体参数中提取)
    interceptorId := generateInterceptorId(operation, params)

    // 2. 检查是否为 Dry-run 模式
    if IsDryRunMode(ctx) {
        // Dry-run: 记录拦截器信息但不执行
        RecordInterceptorCall(ctx, interceptorId, operation, params)
        return zero, ErrDryRunMode // 特殊错误,表示 dry-run
    }

    // 3. 获取拦截器配置
    config := GetInterceptConfig(ctx)
    mode := config.GetMode(interceptorId) // 未配置则返回默认 "record"

    // 4. 根据模式决定行为
    switch mode {
    case InterceptModeDisabled:
        // 禁用模式:直接执行,不记录
        return fn(ctx, params)

    case InterceptModeEnabled:
        // 启用模式:优先使用 mock 数据
        mockData, exists := config.GetMockData(interceptorId)
        if exists {
            result, ok := mockData.(T)
            if ok {
                LogExecution(ctx, interceptorId, params, result, true, "")
                RecordCall(ctx, interceptorId, params, result)
                return result, nil
            }
        }
        // 未找到 mock 数据,回退到真实调用
        result, err := fn(ctx, params)
        LogExecution(ctx, interceptorId, params, result, false, errString(err))
        RecordCall(ctx, interceptorId, params, result)
        return result, err

    case InterceptModeRecord:
        // 记录模式:执行真实方法并记录
        result, err := fn(ctx, params)
        if err == nil {
            config.SetMockData(interceptorId, result)
        }
        LogExecution(ctx, interceptorId, params, result, false, errString(err))
        RecordCall(ctx, interceptorId, params, result)
        return result, err

    default:
        // 默认:记录模式
        result, err := fn(ctx, params)
        LogExecution(ctx, interceptorId, params, result, false, errString(err))
        RecordCall(ctx, interceptorId, params, result)
        return result, err
    }
}
```

#### generateInterceptorId - 从结构体生成 ID
```go
func generateInterceptorId(operation string, params interface{}) string {
    // 1. 获取参数结构体的反射值
    val := reflect.ValueOf(params)
    if val.Kind() == reflect.Ptr {
        val = val.Elem()
    }

    // 2. 确保是结构体
    if val.Kind() != reflect.Struct {
        // 非结构体(如基本类型),直接序列化
        return fmt.Sprintf("%s:%v", operation, params)
    }

    // 3. 遍历字段,提取带 intercept:"id" tag 的字段
    typ := val.Type()
    idParts := []string{operation}

    for i := 0; i < val.NumField(); i++ {
        field := typ.Field(i)
        tagValue := field.Tag.Get("intercept")

        // 只处理带 intercept:"id" tag 的字段
        if tagValue == "id" {
            fieldVal := val.Field(i)
            serialized := serializeField(fieldVal)
            idParts = append(idParts, serialized)
        }
    }

    return strings.Join(idParts, ":")
}

func serializeField(val reflect.Value) string {
    switch val.Kind() {
    case reflect.String:
        return val.String()
    case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
        return fmt.Sprintf("%d", val.Int())
    case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
        return fmt.Sprintf("%d", val.Uint())
    case reflect.Bool:
        return fmt.Sprintf("%t", val.Bool())
    case reflect.Float32, reflect.Float64:
        return fmt.Sprintf("%f", val.Float())
    default:
        // 复杂类型:JSON 序列化并哈希(避免过长)
        data, err := json.Marshal(val.Interface())
        if err != nil {
            return "error"
        }
        if len(data) > 50 {
            // 过长则哈希
            hash := sha256.Sum256(data)
            return hex.EncodeToString(hash[:8]) // 使用前 8 字节
        }
        return string(data)
    }
}
```

**关键改进**:
- 自动从结构体提取 ID 字段(通过反射和 tag)
- 支持任意结构体类型,无需手动穷举
- 参数完整记录(整个结构体),ID 只用关键字段
- 代码更简洁,扩展性更好

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

### 6. ExecuteFromNode 方法签名重构

#### 设计原则：职责分离

**核心理念**: Handler 层负责数据准备，Service 层负责业务逻辑

#### 方法签名变更

**旧签名**（已废弃）:
```go
// 通过 ID 查询数据（内部使用拦截器）
func (s *WorkflowEngineService) ExecuteFromNode(
    ctx context.Context,
    instanceId string,
    fromNodeId string,
    businessParams map[string]interface{},
) (*ExecuteResult, error)

// 带可选数据的版本（临时方案）
func (s *WorkflowEngineService) ExecuteFromNodeWithOptionalData(
    ctx context.Context,
    instanceId string,
    fromNodeId string,
    businessParams map[string]interface{},
    optionalWorkflow *models.Workflow,
    optionalInstance *models.WorkflowInstance,
) (*ExecuteResult, error)
```

**新签名**（当前实现）:
```go
// 接收数据对象（数据准备在 Handler 层完成）
func (s *WorkflowEngineService) ExecuteFromNode(
    ctx context.Context,
    workflow *models.Workflow,
    instance *models.WorkflowInstance,
    fromNodeId string,
    businessParams map[string]interface{},
) (*ExecuteResult, error)
```

#### 架构优势

1. **职责清晰**
   - Handler 层：数据准备（从 request body 或数据库获取）
   - Service 层：业务逻辑（专注工作流执行）

2. **简化依赖**
   - ExecuteFromNode 不再依赖 workflowSvc 和 instanceSvc
   - 移除内部的 GetInstance 和 GetWorkflow 拦截器调用
   - 减少服务间的循环依赖

3. **易于测试**
   - 可以直接传入 mock 对象，无需数据库
   - 测试更加独立和可控
   - 便于单元测试覆盖各种场景

4. **代码简洁**
   - 减少不必要的拦截器调用
   - 数据获取逻辑统一在 Handler 层
   - Service 方法更加纯粹

#### Handler 层实现

**两种路由对应两种数据准备方式**:

```go
// 路由 1: POST /api/execute/:workflowInstanceId
// 正常模式 - 从数据库查询数据
func (h *WorkflowExecutorHandler) ExecuteWorkflow(c *gin.Context) {
    instanceId := c.Param("workflowInstanceId")

    // 1. 从数据库获取 workflow 和 instance
    instance, err := h.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)
    workflow, err := h.workflowSvc.GetWorkflowByID(ctx, instance.WorkflowId)

    // 2. 调用执行引擎
    result, err := h.engineService.ExecuteFromNode(ctx, workflow, instance, fromNodeId, businessParams)

    c.JSON(http.StatusOK, result)
}

// 路由 2: POST /api/execute
// Mock 模式 - 从请求体获取数据
func (h *WorkflowExecutorHandler) ExecuteWorkflowMock(c *gin.Context) {
    var req struct {
        Workflow         *models.Workflow         `json:"workflow" binding:"required"`
        WorkflowInstance *models.WorkflowInstance `json:"workflowInstance" binding:"required"`
        FromNodeId       string                    `json:"fromNodeId"`
        BusinessParams   map[string]interface{}   `json:"businessParams"`
    }

    // 1. 从 request body 获取 workflow 和 instance
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // 2. 调用执行引擎
    result, err := h.engineService.ExecuteFromNode(ctx, req.Workflow, req.WorkflowInstance, req.FromNodeId, req.BusinessParams)

    c.JSON(http.StatusOK, result)
}
```

#### 前端调用方式

**正常模式**（需要数据库中的数据）:
```typescript
// URL 包含 instanceId
const result = await apiClient.post(`/execute/${instanceId}`, {
    fromNodeId: 'StartEvent_1',
    businessParams: {}
})
```

**全程 Mock 模式**（无需数据库）:
```typescript
// 生成新的 UUID v4
const workflowInstanceId = uuidv4()

// 应用通配符拦截器配置
apiClient.setInterceptorConfig({ '*': 'enabled' })

// URL 不包含参数，所有数据在请求体中
const result = await apiClient.post(`/execute`, {
    fromNodeId: 'StartEvent_1',
    businessParams: {},
    workflow: {
        id: 'Process_1',
        name: 'Mock Workflow Process_1',
        bpmnXml: '<bpmn:definitions>...</bpmn:definitions>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    workflowInstance: {
        id: workflowInstanceId,
        workflowId: 'Process_1',
        name: `Mock Instance ${workflowInstanceId}`,
        status: 'running',
        currentNodeIds: [],
        instanceVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
})
```

#### 通配符拦截器支持

**拦截器配置增强**:
```go
func (c *InterceptConfig) GetMode(interceptorID string) InterceptMode {
    // 1. 检查具体拦截器配置
    if mode, exists := c.configMap[interceptorID]; exists {
        return InterceptMode(mode)
    }
    // 2. 检查通配符 "*" 配置
    if mode, exists := c.configMap["*"]; exists {
        return InterceptMode(mode)
    }
    // 3. 返回系统默认
    return InterceptModeRecord
}
```

**使用场景**:
- `{"*": "enabled"}` - 全程 Mock 模式（所有拦截器启用 mock）
- `{"*": "record"}` - 默认模式（所有拦截器启用记录）
- `{"*": "disabled"}` - 所有拦截器禁用
- `{"*": "enabled", "GetInstance:123": "record"}` - 全程 mock，但特定拦截器真实执行

**优先级**: 具体拦截器配置 > 通配符配置 > 系统默认（record）

## 总结

本设计方案通过以下方式优化了拦截器的实现:
1. **更简洁的 API**: 使用泛型直接传递方法引用
2. **标准化的集成**: 通过 HTTP Header 和中间件集成
3. **更好的可观测性**: 完整记录方法调用信息
4. **灵活的控制**: 支持前端动态控制拦截行为
5. **平滑的迁移**: 提供兼容层和分阶段迁移策略
6. **职责分离**: Handler 负责数据准备，Service 专注业务逻辑
7. **通配符支持**: 支持全局拦截器配置，实现全程 Mock 模式

这些改进将显著提升代码的可读性、可维护性和可调试性,同时保持良好的性能和类型安全。
