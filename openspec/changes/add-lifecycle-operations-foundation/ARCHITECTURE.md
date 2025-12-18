# Architecture Documentation

## System Architecture Evolution

### Current Architecture (Before This Change)

```mermaid
graph TB
    subgraph "Browser"
        UI[Vue 3 SPA]
        Editor[BPMN Editor<br/>bpmn-js]
        Storage[localStorage]

        UI --> Editor
        Editor --> Storage
    end

    subgraph "External"
        LLM[Gemini API<br/>Optional]
    end

    UI -.-> LLM

    style UI fill:#e1f5ff
    style Editor fill:#fff4e6
    style Storage fill:#f3e5f5
```

**Limitations**:
- Client-side only, no backend
- No data persistence beyond localStorage
- No user management or authentication
- Limited to technical workflow modeling
- No business context (lifecycle stages, segments, triggers)

---

### Target Architecture (After Phase 1)

```mermaid
graph TB
    subgraph "Browser - Frontend"
        UI[Vue 3 SPA]

        subgraph "Editor Layer"
            Editor[Enhanced BPMN Editor]
            Props[Properties Panel<br/>+ Lifecycle Context]
            Viz[Lifecycle Visualizer]
        end

        subgraph "Service Layer"
            LS[Lifecycle Service]
            SS[Segment Service]
            TS[Trigger Service]
            MS[Metadata Service]
            EOS[Editor Operation Service]
        end

        subgraph "Data Layer"
            Adapter[BPMN Adapter<br/>+ Lifecycle Support]
            Types[TypeScript Types]
            Config[JSON Configs]
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

    subgraph "External"
        LLM[Gemini API]
        Storage[localStorage<br/>Enhanced]
    end

    Adapter --> Storage
    UI -.-> LLM

    style UI fill:#e1f5ff
    style Editor fill:#fff4e6
    style Props fill:#e8f5e9
    style Adapter fill:#f3e5f5
```

**Improvements**:
- Structured service layer for lifecycle operations
- Rich type system with lifecycle context
- Configuration-driven UI components
- Enhanced data model with business metadata
- Foundation for future backend integration

---

## Component Architecture

### Frontend Component Hierarchy

```mermaid
graph TD
    App[App.vue<br/>Root Component]

    subgraph "Pages"
        BpmnPage[BpmnEditorPage.vue]
    end

    subgraph "Core Editor"
        BpmnEditor[BpmnEditor.vue<br/>Enhanced]
        Palette[Palette<br/>bpmn-js]
        Canvas[Canvas<br/>diagram-js]
        PropsPanel[Properties Panel<br/>Enhanced]
    end

    subgraph "Lifecycle Components (NEW)"
        StageSelector[LifecycleStageSelector.vue]
        SegmentBuilder[UserSegmentBuilder.vue]
        TriggerEditor[TriggerConditionEditor.vue]
        MetadataPanel[WorkflowMetadataPanel.vue]
    end

    subgraph "Existing Components"
        ChatBox[ChatBox.vue]
        Toolbar[Toolbar]
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

### Service Layer Architecture

```mermaid
graph LR
    subgraph "UI Components"
        Comp[Vue Components]
    end

    subgraph "Service Layer"
        direction TB

        LS[LifecycleService]
        SS[UserSegmentService]
        TS[TriggerService]
        MS[WorkflowMetadataService]
        EOS[EditorOperationService]

        subgraph "Existing Services"
            LLM[LLMService]
            LocalStore[LocalStorageService]
            Figma[FigmaService]
        end
    end

    subgraph "Data Access"
        Adapter[BpmnAdapter]
        Config[Config Loader]
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

**Service Responsibilities**:

| Service | Responsibility | Key Methods |
|---------|---------------|-------------|
| **LifecycleService** | Manage lifecycle stages | `getStages()`, `assignStage()`, `getStageConfig()` |
| **UserSegmentService** | Manage user segments | `createSegment()`, `evaluateSegment()`, `getTemplates()` |
| **TriggerService** | Manage workflow triggers | `createTrigger()`, `validateTrigger()`, `getTriggerTypes()` |
| **WorkflowMetadataService** | Manage workflow metadata | `setMetadata()`, `getMetadata()`, `updateMetrics()` |
| **EditorOperationService** | Editor operations | `createNode()`, `createFlow()`, `updateNode()` |

---

## Data Flow Architecture

### Workflow Lifecycle Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Properties Panel
    participant LS as LifecycleService
    participant EOS as EditorOperationService
    participant Adapter as BpmnAdapter
    participant Storage as localStorage

    User->>UI: Select element
    UI->>LS: getCurrentStage(elementId)
    LS->>Adapter: getElementMetadata(elementId)
    Adapter-->>LS: metadata
    LS-->>UI: currentStage
    UI->>User: Display stage selector

    User->>UI: Change stage to "Activation"
    UI->>LS: assignStage(elementId, "Activation")
    LS->>EOS: updateElement(elementId, metadata)
    EOS->>Adapter: updateElementMetadata(elementId, metadata)
    Adapter->>Storage: saveWorkflow(xml)
    Storage-->>Adapter: success
    Adapter-->>EOS: success
    EOS-->>LS: success
    LS-->>UI: success
    UI->>User: Update visual indicator
```

---

### Segment Evaluation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as SegmentBuilder
    participant SS as UserSegmentService
    participant Config as segment-config.json

    User->>UI: Open segment builder
    UI->>SS: getSegmentTemplates()
    SS->>Config: load templates
    Config-->>SS: templates
    SS-->>UI: templates
    UI->>User: Display templates

    User->>UI: Select "Active Users" template
    UI->>SS: loadTemplate("active_users")
    SS->>Config: get template definition
    Config-->>SS: conditions
    SS-->>UI: conditions
    UI->>User: Display pre-filled conditions

    User->>UI: Customize conditions
    User->>UI: Save segment
    UI->>SS: saveSegment(segment)
    SS->>SS: validateSegment(segment)
    SS-->>UI: validation result
    UI->>User: Confirm saved
```

---

## Data Model Architecture

### Core Type System

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

### XML Schema Extension

```mermaid
graph TD
    subgraph "Standard BPMN"
        Defs[definitions]
        Process[process]
        Task[task]
        ExtElem[extensionElements]
    end

    subgraph "XFlow Extensions (Existing)"
        XFlowProps[xflow:properties]
    end

    subgraph "Lifecycle Extensions (NEW)"
        Lifecycle[xflow:lifecycle]
        Segment[xflow:segment]
        Trigger[xflow:trigger]
        Metrics[xflow:metrics]

        LStage[stage attribute]
        LColor[color attribute]

        SType[type attribute]
        SCond[xflow:condition]

        TType[type attribute]
        TEvent[event attribute]
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

**Example XML**:
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

## Integration Architecture (Future Phases)

### Phase 2: Backend Integration

```mermaid
graph TB
    subgraph "Frontend (Browser)"
        UI[Vue 3 SPA]
        Services[Service Layer]
    end

    subgraph "Backend (Phase 2)"
        API[REST API Gateway]

        subgraph "Core Services"
            WES[Workflow Execution<br/>Service]
            UPS[User Profile<br/>Service]
            ES[Event<br/>Service]
            AS[Analytics<br/>Service]
        end

        subgraph "Data Layer"
            DB[(PostgreSQL<br/>User Profiles)]
            Cache[(Redis<br/>Cache)]
            Stream[Kafka<br/>Event Stream]
            DW[(Data Warehouse<br/>Analytics)]
        end
    end

    subgraph "External Systems"
        CRM[CRM System]
        Email[Email Service]
        Analytics[Analytics Platform]
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

### Multi-Phase Roadmap

```mermaid
gantt
    title Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Foundation
    Lifecycle Context       :done, p1a, 2024-01-01, 14d
    Type Definitions        :done, p1b, 2024-01-01, 7d
    UI Components          :done, p1c, 2024-01-08, 14d
    Services Layer         :active, p1d, 2024-01-15, 10d
    Testing & Migration    :p1e, 2024-01-25, 7d

    section Phase 2: Data & Analytics
    Backend API            :p2a, 2024-02-01, 21d
    Database Setup         :p2b, 2024-02-01, 14d
    Event Pipeline         :p2c, 2024-02-15, 14d
    Analytics Dashboard    :p2d, 2024-03-01, 21d

    section Phase 3: AI Automation
    AI Agent Framework     :p3a, 2024-04-01, 21d
    Recommendations        :p3b, 2024-04-15, 14d
    Predictive Analytics   :p3c, 2024-05-01, 21d

    section Phase 4: Multi-Channel
    Channel Integration    :p4a, 2024-06-01, 21d
    Campaign Management    :p4b, 2024-06-15, 14d
    A/B Testing           :p4c, 2024-07-01, 14d

    section Phase 5: Personalization
    User-Facing UI        :p5a, 2024-08-01, 28d
    Recommendation Engine :p5b, 2024-08-15, 21d
    Dynamic Content       :p5c, 2024-09-01, 14d
```

---

## Deployment Architecture (Future)

### Production Deployment (Phase 2+)

```mermaid
graph TB
    subgraph "CDN"
        Static[Static Assets<br/>JS, CSS, Images]
    end

    subgraph "Load Balancer"
        LB[NGINX / ALB]
    end

    subgraph "Frontend Servers"
        FE1[Frontend Server 1]
        FE2[Frontend Server 2]
        FE3[Frontend Server N]
    end

    subgraph "Backend Cluster"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server N]

        Worker1[Worker 1]
        Worker2[Worker 2]
        Worker3[Worker N]
    end

    subgraph "Data Tier"
        PG[(PostgreSQL<br/>Primary)]
        PGR[(PostgreSQL<br/>Replica)]
        Redis[(Redis<br/>Cluster)]
        Kafka[Kafka<br/>Cluster]
    end

    subgraph "Monitoring"
        Prom[Prometheus]
        Graf[Grafana]
        Log[Logging Stack]
    end

    Users[Users] --> CDN
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

## Security Architecture (Phase 2+)

```mermaid
graph TD
    subgraph "Client"
        Browser[Web Browser]
    end

    subgraph "Security Layer"
        WAF[Web Application<br/>Firewall]
        Auth[Auth Service<br/>JWT Tokens]
        RBAC[Role-Based<br/>Access Control]
        Encrypt[Encryption<br/>at Rest]
    end

    subgraph "Application"
        API[API Gateway]
        Services[Microservices]
    end

    subgraph "Data"
        DB[(Encrypted<br/>Database)]
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

**Security Measures**:
- ✅ JWT-based authentication
- ✅ Role-based access control (Admin, Operator, Analyst)
- ✅ Data encryption at rest (AES-256)
- ✅ TLS 1.3 for data in transit
- ✅ API rate limiting
- ✅ PII data masking
- ✅ Audit logging
- ✅ GDPR compliance (consent management, right to deletion)

---

## Performance Considerations

### Scalability Targets (Phase 2+)

| Metric | Target | Strategy |
|--------|--------|----------|
| **Concurrent Users** | 10,000+ | Horizontal scaling, load balancing |
| **Workflow Executions/sec** | 1,000+ | Async processing, message queues |
| **API Response Time** | < 200ms (p95) | Caching, CDN, database optimization |
| **Event Ingestion** | 100,000/sec | Kafka streaming, batch processing |
| **Dashboard Load Time** | < 2sec | Pre-aggregation, lazy loading |
| **Workflow File Size** | < 5MB | Compression, incremental loading |

### Optimization Strategies

```mermaid
graph LR
    subgraph "Frontend Optimization"
        CodeSplit[Code Splitting]
        LazyLoad[Lazy Loading]
        Memoization[Memoization]
    end

    subgraph "Backend Optimization"
        Cache[Redis Caching]
        Queue[Message Queues]
        Index[Database Indexes]
    end

    subgraph "Data Optimization"
        Aggregate[Pre-Aggregation]
        Partition[Data Partitioning]
        Archive[Data Archival]
    end

    style CodeSplit fill:#e8f5e9
    style Cache fill:#e8f5e9
    style Aggregate fill:#e8f5e9
```

---

## Monitoring & Observability (Phase 2+)

```mermaid
graph TB
    subgraph "Application"
        FE[Frontend]
        BE[Backend Services]
    end

    subgraph "Monitoring Stack"
        Metrics[Prometheus<br/>Metrics]
        Traces[Jaeger<br/>Distributed Tracing]
        Logs[ELK Stack<br/>Centralized Logging]
    end

    subgraph "Alerting"
        Alert[AlertManager]
        PD[PagerDuty]
        Slack[Slack]
    end

    subgraph "Dashboards"
        Grafana[Grafana<br/>Dashboards]
        Kibana[Kibana<br/>Log Analysis]
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

**Key Metrics to Track**:
- Application: Request rate, error rate, latency (p50/p95/p99)
- Business: Workflow executions, user conversions, lifecycle progression
- Infrastructure: CPU, memory, disk I/O, network
- User Experience: Page load time, time to interactive, Core Web Vitals

---

This architecture documentation provides a comprehensive view of the system evolution from current state through all future phases. All diagrams are in Mermaid format and can be rendered in any markdown viewer that supports Mermaid (GitHub, GitLab, VS Code, etc.).
