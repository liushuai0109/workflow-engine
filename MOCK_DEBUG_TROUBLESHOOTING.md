# Mock & Debug 功能故障排查指南

## 问题：为什么看不到 Mock/Debug 按钮？

### 快速检查清单

1. **是否加载了 BPMN 文件？**
   - ❌ 没有加载 → 顶部工具栏的 Mock/Debug 按钮不会显示
   - ✅ 已加载 → 按钮应该显示

2. **右下角的固定按钮是否可见？**
   - 位置：右下角，聊天按钮上方
   - 状态：未加载流程图时是灰色（禁用状态）

3. **浏览器控制台是否有错误？**
   - 按 F12 打开开发者工具
   - 查看 Console 标签是否有红色错误

---

## 问题定位

### 代码位置
文件：`client/src/pages/BpmnEditorPage.vue`

#### 1. 顶部工具栏按钮（第 28-47 行）
```vue
<button
  v-if="currentDiagram"  ← 关键：需要先加载 BPMN 文件
  @click="toggleMockPanel"
  class="btn"
  :class="{ 'btn-flow-active': showMockPanel }"
  :disabled="!currentDiagram"
>
  <span class="icon">🎭</span>
  Mock
</button>
```

**显示条件**：
- ✅ 必须先打开或创建 BPMN 文件
- ✅ `currentDiagram` 不为空

#### 2. 右下角固定按钮（第 122-146 行）
```vue
<div class="mock-debug-controls"
  style="position: fixed !important; bottom: 100px !important; right: 20px !important; z-index: 10000 !important; ...">
  <button
    class="control-btn mock-btn"
    @click="toggleMockPanel"
    :disabled="!currentDiagram"  ← 没有流程图时禁用
  >
    <span style="margin-right: 4px;">🎭</span> Mock
  </button>
  <button
    class="control-btn debug-btn"
    @click="toggleDebugPanel"
    :disabled="!currentDiagram"
  >
    <span style="margin-right: 4px;">🐛</span> Debug
  </button>
</div>
```

**显示条件**：
- ✅ 始终显示（无 `v-if`）
- ⚠️ 没有流程图时为禁用状态（灰色，不可点击）

---

## 解决方案

### 方案 1：先加载 BPMN 文件（推荐）

1. **点击"Open BPMN"按钮**
   - 选择一个 `.bpmn` 或 `.xml` 文件
   - 或点击"New"创建新流程图

2. **加载后应该看到**：
   - 顶部工具栏出现 Mock 和 Debug 按钮
   - 右下角的 Mock/Debug 按钮变为可点击状态（彩色）

### 方案 2：修改代码让按钮始终可见（不推荐）

如果你想在没有流程图时也显示按钮（只是禁用状态）：

**修改位置**：`client/src/pages/BpmnEditorPage.vue` 第 28-29 行

**原代码**：
```vue
<button
  v-if="currentDiagram"  ← 删除这一行
  @click="toggleMockPanel"
```

**修改为**：
```vue
<button
  @click="toggleMockPanel"
```

⚠️ **不推荐**：因为没有流程图时，Mock/Debug 功能无法使用

### 方案 3：检查是否有样式冲突

#### 浏览器检查步骤：
1. 按 `F12` 打开开发者工具
2. 点击 "Elements" 标签
3. 按 `Ctrl+F` 搜索 `mock-debug-controls`
4. 查看元素是否存在，以及计算后的样式

#### 可能的问题：
- z-index 被其他元素覆盖
- bottom/right 位置超出屏幕
- 被父元素的 `overflow: hidden` 裁剪

---

## 验证按钮是否工作

### 测试步骤

1. **创建新流程图**
   ```
   点击 "New" 按钮 → 应该加载默认流程图
   ```

2. **检查按钮状态**
   ```
   - 顶部工具栏：应该出现 Mock 和 Debug 按钮
   - 右下角：Mock/Debug 按钮应该变为彩色（可点击）
   ```

3. **点击 Mock 按钮**
   ```
   应该弹出 Mock 控制面板（左侧滑出）
   ```

4. **点击 Debug 按钮**
   ```
   应该弹出 Debug 控制面板 + 变量监视面板 + 执行历史面板
   ```

### 期望效果

#### Mock 面板应该显示：
- 执行状态
- 当前节点
- 执行进度
- 控制按钮：开始执行、暂停、停止

#### Debug 面板应该显示：
- Debug 控制按钮：开始、单步、继续、停止
- 断点管理
- 执行状态

---

## 常见问题

### Q1: 按钮是灰色的，无法点击
**A**: 你需要先加载或创建 BPMN 流程图

### Q2: 点击按钮没有反应
**A**: 检查浏览器控制台是否有错误，可能是后端未启动

### Q3: 面板不显示
**A**: 检查以下代码是否正确：
- `client/src/components/MockControlPanel.vue`
- `client/src/components/DebugControlPanel.vue`

### Q4: 按钮完全看不到（连灰色都没有）
**A**: 可能的原因：
1. 代码未正确部署（清除浏览器缓存：`Ctrl+Shift+R`）
2. 构建错误（检查终端是否有错误）
3. 样式被覆盖（检查 CSS）

---

## 调试日志

### 查看控制台日志

打开浏览器控制台，应该看到：

```
=== BPMN diagram shown ===
currentDiagram value: exists (xxx chars)
Button should be visible: true
Mock button disabled: false
Debug button disabled: false
```

### 点击 Mock 按钮后：
```
Toggle Mock Panel, current state: false
Mock Panel state after toggle: true
```

### 点击 Debug 按钮后：
```
Toggle Debug Panel, current state: false
Debug Panel opened, showing variable and timeline panels
Debug Panel state after toggle: true
```

---

## 后端 API 检查

Mock/Debug 功能需要后端支持，确保后端已启动：

### 检查后端是否运行
```bash
# 检查 Server 是否启动
curl http://localhost:3000/health

# 期望输出：
{"status":"ok","timestamp":"..."}
```

### Mock API 端点
- `POST /api/workflows/:workflowId/mock/execute` - 开始 Mock 执行
- `GET /api/workflows/mock/executions/:executionId` - 获取执行状态
- `POST /api/workflows/mock/executions/:executionId/step` - 单步执行

### Debug API 端点
- `POST /api/workflows/:workflowId/debug/start` - 开始 Debug 会话
- `POST /api/workflows/debug/sessions/:sessionId/step` - 单步执行
- `GET /api/workflows/debug/sessions/:sessionId` - 获取会话状态

---

## 总结

**最可能的原因**：你还没有加载 BPMN 文件

**最简单的解决方法**：
1. 点击 "New" 创建新流程图
2. 或点击 "Open BPMN" 加载现有文件
3. 加载后，Mock/Debug 按钮应该自动显示并可用

**仍然有问题？**
- 清除浏览器缓存（Ctrl+Shift+R）
- 重启前端服务（`npm run start`）
- 检查浏览器控制台错误
