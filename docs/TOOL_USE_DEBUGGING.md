# Tool Use 调试指南

## 问题现象

用户提示词："画一个注册流程图"

**预期行为**:
- Claude 应该调用 `createNode` 和 `createFlow` 工具
- 通过工具调用逐步构建流程图

**实际行为**:
- Claude 直接返回了 BPMN XML文本
- XML包含很多空的 `<dc:Bounds />` 元素
- 没有调用任何工具

## 可能原因分析

### 1. 工具未正确注册
**检查**:
```javascript
// 在浏览器 Console 查看
🔧 Round 1: Sending request with 6 tools
📋 Available tools: [ 'createNode', 'createFlow', 'deleteNode', 'updateNode', 'clearCanvas', 'getNodes' ]
```

**如果工具数量为 0**: 工具未正确注册
**如果工具数量为 6**: 工具已注册，问题在别处

### 2. System Prompt 不够明确
**当前提示词** (claudeBpmnSystemPrompt.ts):
- 有工具说明
- 有使用示例
- 但可能缺少"必须使用工具"的强调

**建议改进**:
添加明确指令强调必须使用工具，不要直接生成XML

### 3. Claude 模型选择了文本生成而非工具调用
**检查 stop_reason**:
```javascript
📨 Response stop_reason: end_turn  // 正常结束
📦 Content types: [ 'text' ]      // 只返回文本，没有 tool_use
```

**如果只看到 'text'**: Claude 没有调用工具
**如果看到 'tool_use'**: Claude 正确调用了工具

## 对比分析

### CLI 生成的示例文件
文件: `examples/user-onboarding-with-lifecycle.bpmn`

**特点**:
1. 完整的 BPMN XML结构
2. 所有节点都有正确的 `<dc:Bounds>` 坐标
3. 包含详细的 extensionElements
4. 节点布局合理

**生成方式**: 使用Claude CLI（可能有不同的配置）

### 当前 Web 界面生成的输出

**特点**:
1. 不完整的 BPMN XML
2. 大量空的 `<dc:Bounds />`
3. 节点定义和图形定义不匹配
4. 布局混乱

**问题**: Claude 在直接生成XML而不是调用工具

## 解决方案

### 方案 1: 强化 System Prompt

在 `claudeBpmnSystemPrompt.ts` 开头添加：

```typescript
export const CLAUDE_BPMN_SYSTEM_PROMPT = `你是一个专业的 BPMN 流程图设计助手。

**重要规则**:
1. ❌ 你绝对不能直接生成或返回 BPMN XML 代码
2. ✅ 你必须使用提供的工具函数来创建流程图
3. ✅ 每次创建节点都必须调用 createNode 工具
4. ✅ 每次创建连线都必须调用 createFlow 工具

如果你直接返回XML代码，这将导致错误！你只能通过工具调用来操作编辑器。

# 你的能力
...
`
```

### 方案 2: 添加工具调用示例到 System Prompt

在提示词中添加更多具体的工具调用示例：

```typescript
## 正确的工作方式

用户："画一个注册流程图"

你应该这样做：
1. 思考："注册流程需要：开始 → 填写信息 → 验证邮箱 → 注册成功"
2. 调用 createNode 创建开始节点
3. 调用 createNode 创建用户任务节点
4. 调用 createNode 创建结束节点
5. 调用 createFlow 创建连线
6. 最后告诉用户："我已经为您创建了注册流程图，包含X个节点"

你绝对不能这样做：
❌ 直接返回 BPMN XML 代码
❌ 说 "这是 XML 代码"
❌ 生成 <bpmn:definitions> 标签

记住：你的输出应该是工具调用，不是XML代码！
```

### 方案 3: 调整 Temperature

降低 temperature 可能让 Claude 更倾向于使用工具：

```typescript
// llmConfig.ts
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'claude',
  // ...
  temperature: 0.3,  // 从 0.7 降低到 0.3
  // ...
}
```

### 方案 4: 检查 jiekou.ai 对 Tool Use 的支持

根据 jiekou.ai 文档:
- ✅ 支持: Bash, Text editor
- ❓ 自定义工具: 需要测试

**测试方法**:
发送最简单的工具调用请求，看 Claude 是否响应 tool_use:

```bash
curl -X POST http://localhost:3000/api/claude/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "tools": [
      {
        "name": "test_tool",
        "description": "A test tool",
        "input_schema": {
          "type": "object",
          "properties": {
            "message": {"type": "string"}
          },
          "required": ["message"]
        }
      }
    ],
    "messages": [
      {"role": "user", "content": "请调用 test_tool 工具，message 参数填 \"hello\""}
    ]
  }'
```

如果响应包含 `"type": "tool_use"`，说明支持。

## 调试清单

- [ ] 检查浏览器 Console 确认工具数量（应该是 6）
- [ ] 检查 stop_reason（期望看到 'tool_use'）
- [ ] 检查 content types（期望包含 'tool_use'）
- [ ] 测试 jiekou.ai 是否支持自定义 Tool Use
- [ ] 尝试降低 temperature
- [ ] 强化 System Prompt 中的工具使用指令
- [ ] 对比 CLI 和 Web 的配置差异

## 预期修复后的日志

```
🔧 Round 1: Sending request with 6 tools
📋 Available tools: [ 'createNode', 'createFlow', 'deleteNode', 'updateNode', 'clearCanvas', 'getNodes' ]
📨 Response stop_reason: tool_use, content blocks: 2
📦 Content types: [ 'text', 'tool_use' ]

🔧 Round 2: Sending request with 6 tools
📨 Response stop_reason: tool_use, content blocks: 3
📦 Content types: [ 'text', 'tool_use', 'tool_use' ]

🔧 Round 3: Sending request with 6 tools
📨 Response stop_reason: end_turn, content blocks: 1
📦 Content types: [ 'text' ]

✅ 流程图创建完成
```

## 参考资料

- Claude Tool Use 文档: https://docs.anthropic.com/en/docs/tool-use
- jiekou.ai Tool Use 支持: https://docs.jiekou.ai/docs/providers/anthropic#tools
- BPMN 标准: https://www.omg.org/spec/BPMN/2.0/

---

**创建时间**: 2025-12-19
**状态**: 待调试
