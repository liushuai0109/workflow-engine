# workflow-editor 规范

## Purpose
工作流编辑器规范定义了 BPMN 工作流编辑器的功能需求，包括生命周期阶段分配、用户分群定位、触发条件配置、工作流元数据管理和 AI 驱动的智能工作流生成能力。

## Requirements

### Requirement: 生命周期阶段分配

工作流编辑器应允许操作员将 AARRR 生命周期阶段分配给工作流元素。

#### Scenario: 为任务分配生命周期阶段

- **WHEN** 操作员选择工作流任务元素
- **THEN** 属性面板显示生命周期阶段下拉菜单
- **AND** 可用阶段包括：Acquisition（获取）、Activation（激活）、Retention（留存）、Revenue（收益）、Referral（推荐）
- **AND** 所选阶段持久化在工作流 XML 中

#### Scenario: 生命周期阶段的视觉指示

- **WHEN** 工作流元素已分配生命周期阶段
- **THEN** 元素显示指示阶段的彩色徽章
- **AND** 颜色方案遵循：Acquisition（蓝色）、Activation（绿色）、Retention（黄色）、Revenue（紫色）、Referral（橙色）

#### Scenario: 按生命周期阶段筛选元素

- **WHEN** 操作员应用生命周期阶段筛选器
- **THEN** 仅高亮显示与所选阶段匹配的元素
- **AND** 其他元素变暗

### Requirement: 用户分群定位

工作流编辑器应支持为工作流定位配置用户分群。

#### Scenario: 为工作流定义目标分群

- **WHEN** 操作员打开工作流属性
- **THEN** 提供用户分群构建器
- **AND** 可以按人口统计信息（年龄、位置、性别）定义分群
- **AND** 可以按行为（参与度、购买历史、会话计数）定义分群
- **AND** 可以使用 AND/OR 逻辑组合多个分群条件

#### Scenario: 预定义分群模板

- **WHEN** 操作员打开分群构建器
- **THEN** 提供预定义的分群模板
- **AND** 模板包括："新用户"、"活跃用户"、"流失风险用户"、"VIP 客户"、"休眠用户"
- **AND** 操作员可以自定义模板或创建自定义分群

#### Scenario: 将分群分配给工作流元素

- **WHEN** 操作员为任务元素分配分群
- **THEN** 该任务将仅对符合分群条件的用户执行
- **AND** 分群条件显示在属性面板中

### Requirement: 触发条件配置

工作流编辑器应支持定义工作流执行的触发条件。

#### Scenario: 基于时间的触发器

- **WHEN** 操作员配置开始事件
- **THEN** 提供基于时间的触发器选项
- **AND** 支持的触发器包括：scheduled（定时，cron）、delay（延迟，持续时间）、time window（时间窗口，开始/结束）
- **AND** 触发器时间表经过正确性验证

#### Scenario: 基于事件的触发器

- **WHEN** 操作员配置开始事件
- **THEN** 提供基于事件的触发器选项
- **AND** 支持的事件包括：user_signup（用户注册）、purchase_completed（完成购买）、page_viewed（查看页面）、session_started（开始会话）、milestone_reached（达到里程碑）
- **AND** 可以应用事件过滤器（例如，purchase_completed WHERE amount > 100）

#### Scenario: 数据阈值触发器

- **WHEN** 操作员配置网关决策
- **THEN** 提供数据阈值条件
- **AND** 条件可以比较用户属性（例如，engagement_score > 70）
- **AND** 可以使用逻辑运算符组合多个条件

### Requirement: 工作流元数据管理

工作流编辑器应支持运营上下文的综合元数据。

#### Scenario: 定义工作流目的和目标

- **WHEN** 操作员创建或编辑工作流
- **THEN** 提供元数据面板
- **AND** 元数据字段包括：名称、描述、目的、所有者、创建日期、修改日期
- **AND** 目的可以从以下选择：Onboarding（入职）、Engagement（参与）、Conversion（转化）、Retention（留存）、Win-back（召回）

#### Scenario: 设置成功指标

- **WHEN** 操作员定义工作流元数据
- **THEN** 可以配置成功指标
- **AND** 可用指标包括：conversion_rate（转化率）、engagement_rate（参与率）、completion_rate（完成率）、revenue_generated（产生的收益）、user_activation_count（用户激活数）
- **AND** 可以为每个指标设置目标值

#### Scenario: 添加工作流标签

- **WHEN** 操作员编辑工作流元数据
- **THEN** 可以添加标签进行分类
- **AND** 标签支持从现有标签自动完成
- **AND** 可以按标签搜索和筛选工作流

### Requirement: 增强的属性面板

工作流编辑器应为生命周期运营提供增强的属性面板。

#### Scenario: 上下文属性显示

- **WHEN** 操作员选择不同的元素类型
- **THEN** 属性面板显示上下文相关的字段
- **AND** 服务任务显示：操作类型、API 端点、参数、重试策略
- **AND** 用户任务显示：任务类型、通知设置、超时
- **AND** 网关显示：决策逻辑、分割比率、回退行为

#### Scenario: 属性验证

- **WHEN** 操作员输入属性值
- **THEN** 执行实时验证
- **AND** 无效值显示错误消息
- **AND** 必填字段用指示器标记
- **AND** 存在验证错误时无法保存工作流

### Requirement: 工作流版本控制支持

工作流编辑器应支持工作流变更的版本跟踪。

#### Scenario: 创建工作流版本

- **WHEN** 操作员保存对活动工作流的更改
- **THEN** 创建新版本
- **AND** 版本号遵循语义版本控制（major.minor.patch）
- **AND** 版本元数据包括：时间戳、作者、变更描述

#### Scenario: 查看版本历史

- **WHEN** 操作员打开版本历史
- **THEN** 列出所有先前版本及其元数据
- **AND** 操作员可以预览先前版本
- **AND** 操作员可以比较版本（差异视图）

#### Scenario: 回滚到先前版本

- **WHEN** 操作员选择先前版本
- **THEN** 提供回滚选项
- **AND** 回滚前需要确认
- **AND** 回滚创建新版本（非破坏性）
