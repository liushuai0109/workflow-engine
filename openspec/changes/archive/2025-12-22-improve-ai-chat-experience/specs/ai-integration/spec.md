# AI Integration Spec - Chat Experience Improvements

## MODIFIED Requirements

### Requirement: AI Chat Interface

The AI chat interface SHALL provide responsive and intuitive interaction for users to communicate with the AI assistant. The system MUST support reliable message sending via both Enter key and send button, display clear loading feedback during AI processing, and automatically scroll to show the latest messages.

#### Scenario: User sends message via Enter key
**Given** the user has typed a message in the chat input field
**When** the user presses Enter key (without Shift)
**Then** the message should be sent immediately
**And** the input field should be cleared
**And** the chat should scroll to the bottom

**Technical Notes:**
- Use Ant Design Textarea's `@pressEnter` event
- Shift+Enter should create a new line without sending

#### Scenario: User sends message via send button
**Given** the user has typed a message in the chat input field
**When** the user clicks the send button
**Then** the message should be sent
**And** the input field should be cleared
**And** the chat should scroll to the bottom

**Technical Notes:**
- Send button should be disabled when input is empty or AI is processing
- Use computed property `canSend` to determine button state

#### Scenario: AI processes user request
**Given** the user has sent a message
**When** the AI is processing the request
**Then** a loading indicator should appear in the chat box showing "AI 正在思考..."
**And** a loading overlay should appear on the BPMN canvas showing "AI 正在处理流程图..."
**And** the send button should be disabled

**Technical Notes:**
- Use Ant Design `<a-spin>` component for loading indicators
- Maintain two separate loading states: `isAIProcessing` (canvas) and `isLoading` (chat)

#### Scenario: AI completes operation
**Given** the AI has finished processing
**When** the response is ready
**Then** the loading indicators should disappear
**And** a concise confirmation message should appear (e.g., "已完成")
**And** the chat should scroll to show the new message

**Technical Notes:**
- AI should provide brief responses for diagram operations
- Avoid lengthy explanations of what was created

#### Scenario: User switches to chat tab
**Given** the user is on a different tab
**When** the user clicks the "AI 助手" tab
**Then** the tab should activate
**And** the chat should automatically scroll to the bottom
**And** previous conversation history should be visible

**Technical Notes:**
- Implement scroll delay (100ms) to ensure component is fully rendered
- Load conversation history on mount if available

### Requirement: Chat Message Persistence

Chat messages MUST be persistently stored in the database, but only user-visible conversations SHALL be saved. Internal tool execution details SHALL remain in memory context only to keep chat history clean and focused.

#### Scenario: User message is saved
**Given** the user has sent a message
**When** the message is submitted
**Then** the user's message should be saved to the database
**And** the message should appear in the chat UI with user avatar and timestamp

**Technical Notes:**
- Only save actual user messages, not tool execution results
- Message format: `{ role: 'user', content: string, timestamp: Date }`

#### Scenario: AI response is saved
**Given** the AI has generated a final response
**When** the processing is complete
**Then** the AI's response should be saved to the database
**And** the message should appear in the chat UI with assistant avatar and timestamp

**Technical Notes:**
- Only save the final text response shown to user
- Do NOT save intermediate tool use requests or tool execution results

#### Scenario: Tool execution occurs (internal only)
**Given** the AI is using tools to fulfill user request
**When** tool calls are made
**Then** tool requests and results should be kept in memory context only
**And** they should NOT be saved to the database
**And** they should NOT appear in the user's chat history

**Technical Notes:**
- Memory context maintains full conversation including tool use for LLM
- Database only stores user-visible conversation
- This prevents clutter and confusion in chat history

### Requirement: Chat UI Styling

All chat interface components MUST follow Ant Design design system specifications to ensure visual consistency and professional appearance.

#### Scenario: Input controls use Ant Design style
**Given** the chat interface is displayed
**Then** the input textarea should have:
  - 6px border radius
  - #d9d9d9 border color
  - #40a9ff border on hover
  - #40a9ff border with shadow on focus
**And** the send button should have:
  - 32px × 32px circular shape
  - #1890ff background color
  - #40a9ff background on hover
  - Disabled state with #f5f5f5 background

**Technical Notes:**
- All styles should follow Ant Design design tokens
- Use `:deep()` selector for nested component styling

#### Scenario: Loading indicator displays
**Given** the AI is processing
**Then** the loading message should show:
  - Ant Design Spin component (small size)
  - "AI 正在思考..." text
  - White background with border
  - Border radius matching assistant messages

**Technical Notes:**
- Replace custom typing indicator with `<a-spin>`
- Maintain consistent styling with other assistant messages

## ADDED Requirements

### Requirement: Automatic Scrolling

The chat interface MUST automatically scroll to display the most recent messages whenever new content appears or when the chat tab is activated. The system SHALL ensure users always see the latest conversation without manual scrolling.

#### Scenario: New message appears
**Given** a new message is added to the chat
**When** the message is rendered in the UI
**Then** the chat container should automatically scroll to the bottom
**And** the newest message should be fully visible

**Technical Notes:**
- Use `nextTick` to ensure DOM is updated before scrolling
- Scroll implementation: `messagesContainer.scrollTop = messagesContainer.scrollHeight`

#### Scenario: Chat tab is activated
**Given** the user is viewing a different tab
**When** the user switches to the AI chat tab
**Then** the chat should scroll to the bottom after 100ms delay
**And** the most recent message should be visible

**Technical Notes:**
- Delay ensures component is fully rendered and mounted
- Call `scrollToBottom()` method on RightPanelContainer

### Requirement: Component Communication

Parent components MUST be able to control child component state through well-defined interfaces using Vue's ref mechanism. The system SHALL NOT use direct DOM manipulation for component communication.

#### Scenario: Parent controls child component state
**Given** the chat is embedded in a tab container
**When** the parent needs to update chat state
**Then** the parent should use exposed methods via ref:
  - `setChatLoading(boolean)` - control loading state
  - `addUserMessage(string)` - add user message to UI
  - `addChatMessage(string)` - add AI message to UI
  - `scrollToBottom()` - scroll chat to bottom

**Technical Notes:**
- Use Vue `ref` and `defineExpose` for component communication
- No DOM queries (`document.querySelector`) should be used
- Clear method contracts for parent-child interaction

### Requirement: Concise AI Responses

The AI assistant MUST provide brief, concise confirmation messages after completing diagram operations. The system SHALL avoid verbose explanations of what was created, as users can see the results directly on the canvas.

#### Scenario: AI completes diagram operation
**Given** the AI has finished creating or modifying a diagram
**When** the operation is successful
**Then** the AI should respond with a brief confirmation only:
  - Acceptable: "已完成", "流程图已创建", "已按要求修改"
  - Avoid: Detailed node listings, lengthy explanations, repeated logic descriptions

**Technical Notes:**
- Update system prompt with response format requirements
- User can see the result on canvas, no need for text explanation
- Empty or whitespace-only responses should default to "操作已完成"

## Cross-references

- Relates to: **workflow-editor** spec (BPMN canvas loading states)
- Depends on: **integrate-antd-framework** change (Ant Design component library)
