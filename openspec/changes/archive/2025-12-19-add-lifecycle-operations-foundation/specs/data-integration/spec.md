# 数据集成规范

## 新增需求

### 需求：用户档案数据模型

系统应定义一个全面的用户档案数据结构。

#### 场景：核心档案属性

- **当**系统存储用户档案数据时
- **则**核心属性包括：user_id（唯一）、email、name、signup_date、account_status、lifecycle_stage
- **并且**所有核心属性都是必填字段
- **并且**user_id 作为跨系统的主要标识符

#### 场景：人口统计属性

- **当**人口统计数据可用时
- **则**属性包括：age、date_of_birth、gender、country、city、timezone、language、device_type
- **并且**人口统计字段是可选的
- **并且**隐私偏好设置控制数据收集

#### 场景：行为属性

- **当**行为数据被跟踪时
- **则**属性包括：session_count、last_session_date、total_session_duration、feature_usage_map、engagement_score
- **并且**engagement_score 基于活动的新近度、频率和深度计算
- **并且**行为数据近实时更新

#### 场景：交易属性

- **当**交易数据可用时
- **则**属性包括：total_purchases、total_revenue、average_order_value、last_purchase_date、subscription_tier
- **并且**计算字段包括：customer_lifetime_value、purchase_frequency
- **并且**交易历史单独维护并带有引用

### 需求：事件数据结构

系统应定义标准化的事件数据结构以跟踪用户操作。

#### 场景：事件模式定义

- **当**捕获事件时
- **则**必填字段包括：event_id、user_id、event_type、timestamp、session_id
- **并且**可选字段包括：event_properties（JSON）、device_info、location、referrer
- **并且**event_type 遵循命名约定（category.action，例如 "user.signup"、"product.purchase"）

#### 场景：标准事件类型

- **当**系统定义事件分类时
- **则**用户事件包括：signup、login、logout、profile_update、account_deletion
- **并且**参与事件包括：page_view、feature_click、content_view、search、share
- **并且**交易事件包括：cart_add、cart_remove、checkout_start、purchase_complete、refund
- **并且**可以按照相同模式定义自定义事件

#### 场景：事件负载验证

- **当**摄取事件时
- **则**根据定义的规则验证模式
- **并且**强制执行必填字段
- **并且**验证数据类型（string、number、boolean、timestamp）
- **并且**拒绝无效事件并返回错误详情

### 需求：工作流执行上下文

系统应维护运行中工作流的执行上下文。

#### 场景：执行状态跟踪

- **当**工作流实例执行时
- **则**执行上下文包括：workflow_id、instance_id、user_id、current_step、status（running/paused/completed/failed）
- **并且**记录 start_time 和 end_time
- **并且**存储执行变量和中间结果

#### 场景：工作流实例隔离

- **当**同一用户有多个工作流实例运行时
- **则**每个实例都有隔离的执行上下文
- **并且**instance_id 唯一标识每次执行
- **并且**实例可以并发运行而不相互干扰

#### 场景：错误和重试跟踪

- **当**工作流执行遇到错误时
- **则**捕获错误详情：error_type、error_message、failed_step、stack_trace
- **并且**跟踪重试尝试及其时间戳
- **并且**每个工作流的最大重试次数可配置
- **并且**死信队列处理永久失败的实例

### 需求：数据集成契约

系统应定义与外部系统数据集成的 API 契约。

#### 场景：用户档案同步 API

- **当**外部系统需要同步用户档案时
- **则**REST API 端点可用：GET /users/:id、POST /users、PATCH /users/:id、DELETE /users/:id
- **并且**支持批量操作：POST /users/batch
- **并且**API 使用标准 HTTP 状态码和错误响应
- **并且**强制执行速率限制：每个 API key 每分钟 100 次请求

#### 场景：事件摄取 API

- **当**外部系统发送事件时
- **则**REST API 端点 POST /events 接受事件
- **并且**支持批量摄取：POST /events/batch
- **并且**支持事件订阅的 webhook 交付
- **并且**异步处理事件并返回确认

#### 场景：工作流执行 API

- **当**外部系统触发工作流时
- **则**REST API 端点包括：POST /workflows/:id/execute、GET /workflows/:id/instances/:instance_id、DELETE /workflows/:id/instances/:instance_id
- **并且**可以在请求体中传递执行参数
- **并且**立即返回执行状态或通过回调返回

#### 场景：分析查询 API

- **当**外部系统查询分析数据时
- **则**REST API 端点 GET /analytics 支持查询参数：metric、dimensions、filters、date_range、aggregation
- **并且**响应包括：数据点、元数据、分页信息
- **并且**查询结果被缓存以提高性能

### 需求：数据隐私和安全

系统应强制执行数据隐私和安全要求。

#### 场景：个人数据处理

- **当**存储或处理个人数据时
- **则**数据使用 AES-256 加密存储
- **并且**传输中的数据使用 TLS 1.3
- **并且**个人身份信息（PII）被标记并受保护

#### 场景：用户同意管理

- **当**收集用户数据时
- **则**需要明确同意才能收集数据
- **并且**每个用户的同意偏好设置被存储
- **并且**用户可以随时撤回同意
- **并且**撤回同意后立即停止数据收集

#### 场景：数据保留策略

- **当**定义数据保留时
- **则**保留期限按数据类型可配置
- **并且**默认保留：用户档案（账户生命周期）、事件（365 天）、执行日志（90 天）
- **并且**保留期后自动删除数据
- **并且**审计日志跟踪所有删除操作

#### 场景：数据访问控制

- **当**访问用户数据时
- **则**强制执行基于角色的访问控制（RBAC）
- **并且**访问角色包括：admin（完全访问）、operator（读取/执行）、analyst（只读）
- **并且**所有数据访问都被记录以供审计
- **并且**敏感字段对非管理员用户进行脱敏
