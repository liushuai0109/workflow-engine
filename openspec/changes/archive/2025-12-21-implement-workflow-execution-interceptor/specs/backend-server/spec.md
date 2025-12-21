# backend-server 增量规范

本文件定义了工作流执行拦截器(Workflow Execution Interceptor)功能对 backend-server 规范的增量变更。

---

## ADDED Requirements

### Requirement: 工作流执行拦截器框架

系统 MUST 提供工作流执行拦截器框架,支持在数据访问层拦截函数调用,并根据模式返回 Mock 数据或真实数据。

#### Scenario: 拦截器核心函数

- **当** 系统需要执行数据访问操作时
- **则** 系统应提供泛型拦截器函数 `Intercept[T](ctx context.Context, operation string, realFn func(context.Context) (T, error)) (T, error)`
- **并且** 拦截器应从 Context 中获取 `InterceptSession`
- **并且** 如果 Session 不存在或模式为 `InterceptModeDisabled`,则直接执行真实函数
- **并且** 拦截器应记录每次调用的执行日志

#### Scenario: 拦截器模式 - Disabled

- **当** 拦截器模式设置为 `InterceptModeDisabled` 时
- **则** 拦截器应直接执行 `realFn` 并返回结果
- **并且** 不应查询 Mock 数据存储
- **并且** 不应记录执行日志

#### Scenario: 拦截器模式 - Enabled

- **当** 拦截器模式设置为 `InterceptModeEnabled` 时
- **并且** Mock 数据存储中存在对应 `operation` 的数据时
- **则** 拦截器应返回 Mock 数据
- **并且** 不应执行 `realFn`
- **并且** 应记录执行日志,标记 `isMocked=true`

#### Scenario: 拦截器模式 - Enabled 降级

- **当** 拦截器模式设置为 `InterceptModeEnabled` 时
- **并且** Mock 数据存储中不存在对应 `operation` 的数据时
- **则** 拦截器应降级执行 `realFn`
- **并且** 应记录执行日志,标记 `isMocked=false`

#### Scenario: 拦截器模式 - Record

- **当** 拦截器模式设置为 `InterceptModeRecord` 时
- **则** 拦截器应执行 `realFn` 获取真实数据
- **并且** 如果执行成功,应将结果存储到 Mock 数据存储中
- **并且** 应记录执行日志,标记 `isMocked=false`

---

### Requirement: Mock 数据存储

系统 MUST 提供线程安全的 Mock 数据存储,支持按操作名称存储和获取 Mock 数据。

#### Scenario: 存储 Mock 数据

- **当** 调用 `Set(key string, value interface{})` 时
- **则** 系统应使用写锁保护并发访问
- **并且** 应将数据存储到 `map[string]interface{}`
- **并且** 如果 key 已存在,应覆盖旧值

#### Scenario: 获取 Mock 数据

- **当** 调用 `Get(key string) (interface{}, bool)` 时
- **则** 系统应使用读锁保护并发访问
- **并且** 应返回数据和存在标志
- **并且** 如果 key 不存在,应返回 `(nil, false)`

#### Scenario: 批量设置 Mock 数据

- **当** 调用 `SetBatch(data map[string]interface{})` 时
- **则** 系统应使用写锁保护并发访问
- **并且** 应遍历 data 并调用 `Set()` 存储每个键值对

#### Scenario: JSON 序列化

- **当** 调用 `LoadFromJSON(jsonData string)` 时
- **则** 系统应解析 JSON 字符串为 `map[string]interface{}`
- **并且** 如果解析失败,应返回错误
- **并且** 如果解析成功,应替换现有数据

- **当** 调用 `ExportToJSON()` 时
- **则** 系统应将数据序列化为 JSON 字符串
- **并且** 应使用缩进格式化

---

### Requirement: 拦截会话管理

系统 MUST 提供拦截会话(InterceptSession)管理,支持创建、获取、删除会话。

#### Scenario: 创建拦截会话

- **当** 调用会话存储的 `Set(id string, session *InterceptSession)` 时
- **则** 系统应使用写锁保护并发访问
- **并且** 应将会话存储到内存 map 中
- **并且** 会话应包含以下字段:
  - `ID`: 会话 ID
  - `InstanceID`: 工作流实例 ID
  - `Mode`: 拦截模式
  - `DataStore`: Mock 数据存储
  - `ExecutionLog`: 执行日志数组
  - `CreatedAt`: 创建时间

#### Scenario: 获取拦截会话

- **当** 调用会话存储的 `Get(id string) (*InterceptSession, error)` 时
- **则** 系统应使用读锁保护并发访问
- **并且** 如果会话存在,应返回会话对象
- **并且** 如果会话不存在,应返回错误

#### Scenario: 删除拦截会话

- **当** 调用会话存储的 `Delete(id string)` 时
- **则** 系统应使用写锁保护并发访问
- **并且** 应从内存 map 中删除会话

#### Scenario: Context 传递会话

- **当** 调用 `WithInterceptSession(ctx context.Context, session *InterceptSession)` 时
- **则** 系统应创建新的 Context,包含会话信息
- **并且** 应使用特定的 Context key 存储会话

- **当** 调用 `GetInterceptSession(ctx context.Context)` 时
- **则** 系统应从 Context 中提取会话
- **并且** 如果 Context 中不包含会话,应返回 nil

---

### Requirement: 拦截器 HTTP API

系统 MUST 提供 HTTP API 端点,支持初始化拦截执行、触发节点、查询会话和重置执行。

#### Scenario: 初始化拦截执行

- **当** 客户端发送 `POST /api/interceptor/workflows/:workflowId/execute` 请求时
- **并且** 请求体包含:
  ```json
  {
    "startNodeId": "StartEvent_1",
    "initialVariables": { "key": "value" },
    "mockData": {
      "ServiceTask:nodeId": {
        "statusCode": 200,
        "body": { "result": "success" }
      }
    },
    "bpmnXml": "<bpmn:definitions>...</bpmn:definitions>"
  }
  ```
- **则** 系统应:
  - 如果提供了 bpmnXml,存储到内存
  - 解析 BPMN 查找起始节点(如果未提供 startNodeId)
  - 创建 Mock 工作流实例
  - 创建拦截会话,模式为 `InterceptModeEnabled`
  - 加载 mockData 到会话的 DataStore
  - 保存会话到会话存储
- **并且** 成功响应应返回 200 状态码和以下数据:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session-1234567890",
      "instanceId": "mock-instance-1234567890",
      "workflowId": "workflow-001",
      "status": "ready",
      "currentNodeIds": ["StartEvent_1"],
      "variables": { "key": "value" }
    }
  }
  ```

#### Scenario: 触发节点继续执行

- **当** 客户端发送 `POST /api/interceptor/instances/:instanceId/trigger` 请求时
- **并且** 查询参数包含 `sessionId=session-1234567890`
- **并且** 请求体包含:
  ```json
  {
    "nodeId": "UserTask_1",
    "businessParams": {
      "approved": true,
      "comment": "Approved"
    }
  }
  ```
- **则** 系统应:
  - 从会话存储获取会话
  - 创建带有会话的 Context
  - 调用 `WorkflowEngineService.ExecuteFromNode(ctx, instanceId, nodeId, businessParams)`
  - 更新会话到会话存储
- **并且** 成功响应应返回 200 状态码和以下数据:
  ```json
  {
    "success": true,
    "data": {
      "result": {
        "businessResponse": { "statusCode": 200, "body": { ... } },
        "engineResponse": {
          "instanceId": "mock-instance-1234567890",
          "currentNodeIds": ["ServiceTask_2"],
          "status": "running",
          "executionId": "exec-1234567890",
          "variables": { ... }
        }
      },
      "executionLog": [
        {
          "timestamp": "2025-12-21T10:00:00Z",
          "operation": "UserTask:UserTask_1",
          "isMocked": true,
          "output": { ... }
        }
      ]
    }
  }
  ```

#### Scenario: 获取会话信息

- **当** 客户端发送 `GET /api/interceptor/sessions/:sessionId` 请求时
- **则** 系统应从会话存储获取会话
- **并且** 如果会话不存在,应返回 404 状态码和错误 `SESSION_NOT_FOUND`
- **并且** 如果会话存在,应返回 200 状态码和会话数据:
  ```json
  {
    "success": true,
    "data": {
      "id": "session-1234567890",
      "instanceId": "mock-instance-1234567890",
      "mode": "enabled",
      "executionLog": [ ... ],
      "createdAt": "2025-12-21T09:00:00Z"
    }
  }
  ```

#### Scenario: 获取执行日志

- **当** 客户端发送 `GET /api/interceptor/sessions/:sessionId/log` 请求时
- **则** 系统应从会话存储获取会话
- **并且** 应返回会话的执行日志数组
- **并且** 每个日志条目应包含:
  - `timestamp`: 时间戳
  - `operation`: 操作名称
  - `input`: 输入数据(可选)
  - `output`: 输出数据(可选)
  - `isMocked`: 是否使用 Mock 数据
  - `error`: 错误信息(可选)

#### Scenario: 重置拦截执行

- **当** 客户端发送 `POST /api/interceptor/sessions/:sessionId/reset` 请求时
- **则** 系统应:
  - 从会话存储获取会话
  - 删除 Mock 工作流实例
  - 从会话存储删除会话
- **并且** 成功响应应返回 200 状态码和成功消息

---

## MODIFIED Requirements

### Requirement: 工作流引擎集成拦截器

系统 MUST 在工作流引擎的所有数据访问点集成拦截器,支持 Mock 模式和真实模式的统一执行。

#### Scenario: ServiceTask 执行集成拦截器

- **当** 工作流引擎执行 ServiceTask 节点时
- **则** 系统应使用 `Intercept()` 包装服务调用:
  ```go
  response, err := interceptor.Intercept(ctx,
      fmt.Sprintf("ServiceTask:%s", node.Id),
      func(ctx context.Context) (*BusinessResponse, error) {
          return s.callRealService(ctx, node, instance, businessParams)
      },
  )
  ```
- **并且** 如果拦截器返回 Mock 数据,不应调用真实服务
- **并且** 如果拦截器返回真实数据,应调用真实服务

#### Scenario: UserTask 执行集成拦截器

- **当** 工作流引擎执行 UserTask 节点时
- **则** 系统应使用 `Intercept()` 包装任务创建:
  ```go
  response, err := interceptor.Intercept(ctx,
      fmt.Sprintf("UserTask:%s", node.Id),
      func(ctx context.Context) (*BusinessResponse, error) {
          taskId := fmt.Sprintf("task-%s-%d", node.Id, time.Now().UnixNano())
          return &BusinessResponse{
              StatusCode: 200,
              Body: map[string]interface{}{
                  "taskId": taskId,
                  "status": "pending",
              },
          }, nil
      },
  )
  ```
- **并且** 执行后应保持在当前节点(shouldAutoAdvance=false)

#### Scenario: 获取工作流实例集成拦截器

- **当** 工作流引擎获取工作流实例时
- **则** 系统应使用 `Intercept()` 包装实例查询:
  ```go
  instance, err := interceptor.Intercept(ctx,
      fmt.Sprintf("GetInstance:%s", instanceId),
      func(ctx context.Context) (*models.WorkflowInstance, error) {
          session := interceptor.GetInterceptSession(ctx)
          if session != nil && session.InstanceID == instanceId {
              // Mock 实例
              if s.mockInstanceSvc.MockInstanceExists(instanceId) {
                  mockInstance, err := s.mockInstanceSvc.GetMockInstance(ctx, instanceId)
                  return ConvertMockInstanceToWorkflowInstance(mockInstance), err
              }
          }
          // 真实实例
          return s.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)
      },
  )
  ```

#### Scenario: 更新工作流实例集成拦截器

- **当** 工作流引擎更新工作流实例时
- **则** 系统应使用 `Intercept()` 包装实例更新:
  ```go
  err = interceptor.Intercept(ctx,
      fmt.Sprintf("UpdateInstance:%s", instance.Id),
      func(ctx context.Context) error {
          session := interceptor.GetInterceptSession(ctx)
          if session != nil && session.InstanceID == instance.Id {
              // Mock 实例
              if s.mockInstanceSvc.MockInstanceExists(instance.Id) {
                  _, err := s.mockInstanceSvc.UpdateMockInstance(...)
                  return err
              }
          }
          // 真实实例
          return s.instanceSvc.UpdateWorkflowInstance(ctx, instance)
      },
  )
  ```

#### Scenario: shouldAutoAdvance 机制保持不变

- **当** 工作流引擎判断节点是否自动推进时
- **则** 系统应保持现有 `shouldAutoAdvance()` 逻辑不变
- **并且** UserTask、IntermediateCatchEvent、EventBasedGateway、ReceiveTask 应返回 false
- **并且** 其他节点类型应返回 true
- **并且** 拦截器不应影响此逻辑

---

## Implementation Notes

### 包结构

```
server/internal/interceptor/
├── interceptor.go        # 核心拦截器函数
├── data_store.go         # Mock 数据存储
├── session_store.go      # 会话存储
├── interceptor_test.go   # 核心测试
├── data_store_test.go    # 数据存储测试
└── session_store_test.go # 会话存储测试
```

### 类型定义

```go
// InterceptMode 拦截模式
type InterceptMode string

const (
    InterceptModeDisabled InterceptMode = "disabled"
    InterceptModeEnabled  InterceptMode = "enabled"
    InterceptModeRecord   InterceptMode = "record"
)

// InterceptSession 拦截会话
type InterceptSession struct {
    ID           string
    InstanceID   string
    Mode         InterceptMode
    DataStore    *InterceptDataStore
    ExecutionLog []ExecutionLogEntry
    CreatedAt    time.Time
}

// ExecutionLogEntry 执行日志条目
type ExecutionLogEntry struct {
    Timestamp time.Time   `json:"timestamp"`
    Operation string      `json:"operation"`
    Input     interface{} `json:"input,omitempty"`
    Output    interface{} `json:"output,omitempty"`
    IsMocked  bool        `json:"isMocked"`
    Error     string      `json:"error,omitempty"`
}
```

### Context Key

```go
type contextKey string

const (
    InterceptSessionKey contextKey = "intercept_session"
)
```

### 性能要求

- 拦截器函数调用开销应 < 100 纳秒(不包括真实函数执行时间)
- Mock 数据查询应为 O(1) 复杂度
- 并发访问应使用 `sync.RWMutex` 保护
- 执行日志应限制条数,避免内存泄漏(建议最多保留 1000 条)
