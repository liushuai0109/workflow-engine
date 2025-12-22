# Code Quality Spec - Chat Interface E2E Tests Update

## MODIFIED Requirements

### Requirement: 聊天功能E2E测试

系统SHALL提供完整的聊天功能E2E测试，测试聊天界面在右侧Tab Panel中的集成、交互、会话管理、消息发送接收和持久化功能。

#### Scenario: 聊天Tab可见性和切换
**Given** 用户访问 BPMN 编辑器页面
**When** 用户点击右侧面板的"AI 助手" Tab
**Then** 系统必须切换到 AI 助手 Tab
**And** ChatBox 组件必须在 Tab Panel 中可见
**And** 聊天头部、消息容器和输入区域必须正确显示

**Technical Notes:**
- 使用 Tab 选择器：`.ant-tabs-tab` 和 `role="tab"`
- 验证 activeKey 为 'chat'
- ChatBox 位于 `.ant-tabs-tabpane[role="tabpanel"]` 内
- 不再测试独立悬浮窗口的显示/隐藏、最小化、拖拽功能

#### Scenario: Tab间切换保持聊天状态
**Given** 用户在 AI 助手 Tab 中有聊天历史
**When** 用户切换到其他 Tab（如属性、Mock、Debug）
**And** 再次切换回 AI 助手 Tab
**Then** 聊天消息历史必须保持不变
**And** 输入框状态必须保持
**And** 自动滚动到最新消息

**Technical Notes:**
- 验证 Tab 切换不会清空消息
- 验证组件状态在 Tab 切换时保持
- 使用 `:forceRender="true"` 确保组件不被销毁

#### Scenario: 聊天界面交互测试
**Given** AI 助手 Tab 已打开
**When** 用户在输入框输入消息
**And** 用户点击发送按钮或按 Enter 键
**Then** 消息必须正确发送到 ChatBox
**And** 消息必须显示在消息列表中
**And** 输入框必须自动清空
**And** 自动滚动到最新消息

**Technical Notes:**
- 使用选择器定位 Tab 内的输入框和发送按钮
- 不再测试独立窗口的关闭按钮
- ChatBox 选择器：`.ant-tabs-tabpane .chat-box-container`

#### Scenario: 会话管理测试
**Given** AI 助手 Tab 已打开
**When** 用户点击会话列表切换按钮
**Then** 会话列表面板必须显示
**When** 用户创建、切换或删除会话
**Then** 会话操作必须正确执行
**And** 消息必须正确加载到对应会话
**And** 会话状态必须正确持久化

**Technical Notes:**
- 会话列表在 ChatBox 内，位于 Tab Panel 中
- API 测试逻辑保持不变
- 验证会话切换不影响 Tab 状态

#### Scenario: 消息持久化测试
**Given** 用户在 AI 助手 Tab 发送了消息
**When** 用户刷新页面
**And** 用户切换到 AI 助手 Tab
**Then** 之前的消息必须从 LocalStorage 或后端加载
**And** 消息历史必须完整显示
**And** 消息顺序和内容必须正确

**Technical Notes:**
- 刷新后需要重新切换到 AI 助手 Tab
- 验证 `localStorage.getItem('claude_conversation_id')` 存在
- 验证消息内容与刷新前一致

#### Scenario: 流式响应显示测试
**Given** AI 助手 Tab 已打开
**When** AI 返回流式响应
**Then** 消息必须增量显示在 ChatBox 中
**And** 流式消息必须包含过程日志
**And** 流式消息必须显示 loading 状态
**And** 完成后必须显示 Markdown 格式的摘要
**And** loading 状态必须正确消失

**Technical Notes:**
- 验证流式消息在 Tab Panel 内正确渲染
- 验证只有一个 AI 消息气泡
- 验证过程日志和 Markdown 内容在同一气泡内

## Cross-references

- Relates to: **workflow-editor** spec (RightPanelContainer Tab 结构)
- Depends on: **improve-ai-chat-experience** change (ChatBox 集成到 Tab Panel)
- Relates to: **ai-integration** spec (聊天功能和流式响应)
