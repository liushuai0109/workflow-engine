# marketing-agent-ui Specification

## Purpose

定义营销智能体聊天页面的用户界面需求，包括三栏布局、会话管理、聊天交互和营销方案预览功能。

## ADDED Requirements

### Requirement: 三栏布局页面结构

系统 SHALL 提供一个专用的营销智能体全屏页面，采用三栏布局设计。

#### Scenario: 页面基本布局

- **WHEN** 用户访问 `/marketing-agent` 路由
- **THEN** 页面应当显示三栏布局：左侧会话列表、中间聊天区域、右侧方案预览
- **AND** 左侧面板宽度应当为 240px（可配置）
- **AND** 中间聊天区域应当自适应剩余宽度
- **AND** 右侧面板宽度应当为 360px（可配置）
- **AND** 页面应当占满整个视口高度

#### Scenario: 面板折叠/展开

- **WHEN** 用户点击左侧面板的折叠按钮
- **THEN** 左侧面板应当收起（仅显示图标）
- **AND** 中间聊天区域应当扩展占用释放的空间
- **WHEN** 用户点击右侧面板的折叠按钮
- **THEN** 右侧面板应当收起
- **AND** 中间聊天区域应当扩展占用释放的空间

#### Scenario: 响应式布局

- **WHEN** 屏幕宽度小于 1200px
- **THEN** 右侧面板应当默认收起，可通过按钮展开
- **WHEN** 屏幕宽度小于 992px
- **THEN** 左侧面板也应当默认收起
- **AND** 可通过汉堡菜单或滑动抽屉访问

---

### Requirement: 会话列表管理

系统 SHALL 在左侧面板提供营销会话的列表管理功能。

#### Scenario: 会话列表展示

- **WHEN** 页面加载完成
- **THEN** 左侧面板应当显示用户的所有营销会话
- **AND** 会话应当按最后消息时间倒序排列
- **AND** 每个会话项应当显示：标题、最后更新时间
- **AND** 当前选中的会话应当有高亮样式

#### Scenario: 新建会话

- **WHEN** 用户点击"新建会话"按钮
- **THEN** 系统应当创建一个新的空白会话
- **AND** 自动选中并切换到新会话
- **AND** 中间聊天区域应当显示欢迎消息
- **AND** 右侧方案预览应当显示空状态

#### Scenario: 切换会话

- **WHEN** 用户点击会话列表中的某个会话
- **THEN** 系统应当加载该会话的历史消息
- **AND** 中间区域应当显示该会话的消息
- **AND** 右侧面板应当显示该会话关联的营销方案（如有）
- **AND** 当前会话 ID 应当持久化到 LocalStorage

#### Scenario: 删除会话

- **WHEN** 用户点击会话的删除按钮
- **THEN** 系统应当显示确认弹窗
- **WHEN** 用户确认删除
- **THEN** 会话及其所有消息应当从数据库删除
- **AND** 会话从列表中移除
- **AND** 如果删除的是当前会话，应当清空聊天区域

---

### Requirement: 聊天交互功能

系统 SHALL 在中间区域提供与营销智能体的聊天交互功能。

#### Scenario: 消息展示

- **WHEN** 会话有历史消息
- **THEN** 消息应当按时间顺序从上到下显示
- **AND** 用户消息应当显示在右侧，使用蓝色背景
- **AND** AI 消息应当显示在左侧，使用白色背景
- **AND** 每条消息应当显示发送时间
- **AND** AI 消息应当支持 Markdown 渲染

#### Scenario: 发送消息

- **WHEN** 用户在输入框输入内容并按 Enter 键
- **THEN** 消息应当发送给 Claude API
- **AND** 用户消息应当立即显示在聊天区域
- **AND** 输入框应当清空
- **AND** 聊天区域应当自动滚动到底部

#### Scenario: Shift+Enter 换行

- **WHEN** 用户按 Shift+Enter
- **THEN** 输入框应当插入换行符
- **AND** 消息不应当发送

#### Scenario: AI 流式响应

- **WHEN** AI 正在生成响应
- **THEN** 应当显示加载指示器
- **AND** 进度日志应当实时显示（如：正在分析需求、正在生成方案）
- **AND** 响应内容应当流式追加显示
- **AND** 用户不应当能够发送新消息直到响应完成

#### Scenario: 营销专用提示

- **WHEN** 发送消息给 Claude API
- **THEN** 系统应当使用营销专用的 System Prompt
- **AND** System Prompt 应当指导 AI 生成结构化的营销方案

---

### Requirement: 营销方案可交互表单（嵌入聊天窗口）

系统 SHALL 将 AI 生成的营销方案以**可交互表单**形式嵌入聊天窗口，作为 AI 回复的一部分，用户可以直接在聊天窗口中编辑修改并提交。

#### Scenario: 表单嵌入聊天回复

- **WHEN** AI 生成了营销方案
- **THEN** 表单应当作为 AI 回复消息的一部分嵌入聊天窗口
- **AND** 表单显示在 AI 回复文本的下方
- **AND** 用户可以直接在聊天窗口中与表单交互

#### Scenario: 表单字段展示

- **WHEN** 表单嵌入聊天窗口
- **THEN** 表单应当包含以下六个字段：
  - 活动主题（文本输入框）
  - 活动起始时间（日期范围选择器）
  - 活动目标（多行文本输入）
  - 触达渠道（多选下拉框）
  - 活动人群（多行文本输入）
  - 活动策略（多行文本输入）
- **AND** 表单应当使用 AI 生成的内容作为初始值

#### Scenario: 表单编辑

- **WHEN** 用户在聊天窗口的表单字段中进行编辑
- **THEN** 系统应当实时更新表单数据
- **AND** 编辑过的字段应当有视觉标识（如边框颜色变化）

#### Scenario: 触达渠道多选

- **WHEN** 用户点击触达渠道字段
- **THEN** 系统应当显示多选下拉框
- **AND** 下拉选项应当包含：微信公众号、微信小程序、抖音、小红书、微博、短信、邮件、APP Push、线下活动等
- **AND** 用户可以选择多个渠道

#### Scenario: 表单提交

- **WHEN** 用户点击表单中的"确定"按钮
- **THEN** 系统应当验证表单必填字段
- **AND** 验证通过后保存方案到后端
- **AND** 显示保存成功提示
- **AND** 表单变为只读状态，显示"已提交"标识
- **AND** 右侧面板同步显示完整方案预览

#### Scenario: 表单验证失败

- **WHEN** 用户提交表单但存在必填字段为空
- **THEN** 系统应当高亮显示未填写的字段
- **AND** 显示相应的错误提示信息
- **AND** 阻止表单提交

#### Scenario: 已提交表单状态

- **WHEN** 表单已经提交
- **THEN** 表单应当变为只读状态
- **AND** 所有字段不可编辑
- **AND** "确定"按钮变为"已提交"标识
- **AND** 用户可通过继续对话来更新方案

#### Scenario: 方案解析失败

- **WHEN** AI 响应无法解析为结构化方案
- **THEN** 聊天窗口应当仅显示 AI 回复的原始 Markdown 内容
- **AND** 不显示可交互表单

---

### Requirement: 右侧方案预览面板

系统 SHALL 在右侧面板提供营销方案的只读预览功能。

#### Scenario: 空状态

- **WHEN** 当前会话没有已提交的营销方案
- **THEN** 右侧面板应当显示空状态提示
- **AND** 提示应当引导用户与 AI 对话生成方案

#### Scenario: 方案预览

- **WHEN** 用户在聊天窗口提交了营销方案表单
- **THEN** 右侧面板应当同步显示完整的方案内容
- **AND** 方案以只读格式展示所有字段

#### Scenario: 方案更新同步

- **WHEN** 用户通过新的对话更新了方案
- **THEN** 右侧面板应当实时更新显示最新的方案内容

---

### Requirement: 页面导航入口

系统 SHALL 在首页提供营销智能体的导航入口。

#### Scenario: 首页入口卡片

- **WHEN** 用户访问首页
- **THEN** 应当显示营销智能体入口卡片
- **AND** 卡片应当包含图标、标题和简短描述
- **WHEN** 用户点击卡片
- **THEN** 应当导航到 `/marketing-agent` 页面

---

### Requirement: 会话与方案关联

系统 SHALL 将营销方案与对应的会话关联存储。

#### Scenario: 方案自动保存

- **WHEN** AI 生成或更新营销方案
- **THEN** 方案应当自动保存到数据库
- **AND** 方案应当与当前会话 ID 关联
- **AND** 保存应当异步执行，不阻塞用户交互

#### Scenario: 方案加载

- **WHEN** 用户切换到已有方案的会话
- **THEN** 系统应当从数据库加载关联的营销方案
- **AND** 右侧面板应当显示该方案内容

#### Scenario: 方案版本（可选）

- **WHEN** 方案在同一会话中多次更新
- **THEN** 系统应当保留历史版本
- **AND** 用户可以查看方案变更历史（后续迭代）

---

### Requirement: 营销方案数据模型

系统 SHALL 定义营销方案的数据模型，包含六个核心字段。

#### Scenario: 核心数据字段

- **WHEN** 创建或更新营销方案
- **THEN** 方案数据应当包含以下核心字段：
  - **活动主题（title）**：活动名称和描述
  - **活动时间（timeline）**：开始日期、结束日期、关键里程碑
  - **活动目标（objectives）**：主要目标、次要目标、KPI 指标
  - **触达渠道（channels）**：渠道名称、类型（线上/线下）、优先级
  - **活动人群（targetAudience）**：人口特征、兴趣偏好、行为特征、人群分层
  - **活动策略（strategies）**：策略名称、关联渠道、方法、战术、预算、预期效果

#### Scenario: 数据类型定义

- **WHEN** 前端定义 TypeScript 类型
- **THEN** MarketingPlan 接口应当包含完整的类型定义
- **AND** 所有字段应当有明确的类型约束
- **AND** 必填字段和可选字段应当有明确区分

---

### Requirement: 营销方案后端 API

系统 SHALL 提供专用的营销方案后端 API（/api/marketing-plans）。

#### Scenario: 创建营销方案

- **WHEN** 前端调用 POST /api/marketing-plans
- **THEN** 系统应当创建新的营销方案记录
- **AND** 返回包含 id、version、createdAt 的完整方案数据
- **AND** 方案状态默认为 draft

#### Scenario: 获取方案列表

- **WHEN** 前端调用 GET /api/marketing-plans
- **THEN** 系统应当返回分页的方案列表
- **AND** 支持按 conversationId、status 进行筛选
- **AND** 返回数据包含 total、page、pageSize

#### Scenario: 获取方案详情

- **WHEN** 前端调用 GET /api/marketing-plans/:id
- **THEN** 系统应当返回指定方案的完整数据
- **AND** 如方案不存在应当返回 404 错误

#### Scenario: 更新营销方案

- **WHEN** 前端调用 PUT /api/marketing-plans/:id
- **THEN** 系统应当更新方案数据
- **AND** version 字段应当自动递增
- **AND** updatedAt 字段应当更新为当前时间

#### Scenario: 删除营销方案

- **WHEN** 前端调用 DELETE /api/marketing-plans/:id
- **THEN** 系统应当删除指定的方案记录
- **AND** 如方案不存在应当返回 404 错误

#### Scenario: 会话关联方案

- **WHEN** 前端调用 GET /api/conversations/:id/plan
- **THEN** 系统应当返回该会话关联的营销方案
- **AND** 如无关联方案应当返回空结果

---

### Requirement: 人群选择功能

系统 SHALL 在用户提交营销方案表单后，提供人群选择界面，支持选择已划分人群或新建人群。

#### Scenario: 人群列表展示

- **WHEN** 用户提交营销方案表单
- **THEN** Agent 应当回复人群选择界面（嵌入聊天窗口）
- **AND** 界面应当展示已划分好的人群列表
- **AND** 每个人群项应当显示名称和筛选条件摘要

#### Scenario: 选择已有人群

- **WHEN** 用户点击某个已有人群
- **THEN** 该人群应当被选中（高亮显示）
- **AND** 用户可以点击"确定选择"按钮确认

#### Scenario: 新建人群

- **WHEN** 用户点击"新建人群"按钮
- **THEN** 系统应当提供人群划分界面
- **AND** 用户可以设置筛选条件创建新人群

#### Scenario: 人群选择确认

- **WHEN** 用户确认选择人群
- **THEN** 人群选择界面变为只读状态
- **AND** 系统触发下一步：展示人群推荐详情

---

### Requirement: 人群推荐详情

系统 SHALL 在用户选择人群后，展示该人群的推荐详情，包括可编辑的标签和核心指标。

#### Scenario: 人群推荐展示

- **WHEN** 用户选择了目标人群
- **THEN** Agent 应当回复人群推荐详情（嵌入聊天窗口）
- **AND** 详情应当包含以下信息：
  - 人群规模
  - 大盘占比
  - 转化概率

#### Scenario: 价值分层标签编辑

- **WHEN** 人群推荐详情展示
- **THEN** 应当显示人群价值分层标签列表
- **AND** 用户可以删除现有标签
- **AND** 用户可以添加新标签

#### Scenario: 画像指标标签编辑

- **WHEN** 人群推荐详情展示
- **THEN** 应当显示画像指标标签列表
- **AND** 用户可以删除现有标签
- **AND** 用户可以添加新标签

#### Scenario: 确认人群推荐

- **WHEN** 用户点击"确认人群"按钮
- **THEN** 系统应当保存编辑后的标签
- **AND** 人群推荐界面变为只读状态
- **AND** 系统触发下一步：生成营销流程图

---

### Requirement: 营销流程图生成

系统 SHALL 根据用户提交的营销信息，使用 AI 画图能力生成营销规划流程图（用户旅程图）。

#### Scenario: 流程图生成触发

- **WHEN** 用户确认人群推荐
- **THEN** 系统应当调用 AI 画图能力
- **AND** 根据营销方案和人群信息生成用户旅程图

#### Scenario: 流程图展示

- **WHEN** 流程图生成完成
- **THEN** Agent 应当回复营销流程图（嵌入聊天窗口）
- **AND** 流程图应当展示完整的用户旅程
- **AND** 包含各阶段的触达渠道和关键动作

#### Scenario: 流程图查看

- **WHEN** 用户点击"查看大图"按钮
- **THEN** 系统应当在模态框中展示完整尺寸的流程图
- **AND** 支持缩放和平移操作

#### Scenario: 流程图生成失败

- **WHEN** AI 画图能力调用失败
- **THEN** 系统应当显示错误提示
- **AND** 提供重新生成的选项

---

### Requirement: 人群数据 API

系统 SHALL 提供人群数据相关的后端 API。

#### Scenario: 获取人群列表

- **WHEN** 前端调用 GET /api/audiences
- **THEN** 系统应当返回已划分的人群列表
- **AND** 每个人群包含名称、描述、筛选条件、规模

#### Scenario: 获取人群推荐详情

- **WHEN** 前端调用 GET /api/audiences/:id/recommendation
- **THEN** 系统应当返回该人群的推荐详情
- **AND** 包含价值分层标签、画像指标标签、转化概率、大盘占比、人群规模

#### Scenario: 创建新人群

- **WHEN** 前端调用 POST /api/audiences
- **THEN** 系统应当创建新的人群记录
- **AND** 返回创建的人群信息

---

### Requirement: 表单生成封装方法

系统 SHALL 提供 `useMarketingPlanForm` composable 封装表单生成和管理逻辑。

#### Scenario: 从 AI 响应生成表单

- **WHEN** AI 返回营销方案响应
- **THEN** `generateFormFromAIResponse` 方法应当解析 AI 响应
- **AND** 提取六个核心字段的值
- **AND** 返回 `MarketingPlanFormData` 对象
- **AND** 无法解析的字段应当使用空值

#### Scenario: 表单数据转换

- **WHEN** 需要在表单数据和方案模型之间转换
- **THEN** `planToFormData` 方法应当将 MarketingPlan 转换为表单数据
- **AND** `formDataToPlan` 方法应当将表单数据转换为 MarketingPlan
- **AND** 日期字段应当正确处理格式转换

#### Scenario: 表单验证

- **WHEN** 调用 `validateForm` 方法
- **THEN** 系统应当验证所有必填字段
- **AND** 返回验证结果（成功/失败）
- **AND** 失败时包含具体的错误信息

#### Scenario: 渠道选项配置

- **WHEN** 使用表单 composable
- **THEN** `channelOptions` 应当提供预定义的渠道选项列表
- **AND** 每个选项包含 label（显示名称）和 value（值）
