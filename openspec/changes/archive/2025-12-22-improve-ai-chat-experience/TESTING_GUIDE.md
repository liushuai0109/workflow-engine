# 集成测试指南

本文档提供了 `improve-ai-chat-experience` 变更的集成测试步骤和验收标准。

## 测试环境准备

1. 启动后端服务器
2. 启动前端开发服务器
3. 在浏览器中打开应用
4. 打开浏览器开发者工具（查看 Console、Network、Application）

## 阶段 8.5：Loading 状态集成测试

### T8.5.1 测试正常流程

**步骤**：
1. 在 BPMN 编辑器页面，打开右侧"AI 助手" Tab
2. 输入消息："画一个请假流程"
3. 点击发送或按 Enter 键

**预期结果**：
- ✅ 只看到**一个** AI 消息气泡（不应该有独立的 loading 气泡）
- ✅ 气泡内实时显示操作日志（如"✅ 创建连线..."）
- ✅ 气泡内显示 loading 指示器（"AI 正在处理..."）
- ✅ AI 完成后，在同一气泡内追加 Markdown 摘要
- ✅ Loading 消失，气泡保留操作日志和摘要

**验证方式**：
```javascript
// 在 Console 中检查消息数量
document.querySelectorAll('.message.assistant').length  // 应该只有 1 个
```

### T8.5.2 测试错误情况

**步骤**：
1. 临时关闭后端 Claude API 服务（或修改 API key 为无效值）
2. 发送消息："创建一个流程"
3. 观察错误处理

**预期结果**：
- ✅ AI 调用失败时，loading 正确消失
- ✅ 显示错误消息："❌ 错误: ..."
- ✅ 不应该有永久的 loading 状态

**恢复**：
- 测试后恢复正确的 API 配置

### T8.5.3 验证无多余气泡

**步骤**：
1. 发送 3 条不同的消息
2. 检查 DOM 结构

**预期结果**：
```javascript
// 每条 AI 响应应该只有一个 .message.assistant 元素
document.querySelectorAll('.message.assistant').length === 3
// 不应该有独立的 loading 消息
document.querySelectorAll('.message.assistant .loading-container').length === 0
```

### T8.5.4 性能测试：大量日志

**步骤**：
1. 发送复杂请求："创建一个包含 10 个节点的复杂流程"
2. 观察日志渲染

**预期结果**：
- ✅ 大量日志（>20 行）时，渲染流畅无卡顿
- ✅ 滚动到底部自动生效

**性能指标**：
- 渲染时间 < 100ms（通过 Performance 面板测量）

---

## 阶段 9.5：消息气泡视觉统一集成测试

### T9.5.1 测试流式消息视觉统一

**步骤**：
1. 发送消息触发 AI 工具执行
2. 在 AI 处理过程中（显示 loading 时），检查视觉效果

**预期结果**：
- ✅ 过程日志和 loading 在**同一个视觉气泡**内
- ✅ 气泡有统一的白色背景、灰色边框、圆角
- ✅ 内部区域无独立边框

**CSS 验证**：
```javascript
const bubble = document.querySelector('.message.assistant .message-text')
const computedStyle = window.getComputedStyle(bubble)
console.log('Background:', computedStyle.background)  // 应该是 rgb(255, 255, 255) / #ffffff
console.log('Border:', computedStyle.border)          // 应该是 1px solid rgb(217, 217, 217)
console.log('Border radius:', computedStyle.borderRadius)  // 应该是 8px 8px 8px 2px
```

### T9.5.2 测试完成消息视觉统一

**步骤**：
1. 等待 AI 完成操作
2. 检查完成后的消息气泡

**预期结果**：
- ✅ 过程日志和 Markdown 摘要在同一个气泡内
- ✅ 气泡保持统一的外层样式
- ✅ 内部区域通过背景色区分（过程日志 #f5f5f5，Markdown 透明）

### T9.5.3 验证内部区域背景色区分

**步骤**：
1. 检查完成后的消息
2. 验证各个 section 的背景色

**预期结果**：
```javascript
const progressLogs = document.querySelector('.progress-logs-section')
const markdown = document.querySelector('.markdown-section')

window.getComputedStyle(progressLogs).background  // 包含 rgb(245, 245, 245) / #f5f5f5
window.getComputedStyle(markdown).background      // 应该是 transparent
```

### T9.5.4 验证无独立子气泡

**步骤**：
1. 检查消息内部结构
2. 确认没有独立的边框和圆角

**预期结果**：
```javascript
// progress-logs-section 不应该有独立边框
const section = document.querySelector('.progress-logs-section')
const style = window.getComputedStyle(section)
console.log('Border:', style.border)  // 应该是 0px 或 none（除了 border-top 分隔线）
console.log('Border radius:', style.borderRadius)  // 应该是 0px
```

### T9.5.5 验证符合 Ant Design 规范

**视觉对比**：
- ✅ 与 Ant Design 的 Message 组件样式一致
- ✅ 圆角、边框、间距符合 Ant Design 设计系统

**参考**：
- Ant Design Message: https://ant.design/components/message-cn

---

## 阶段 10.3：数据一致性验证测试

### T10.3.1 测试正常流程数据一致性

**步骤**：
1. 发送消息："创建一个简单流程"
2. 等待 AI 完成
3. 检查数据库和 UI 显示

**预期结果**：
- ✅ UI 显示的内容 = 数据库保存的内容

**验证方式**：

1. **查看 UI 显示**：
   - 记录聊天框中显示的助手消息内容

2. **查看数据库**（通过 Network 面板或直接查询）：
   ```javascript
   // 在 Console 中检查
   // 假设会话 ID 为 conversationId
   fetch(`/api/chat/conversations/${conversationId}`)
     .then(r => r.json())
     .then(data => {
       const lastMessage = data.data.messages[data.data.messages.length - 1]
       console.log('Database content:', lastMessage.content)
       // 应该与 UI 显示完全一致
     })
   ```

3. **对比**：
   - Database content === UI displayed content

### T10.3.2 测试空响应数据一致性

**步骤**：
1. 修改系统提示词，让 AI 返回空响应（或模拟空响应场景）
2. 发送消息
3. 检查数据库

**预期结果**：
- ✅ UI 显示："✅ 操作已完成"
- ✅ 数据库保存："✅ 操作已完成"（而不是空字符串）

**验证方式**：
```javascript
// 检查最后一条助手消息
const lastAssistantMessage = document.querySelector('.message.assistant:last-of-type .message-text')
console.log('UI display:', lastAssistantMessage.textContent.trim())

// 检查数据库
// 应该保存相同的内容，不应该是空字符串或 undefined
```

### T10.3.3 测试错误情况数据一致性

**步骤**：
1. 临时破坏 Claude API 配置（无效 API key）
2. 发送消息
3. 检查错误消息的保存

**预期结果**：
- ✅ UI 显示："❌ 错误: [具体错误信息]"
- ✅ 数据库保存相同的错误消息

**验证方式**：
```javascript
// UI 显示
const errorMessage = document.querySelector('.message.assistant:last-of-type .message-text')
console.log('UI error:', errorMessage.textContent)

// 数据库
// 应该保存相同的错误消息，包含 "❌ 错误:" 前缀
```

### T10.3.4 测试刷新后数据一致性

**步骤**：
1. 完成上述任意测试后（确保有消息记录）
2. 刷新页面（F5）
3. 检查聊天历史

**预期结果**：
- ✅ 刷新后加载的历史消息与刷新前显示的内容**完全一致**
- ✅ 格式、内容、样式都应该相同

**关键验证**：
```javascript
// 刷新前记录
const messagesBeforeRefresh = Array.from(document.querySelectorAll('.message.assistant .message-text'))
  .map(el => el.textContent.trim())

// 刷新页面后
const messagesAfterRefresh = Array.from(document.querySelectorAll('.message.assistant .message-text'))
  .map(el => el.textContent.trim())

// 对比
console.log('Before:', messagesBeforeRefresh)
console.log('After:', messagesAfterRefresh)
// 应该完全相同
```

### T10.3.5 综合验证：运行时 = 刷新后 = 数据库

**步骤**：
1. 发送 5 条不同类型的消息：
   - 正常响应（有内容）
   - 空响应（触发默认提示）
   - 错误响应
   - 复杂响应（长文本 + Markdown）
   - 包含操作日志的响应

2. 对每条消息进行三重验证：
   - **运行时显示**（实时看到的内容）
   - **数据库内容**（通过 API 查询）
   - **刷新后显示**（刷新页面后加载的历史）

**预期结果**：
- ✅ 三者完全一致：`Runtime === Database === After Refresh`

**验证清单**：
```
消息 1 (正常):
  [ ] Runtime = Database
  [ ] Runtime = After Refresh
  [ ] Database = After Refresh

消息 2 (空响应):
  [ ] Runtime = "✅ 操作已完成"
  [ ] Database = "✅ 操作已完成"
  [ ] After Refresh = "✅ 操作已完成"

消息 3 (错误):
  [ ] Runtime = "❌ 错误: ..."
  [ ] Database = "❌ 错误: ..."
  [ ] After Refresh = "❌ 错误: ..."

消息 4 (长文本):
  [ ] 内容完全一致（包括换行、格式）

消息 5 (带日志):
  [ ] 保留操作日志
  [ ] 保留 Markdown 摘要
```

---

## 测试总结

### 通过标准

所有测试应该满足：
- ✅ 无 Console 错误
- ✅ 无网络请求失败（除非故意测试错误场景）
- ✅ UI 响应流畅
- ✅ 数据一致性 100%

### 问题上报

如果发现以下问题，请记录并上报：
1. **视觉问题**：截图 + DOM 结构
2. **数据不一致**：运行时 vs 数据库 vs 刷新后的对比
3. **性能问题**：Performance 面板截图 + 具体操作步骤
4. **功能异常**：Console 错误日志 + 复现步骤

### 测试环境信息

记录测试环境信息以便调试：
```
浏览器: [Chrome/Firefox/Safari + 版本]
操作系统: [macOS/Windows/Linux]
前端端口: [例如 http://localhost:5173]
后端端口: [例如 http://localhost:3000]
Claude API: [配置状态]
数据库: [类型和版本]
```

---

## 快速测试脚本

在浏览器 Console 中运行以下脚本进行快速验证：

```javascript
// 快速验证脚本
async function quickTest() {
  console.log('=== 快速验证测试 ===')

  // 1. 检查消息气泡数量
  const assistantMessages = document.querySelectorAll('.message.assistant')
  console.log('✓ Assistant messages count:', assistantMessages.length)

  // 2. 检查是否有独立 loading
  const independentLoading = document.querySelectorAll('.message.assistant > .loading-container')
  console.log(independentLoading.length === 0 ? '✓' : '✗', 'No independent loading:', independentLoading.length === 0)

  // 3. 检查气泡样式
  const bubble = document.querySelector('.message.assistant .message-text')
  if (bubble) {
    const style = window.getComputedStyle(bubble)
    console.log('✓ Bubble background:', style.background)
    console.log('✓ Bubble border:', style.border)
    console.log('✓ Bubble border-radius:', style.borderRadius)
  }

  // 4. 检查 section 结构
  const sections = {
    progressLogs: document.querySelectorAll('.progress-logs-section').length,
    streamingLoading: document.querySelectorAll('.streaming-loading-section').length,
    markdown: document.querySelectorAll('.markdown-section').length
  }
  console.log('✓ Sections:', sections)

  // 5. 检查数据一致性（需要会话 ID）
  const conversationId = localStorage.getItem('claude_conversation_id')
  if (conversationId) {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`)
      const data = await response.json()
      console.log('✓ Database messages count:', data.data.messages.length)

      // 对比最后一条助手消息
      const dbLastAssistant = data.data.messages.filter(m => m.role === 'assistant').pop()
      const uiLastAssistant = document.querySelector('.message.assistant:last-of-type .message-text')

      if (dbLastAssistant && uiLastAssistant) {
        const dbContent = dbLastAssistant.content
        const uiContent = uiLastAssistant.textContent.trim()
        console.log(dbContent === uiContent ? '✓' : '✗', 'Data consistency:', dbContent === uiContent)
        if (dbContent !== uiContent) {
          console.log('  DB:', dbContent)
          console.log('  UI:', uiContent)
        }
      }
    } catch (error) {
      console.warn('⚠ Could not fetch database data:', error)
    }
  }

  console.log('=== 测试完成 ===')
}

// 运行测试
quickTest()
```

---

## 注意事项

1. **测试顺序**：按照阶段 8.5 → 9.5 → 10.3 的顺序进行测试
2. **数据清理**：每次完整测试前，建议清空聊天记录或创建新会话
3. **浏览器缓存**：如遇到异常，尝试清除浏览器缓存或使用无痕模式
4. **后端日志**：测试时同时查看后端 Console 日志，确认 API 调用正常

---

**测试完成后，请在 `tasks.md` 中标记所有测试项为完成状态。**
