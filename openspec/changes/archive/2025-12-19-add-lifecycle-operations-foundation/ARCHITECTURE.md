# 架构文档

## 系统架构演进

### 当前架构（本次变更前）

```mermaid
graph TB
    subgraph "浏览器"
        UI[Vue 3 SPA]
        Editor[BPMN 编辑器<br/>bpmn-js]
        Storage[localStorage]

        UI --> Editor
        Editor --> Storage
    end

    subgraph "外部服务"
        LLM[Gemini API<br/>可选]
    end

    UI -.-> LLM

    style UI fill:#e1f5ff
    style Editor fill:#fff4e6
    style Storage fill:#f3e5f5
```

**局限性**:
- 仅客户端，无后端
- 除 localStorage 外没有数据持久化
- 无用户管理或身份验证
- 仅限于技术工作流建模
- 缺少业务上下文（生命周期阶段、细分、触发器）

---

### 目标架构（第 1 阶段后）

```mermaid
graph TB
    subgraph "浏览器 - 前端"
        UI[Vue 3 SPA]

        subgraph "编辑器层"
            Editor[增强 BPMN 编辑器]
            Props[属性面板<br/>+ 生命周期上下文]
            Viz[生命周期可视化器]
        end

        subgraph "服务层"
            LS[生命周期服务]
            SS[细分服务]
            TS[触发器服务]
            MS[元数据服务]
            EOS[编辑器操作服务]
        end

        subgraph "数据层"
            Adapter[BPMN 适配器<br/>+ 生命周期支持]
            Types[TypeScript 类型]
            Config[JSON 配置]
        end

        UI --> Editor
        Editor --> Props
        Editor --> Viz
        Props --> LS
        Props --> SS
        Props --> TS
        Editor --> EOS
        EOS --> Adapter
        LS --> Types
        SS --> Types
        TS --> Types
        Props --> Config
    end

    subgraph "外部服务"
        LLM[Gemini API]
        Storage[localStorage<br/>增强]
    end

    Adapter --> Storage
    UI -.-> LLM

    style UI fill:#e1f5ff
    style Editor fill:#fff4e6
    style Props fill:#e8f5e9
    style Adapter fill:#f3e5f5
```

**改进**:
- 结构化的生命周期操作服务层
- 具有生命周期上下文的丰富类型系统
- 配置驱动的 UI 组件
- 具有业务元数据的增强数据模型
- 为未来后端集成奠定基础

---

## 组件架构

### 前端组件层次结构

```mermaid
graph TD
    App[App.vue<br/>根组件]

    subgraph "页面"
        BpmnPage[BpmnEditorPage.vue]
    end

    subgraph "核心编辑器"
        BpmnEditor[BpmnEditor.vue<br/>增强]
        Palette[调色板<br/>bpmn-js]
        Canvas[画布<br/>diagram-js]
        PropsPanel[属性面板<br/>增强]
    end

    subgraph "生命周期组件（新）"
        StageSelector[LifecycleStageSelector.vue]
        SegmentBuilder[UserSegmentBuilder.vue]
        TriggerEditor[TriggerConditionEditor.vue]
        MetadataPanel[WorkflowMetadataPanel.vue]
    end

    subgraph "现有组件"
        ChatBox[ChatBox.vue]
        Toolbar[工具栏]
    end

    App --> BpmnPage
    BpmnPage --> BpmnEditor
    BpmnPage --> Toolbar
    BpmnPage --> ChatBox

    BpmnEditor --> Palette
    BpmnEditor --> Canvas
    BpmnEditor --> PropsPanel

    PropsPanel --> StageSelector
    PropsPanel --> SegmentBuilder
    PropsPanel --> TriggerEditor
    PropsPanel --> MetadataPanel

    style BpmnEditor fill:#fff4e6
    style StageSelector fill:#e8f5e9
    style SegmentBuilder fill:#e8f5e9
    style TriggerEditor fill:#e8f5e9
    style MetadataPanel fill:#e8f5e9
```

---

### 服务层架构

```mermaid
graph LR
    subgraph "UI 组件"
        Comp[Vue 组件]
    end

    subgraph "服务层"
        direction TB

        LS[LifecycleService]
        SS[UserSegmentService]
        TS[TriggerService]
        MS[WorkflowMetadataService]
        EOS[EditorOperationService]

        subgraph "现有服务"
            LLM[LLMService]
            LocalStore[LocalStorageService]
            Figma[FigmaService]
        end
    end

    subgraph "数据访问"
        Adapter[BpmnAdapter]
        Config[配置加载器]
    end

    Comp --> LS
    Comp --> SS
    Comp --> TS
    Comp --> MS
    Comp --> EOS

    LS --> Config
    SS --> Config
    TS --> Config

    EOS --> Adapter
    MS --> Adapter

    Adapter --> LocalStore

    style LS fill:#e8f5e9
    style SS fill:#e8f5e9
    style TS fill:#e8f5e9
    style MS fill:#e8f5e9
```

**服务职责**:

| 服务 | 职责 | 关键方法 |
|---------|---------------|-------------|
| **LifecycleService** | 管理生命周期阶段 | `getStages()`, `assignStage()`, `getStageConfig()` |
| **UserSegmentService** | 管理用户细分 | `createSegment()`, `evaluateSegment()`, `getTemplates()` |
| **TriggerService** | 管理工作流触发器 | `createTrigger()`, `validateTrigger()`, `getTriggerTypes()` |
| **WorkflowMetadataService** | 管理工作流元数据 | `setMetadata()`, `getMetadata()`, `updateMetrics()` |
| **EditorOperationService** | 编辑器操作 | `createNode()`, `createFlow()`, `updateNode()` |

---

## 数据流架构

### 工作流生命周期数据流

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 属性面板
    participant LS as LifecycleService
    participant EOS as EditorOperationService
    participant Adapter as BpmnAdapter
    participant Storage as localStorage

    User->>UI: 选择元素
    UI->>LS: getCurrentStage(elementId)
    LS->>Adapter: getElementMetadata(elementId)
    Adapter-->>LS: metadata
    LS-->>UI: currentStage
    UI->>User: 显示阶段选择器

    User->>UI: 更改阶段为"Activation"
    UI->>LS: assignStage(elementId, "Activation")
    LS->>EOS: updateElement(elementId, metadata)
    EOS->>Adapter: updateElementMetadata(elementId, metadata)
    Adapter->>Storage: saveWorkflow(xml)
    Storage-->>Adapter: success
    Adapter-->>EOS: success
    EOS-->>LS: success
    LS-->>UI: success
    UI->>User: 更新视觉指示器
```

---

### 细分评估流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as SegmentBuilder
    participant SS as UserSegmentService
    participant Config as segment-config.json

    User->>UI: 打开细分构建器
    UI->>SS: getSegmentTemplates()
    SS->>Config: 加载模板
    Config-->>SS: templates
    SS-->>UI: templates
    UI->>User: 显示模板

    User->>UI: 选择"Active Users"模板
    UI->>SS: loadTemplate("active_users")
    SS->>Config: 获取模板定义
    Config-->>SS: conditions
    SS-->>UI: conditions
    UI->>User: 显示预填充的条件

    User->>UI: 自定义条件
    User->>UI: 保存细分
    UI->>SS: saveSegment(segment)
    SS->>SS: validateSegment(segment)
    SS-->>UI: 验证结果
    UI->>User: 确认已保存
```

---

## 数据模型架构

### 核心类型系统

```mermaid
classDiagram
    class LifecycleStage {
        <<enumeration>>
        Acquisition
        Activation
        Retention
        Revenue
        Referral
    }

    class WorkflowElement {
        +string id
        +string type
        +string name
        +LifecycleMetadata lifecycle
        +UserSegment[] segments
        +Trigger[] triggers
    }

    class LifecycleMetadata {
        +LifecycleStage stage
        +string color
        +string icon
        +WorkflowMetrics metrics
    }

    class UserSegment {
        +string id
        +string name
        +SegmentType type
        +SegmentCondition[] conditions
        +LogicalOperator operator
    }

    class SegmentCondition {
        +string field
        +ConditionOperator operator
        +any value
    }

    class Trigger {
        +string id
        +TriggerType type
        +string event
        +TriggerCondition[] conditions
        +Schedule schedule
    }

    class WorkflowMetrics {
        +string[] metricNames
        +Map~string, number~ targets
        +Map~string, number~ actual
    }

    class UserProfile {
        +string userId
        +Demographics demographics
        +BehavioralData behavioral
        +TransactionData transactions
        +LifecycleStage currentStage
    }

    WorkflowElement --> LifecycleMetadata
    WorkflowElement --> UserSegment
    WorkflowElement --> Trigger
    LifecycleMetadata --> WorkflowMetrics
    UserSegment --> SegmentCondition
    UserProfile --> LifecycleStage

    style WorkflowElement fill:#e1f5ff
    style LifecycleMetadata fill:#e8f5e9
    style UserSegment fill:#fff4e6
    style Trigger fill:#f3e5f5
```

---

### XML 架构扩展

```mermaid
graph TD
    subgraph "标准 BPMN"
        Defs[definitions]
        Process[process]
        Task[task]
        ExtElem[extensionElements]
    end

    subgraph "XFlow 扩展（现有）"
        XFlowProps[xflow:properties]
    end

    subgraph "生命周期扩展（新）"
        Lifecycle[xflow:lifecycle]
        Segment[xflow:segment]
        Trigger[xflow:trigger]
        Metrics[xflow:metrics]

        LStage[stage 属性]
        LColor[color 属性]

        SType[type 属性]
        SCond[xflow:condition]

        TType[type 属性]
        TEvent[event 属性]
        TSchedule[xflow:schedule]

        MMetric[xflow:metric]
    end

    Defs --> Process
    Process --> Task
    Task --> ExtElem
    ExtElem --> XFlowProps
    ExtElem --> Lifecycle
    ExtElem --> Segment
    ExtElem --> Trigger
    ExtElem --> Metrics

    Lifecycle --> LStage
    Lifecycle --> LColor

    Segment --> SType
    Segment --> SCond

    Trigger --> TType
    Trigger --> TEvent
    Trigger --> TSchedule

    Metrics --> MMetric

    style Lifecycle fill:#e8f5e9
    style Segment fill:#fff4e6
    style Trigger fill:#f3e5f5
    style Metrics fill:#e1f5ff
```

**示例 XML**:
```xml
<bpmn:task id="Task_1" name="Onboarding Tutorial">
  <bpmn:extensionElements>
    <xflow:lifecycle stage="Activation" color="#4caf50" />
    <xflow:segment type="demographic">
      <xflow:condition field="age" operator="between" value="18,35" />
      <xflow:condition field="country" operator="in" value="US,CA,UK" />
    </xflow:segment>
    <xflow:trigger type="event" event="user_signup" />
    <xflow:metrics>
      <xflow:metric name="completion_rate" target="0.75" />
      <xflow:metric name="time_to_complete" target="300" unit="seconds" />
    </xflow:metrics>
  </bpmn:extensionElements>
</bpmn:task>
```

---

## 集成架构（未来阶段）

### 第 2 阶段：后端集成

```mermaid
graph TB
    subgraph "前端（浏览器）"
        UI[Vue 3 SPA]
        Services[服务层]
    end

    subgraph "后端（第 2 阶段）"
        API[REST API 网关]

        subgraph "核心服务"
            WES[工作流执行<br/>服务]
            UPS[用户画像<br/>服务]
            ES[事件<br/>服务]
            AS[分析<br/>服务]
        end

        subgraph "数据层"
            DB[(PostgreSQL<br/>用户画像)]
            Cache[(Redis<br/>缓存)]
            Stream[Kafka<br/>事件流]
            DW[(数据仓库<br/>分析)]
        end
    end

    subgraph "外部系统"
        CRM[CRM 系统]
        Email[邮件服务]
        Analytics[分析平台]
    end

    UI --> Services
    Services --> API

    API --> WES
    API --> UPS
    API --> ES
    API --> AS

    WES --> DB
    WES --> Cache
    UPS --> DB
    ES --> Stream
    AS --> DW

    Stream --> DW

    WES --> Email
    UPS <--> CRM
    AS <--> Analytics

    style UI fill:#e1f5ff
    style WES fill:#e8f5e9
    style UPS fill:#fff4e6
    style ES fill:#f3e5f5
```

---

### 多阶段路线图

```mermaid
gantt
    title 实施路线图
    dateFormat  YYYY-MM-DD
    section 第 1 阶段：基础
    生命周期上下文       :done, p1a, 2024-01-01, 14d
    类型定义        :done, p1b, 2024-01-01, 7d
    UI 组件          :done, p1c, 2024-01-08, 14d
    服务层         :active, p1d, 2024-01-15, 10d
    测试和迁移    :p1e, 2024-01-25, 7d

    section 第 2 阶段：数据和分析
    后端 API            :p2a, 2024-02-01, 21d
    数据库设置         :p2b, 2024-02-01, 14d
    事件管道         :p2c, 2024-02-15, 14d
    分析仪表板    :p2d, 2024-03-01, 21d

    section 第 3 阶段：AI 自动化
    AI Agent 框架     :p3a, 2024-04-01, 21d
    推荐        :p3b, 2024-04-15, 14d
    预测分析   :p3c, 2024-05-01, 21d

    section 第 4 阶段：多渠道
    渠道集成    :p4a, 2024-06-01, 21d
    活动管理    :p4b, 2024-06-15, 14d
    A/B 测试           :p4c, 2024-07-01, 14d

    section 第 5 阶段：个性化
    面向用户的 UI        :p5a, 2024-08-01, 28d
    推荐引擎 :p5b, 2024-08-15, 21d
    动态内容       :p5c, 2024-09-01, 14d
```

---

## 部署架构（未来）

### 生产部署（第 2 阶段+）

```mermaid
graph TB
    subgraph "CDN"
        Static[静态资源<br/>JS, CSS, 图片]
    end

    subgraph "负载均衡器"
        LB[NGINX / ALB]
    end

    subgraph "前端服务器"
        FE1[前端服务器 1]
        FE2[前端服务器 2]
        FE3[前端服务器 N]
    end

    subgraph "后端集群"
        API1[API 服务器 1]
        API2[API 服务器 2]
        API3[API 服务器 N]

        Worker1[Worker 1]
        Worker2[Worker 2]
        Worker3[Worker N]
    end

    subgraph "数据层"
        PG[(PostgreSQL<br/>主)]
        PGR[(PostgreSQL<br/>副本)]
        Redis[(Redis<br/>集群)]
        Kafka[Kafka<br/>集群]
    end

    subgraph "监控"
        Prom[Prometheus]
        Graf[Grafana]
        Log[日志堆栈]
    end

    Users[用户] --> CDN
    Users --> LB

    LB --> FE1
    LB --> FE2
    LB --> FE3

    FE1 --> API1
    FE2 --> API2
    FE3 --> API3

    API1 --> PG
    API2 --> PG
    API3 --> PGR

    API1 --> Redis
    API2 --> Redis
    API3 --> Redis

    API1 --> Kafka
    API2 --> Kafka
    API3 --> Kafka

    Kafka --> Worker1
    Kafka --> Worker2
    Kafka --> Worker3

    Worker1 --> PG
    Worker2 --> PG
    Worker3 --> PG

    API1 -.-> Prom
    API2 -.-> Prom
    API3 -.-> Prom
    Prom --> Graf

    style Users fill:#e1f5ff
    style LB fill:#fff4e6
    style PG fill:#e8f5e9
```

---

## 安全架构（第 2 阶段+）

```mermaid
graph TD
    subgraph "客户端"
        Browser[Web 浏览器]
    end

    subgraph "安全层"
        WAF[Web 应用<br/>防火墙]
        Auth[认证服务<br/>JWT Tokens]
        RBAC[基于角色的<br/>访问控制]
        Encrypt[静态加密]
    end

    subgraph "应用"
        API[API 网关]
        Services[微服务]
    end

    subgraph "数据"
        DB[(加密<br/>数据库)]
    end

    Browser --> WAF
    WAF --> Auth
    Auth --> API
    API --> RBAC
    RBAC --> Services
    Services --> Encrypt
    Encrypt --> DB

    style Auth fill:#ffebee
    style RBAC fill:#ffebee
    style Encrypt fill:#ffebee
```

**安全措施**:
- ✅ 基于 JWT 的身份验证
- ✅ 基于角色的访问控制（管理员、操作员、分析师）
- ✅ 静态数据加密（AES-256）
- ✅ 传输中数据使用 TLS 1.3
- ✅ API 速率限制
- ✅ PII 数据脱敏
- ✅ 审计日志
- ✅ GDPR 合规（同意管理、删除权）

---

## 性能考虑

### 可扩展性目标（第 2 阶段+）

| 指标 | 目标 | 策略 |
|--------|--------|----------|
| **并发用户** | 10,000+ | 水平扩展、负载均衡 |
| **工作流执行/秒** | 1,000+ | 异步处理、消息队列 |
| **API 响应时间** | < 200ms (p95) | 缓存、CDN、数据库优化 |
| **事件摄取** | 100,000/秒 | Kafka 流、批处理 |
| **仪表板加载时间** | < 2秒 | 预聚合、延迟加载 |
| **工作流文件大小** | < 5MB | 压缩、增量加载 |

### 优化策略

```mermaid
graph LR
    subgraph "前端优化"
        CodeSplit[代码分割]
        LazyLoad[延迟加载]
        Memoization[记忆化]
    end

    subgraph "后端优化"
        Cache[Redis 缓存]
        Queue[消息队列]
        Index[数据库索引]
    end

    subgraph "数据优化"
        Aggregate[预聚合]
        Partition[数据分区]
        Archive[数据归档]
    end

    style CodeSplit fill:#e8f5e9
    style Cache fill:#e8f5e9
    style Aggregate fill:#e8f5e9
```

---

## 监控和可观测性（第 2 阶段+）

```mermaid
graph TB
    subgraph "应用"
        FE[前端]
        BE[后端服务]
    end

    subgraph "监控堆栈"
        Metrics[Prometheus<br/>指标]
        Traces[Jaeger<br/>分布式追踪]
        Logs[ELK 堆栈<br/>集中式日志]
    end

    subgraph "告警"
        Alert[AlertManager]
        PD[PagerDuty]
        Slack[Slack]
    end

    subgraph "仪表板"
        Grafana[Grafana<br/>仪表板]
        Kibana[Kibana<br/>日志分析]
    end

    FE --> Metrics
    BE --> Metrics
    FE --> Logs
    BE --> Logs
    BE --> Traces

    Metrics --> Grafana
    Metrics --> Alert
    Logs --> Kibana
    Traces --> Grafana

    Alert --> PD
    Alert --> Slack

    style Metrics fill:#e1f5ff
    style Traces fill:#e8f5e9
    style Logs fill:#fff4e6
```

**关键指标跟踪**:
- 应用：请求率、错误率、延迟（p50/p95/p99）
- 业务：工作流执行、用户转化、生命周期进展
- 基础设施：CPU、内存、磁盘 I/O、网络
- 用户体验：页面加载时间、交互时间、Core Web Vitals

---

此架构文档提供了从当前状态到所有未来阶段的系统演进的全面视图。所有图表均使用 Mermaid 格式，可以在任何支持 Mermaid 的 markdown 查看器中渲染（GitHub、GitLab、VS Code 等）。
