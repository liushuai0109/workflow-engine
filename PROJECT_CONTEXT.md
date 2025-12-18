# BPMN Explorer - 项目上下文文档

> 本文档用于快速理解项目结构、核心功能和工作流程，供 Claude Code 快速恢复上下文使用。

## 项目概述

**BPMN Explorer** 是一个基于 Vue.js 的 BPMN/XPMN 流程图编辑器，支持 AI 辅助生成流程图。用户可以通过自然语言描述业务流程，AI 会自动生成对应的流程图 XML 代码或直接在编辑器中绘制。

### 技术栈
- **前端框架**: Vue 3 + TypeScript
- **编辑器**: BPMN.js (流程图编辑和渲染)
- **AI 模型**: Google Gemini API (支持 Function Calling)
- **构建工具**: Vite

---

## 核心文件结构

```
bpmn-explorer/
├── client/src/
│   ├── pages/
│   │   └── BpmnEditorPage.vue          # 主编辑器页面
│   ├── prompts/                        # AI 提示词（核心）
│   │   ├── xpmnSystemPrompt.ts         # XPMN XML 生成提示词
│   │   ├── bpmnSystemPrompt.ts         # BPMN 2.0 XML 生成提示词
│   │   └── editorSystemPrompt.ts       # Function Calling 绘图提示词
│   ├── services/
│   │   ├── llmService.ts               # Gemini API 调用服务
│   │   └── llmTools.ts                 # Function Calling 工具定义
│   └── utils/
│       └── bpmnConverter.ts            # BPMN ↔ XPMN 格式转换
├── docs/                               # 项目文档
│   ├── AI_FLOWCHART_GUIDE.md          # AI 生成流程图用户指南
│   ├── GEMINI_API.md                  # Gemini API 配置说明
│   └── FLOW_VISUALIZATION.md          # 流程可视化功能
└── expected.xpmn                       # 预期的布局示例
└── received.xpmn                       # AI 生成的布局（用于对比）
```

---

## AI 流程图生成模式

项目支持两种 AI 生成模式（通过 `USE_FUNCTION_CALLING` 标志切换）：

### 模式 1: XML 生成模式（当前默认，`USE_FUNCTION_CALLING = false`）
- AI 生成完整的 BPMN/XPMN XML 代码（包括布局信息）
- 提示词文件：
  - `xpmnSystemPrompt.ts` - 生成 XPMN 格式
  - `bpmnSystemPrompt.ts` - 生成 BPMN 2.0 格式
- 优点：完全控制布局，包含详细的 BPMNDiagram 信息
- 缺点：XML 代码较长，生成速度稍慢

### 模式 2: Function Calling 模式（`USE_FUNCTION_CALLING = true`）
- AI 通过调用工具函数直接在编辑器上绘制
- 提示词文件：`editorSystemPrompt.ts`
- 工具定义：`llmTools.ts`（createNode, createFlow, deleteNode 等）
- 优点：交互式绘图，可以逐步修改
- 缺点：布局依赖 AI 的位置计算

---

## 布局改进规则（2025-12-11 更新）

根据用户反馈，所有提示词已更新以下**关键布局规则**：

### 1. 连线避开节点
- ❌ **禁止**：线条（sequenceFlow）覆盖在任何节点上
- ✅ **要求**：使用多个 waypoint 折角绕开所有节点
- **回流线处理**：
  - 向上回流：先上移到所有节点上方 → 水平移动 → 下移到目标
  - 向下回流：先下移到所有节点下方 → 水平移动 → 上移到目标

### 2. 连接点在边缘
- ❌ **禁止**：waypoint 连到节点中心点
- ✅ **要求**：连到节点边缘（top/bottom/left/right）
- **示例**：
  - 水平流动：右边缘 → 左边缘 `[x1+width/2, y1] → [x2-width/2, y2]`
  - 垂直流动：下边缘 → 上边缘 `[x1, y1+height/2] → [x2, y2-height/2]`

### 3. 文字标签不遮挡
- ❌ **禁止**：标签与节点重叠、标签被线遮挡、标签之间重叠
- ✅ **要求**：BPMNLabel Bounds 避开所有节点和连线
- **定位策略**：
  - 节点标签：通常在节点下方 5-10px
  - 连线标签：在线段中点旁边偏移 10-20px

### 4. 节点间距
- 水平间距：主流程节点间隔 100-200px
- 垂直间距：分支节点间隔至少 150px
- 回流路径间距：与主流程区域至少 50px

---

## 提示词文件详解

### 1. xpmnSystemPrompt.ts
**用途**：生成 XPMN 格式的流程图 XML

**核心内容**：
- XPMN 节点类型（startNode, endNode, userNode, serviceNode, businessNode, exclusiveGateway, parallelGateway）
- sequenceFlow 定义
- **布局规范**（新增）：BPMNDiagram, BPMNShape, BPMNEdge, waypoint 计算规则
- 完整布局示例（包含回流线）

**关键更新**：
- 新增 "布局规范 (BPMNDiagram)" 章节（100-212 行）
- 强调连线避让、边缘连接、标签定位
- "你的任务" 第 5 点：布局质量保证要求

### 2. editorSystemPrompt.ts
**用途**：通过 Function Calling 直接在编辑器绘制流程图

**核心内容**：
- 工具函数（createNode, createFlow, deleteNode, updateNode, clearCanvas, getNodes）
- 节点类型定义
- 布局规则（起始位置、间距、对齐）

**关键更新**：
- 新增 "重要布局改进规则（必须遵守）" 章节（43-77 行）
- 详细说明回流线绘制策略
- 新增回流线布局示例

### 3. bpmnSystemPrompt.ts
**用途**：生成标准 BPMN 2.0 格式的流程图 XML

**核心内容**：
- BPMN 2.0 命名空间和结构
- 节点类型（统一使用 subProcess）
- sequenceFlow 定义

**关键更新**：
- 更新 "连线路径规则" 章节（110-158 行）
- 详细说明回流线的 waypoint 计算方法
- 新增标签布局规则和质量要求

---

## 常见工作流程

### 用户生成流程图
1. 用户在编辑器中输入自然语言描述（如 "创建用户注册流程"）
2. 调用 Gemini API，传入对应的 system prompt
3. AI 返回 XML 代码或 Function Calling 工具调用
4. 系统解析并渲染流程图到 BPMN.js 编辑器

### 布局质量验证
- **参考文件**：`expected.xpmn`（预期布局）vs `received.xpmn`（AI 生成）
- **检查点**：
  - [ ] 回流线是否绕开所有节点
  - [ ] waypoint 是否连到节点边缘
  - [ ] BPMNLabel 是否避开节点和连线
  - [ ] 节点间距是否合理

---

## API 配置

### Gemini API 设置
- **配置文件位置**: `client/src/services/llmService.ts`
- **环境变量**: `VITE_GEMINI_API_KEY` (在 `.env` 文件中配置)
- **模型**:
  - `gemini-2.0-flash-exp` (Function Calling 模式)
  - `gemini-1.5-flash` (XML 生成模式)

详见 `docs/GEMINI_API.md`

---

## 重要提示

### 给 AI 的注意事项
1. **提示词是核心**：所有布局规则都写在提示词中，修改提示词即可影响 AI 生成行为
2. **两种模式**：根据 `USE_FUNCTION_CALLING` 标志选择模式，修改对应提示词
3. **布局示例**：`expected.xpmn` 展示了良好的布局（回流线、边缘连接、标签定位）
4. **增量改进**：用户反馈的布局问题已记录到提示词，避免重复问题

### 下次接手任务时
1. 阅读本文档快速恢复上下文
2. 检查 `USE_FUNCTION_CALLING` 确定当前模式
3. 根据任务类型修改对应提示词文件
4. 参考 `expected.xpmn` 验证布局质量

---

## 更新日志

### 2025-12-11
- ✅ 更新所有提示词，加入布局改进规则
- ✅ 新增连线避让、边缘连接、标签定位要求
- ✅ 详细说明回流线绘制策略
- ✅ 创建本项目上下文文档

---

**文档维护者**: Claude Code
**最后更新**: 2025-12-11
**版本**: v1.0
