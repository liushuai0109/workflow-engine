# 设计文档:拦截器详情视图

## 概述

本设计文档描述了如何在 Mock 控制面板中优化和完善拦截器详情视图,以支持演示场景的需求。

## 当前架构分析

### 组件结构

```
MockControlPanel.vue
├─ 面板头部 (panel-header)
│  ├─ 标题
│  └─ 开始执行按钮
│
├─ 面板内容 (panel-content)
│  ├─ 接口选择器
│  ├─ 错误提示
│  └─ 结果展示 Tabs (result-tabs-section)
│     ├─ Tab 1: 请求/回包
│     │  ├─ 上部: 请求入参 (JSON textarea)
│     │  └─ 下部: 响应数据 (JSON textarea)
│     │
│     ├─ Tab 2: 拦截器调用 ⭐ 本次优化重点
│     │  ├─ 上部: 拦截器列表 (split-panel-top)
│     │  │  ├─ 列表项 1 (interceptor-item)
│     │  │  │  ├─ 头部 (interceptor-item-header)
│     │  │  │  │  ├─ 序号徽章 (interceptor-order)
│     │  │  │  │  ├─ 名称 (interceptor-name)
│     │  │  │  │  └─ 时间戳 (interceptor-time)
│     │  │  │  └─ 控件 (interceptor-item-controls)
│     │  │  │     └─ 模式切换 (a-radio-group)
│     │  │  ├─ 列表项 2
│     │  │  └─ ...
│     │  │
│     │  └─ 下部: 拦截器详情 (split-panel-bottom)
│     │     └─ 详情 Tabs (a-tabs)
│     │        ├─ Tab: 入参 (interceptorInputJson)
│     │        └─ Tab: 回包 (interceptorOutputJson)
│     │
│     └─ Tab 3: 日志 (占位)
```

### 数据流

```
API 执行
  ↓
返回 ExecuteResult
  ├─ businessResponse
  ├─ engineResponse
  ├─ interceptorCalls ⭐ 拦截器调用数据
  │   ├─ [0] { name, order, timestamp, input, output }
  │   ├─ [1] { name, order, timestamp, input, output }
  │   └─ ...
  └─ requestParams
  ↓
存储到 lastResult.value
  ↓
渲染拦截器列表 (v-for)
  ↓
用户点击列表项
  ↓
更新 selectedInterceptor (order)
  ↓
计算 selectedInterceptorDetails (computed)
  ↓
渲染详情 Tabs
  ├─ 入参: interceptorInputJson
  └─ 回包: interceptorOutputJson
```

### 状态管理

```typescript
// 核心状态
const lastResult = ref<ExecuteResult | null>(null)  // API 返回的完整结果
const selectedInterceptor = ref<number | null>(null)  // 当前选中的拦截器序号
const interceptorDetailTab = ref('input')  // 详情 Tab 激活状态

// 计算属性
const selectedInterceptorDetails = computed(() => {
  if (!selectedInterceptor.value || !lastResult.value?.interceptorCalls) return null
  return lastResult.value.interceptorCalls.find(call => call.order === selectedInterceptor.value)
})

const interceptorInputJson = computed({
  get: () => selectedInterceptorDetails.value?.input
    ? formatJSON(selectedInterceptorDetails.value.input)
    : '',
  set: () => {}  // 当前只读
})

const interceptorOutputJson = computed({
  get: () => selectedInterceptorDetails.value?.output
    ? formatJSON(selectedInterceptorDetails.value.output)
    : '',
  set: () => {}  // 当前只读
})
```

## 设计决策

### 决策 1: 使用分屏布局而非抽屉

**选择**: 分屏布局 (split-panel)
**理由**:
- ✅ 列表和详情同时可见,无需额外交互
- ✅ 适合演示场景,观众可以同时看到列表和详情
- ✅ 减少交互步骤,提升效率
- ❌ 空间有限,不适合超大型数据

**替代方案**:
- Drawer 抽屉:需要额外点击,演示时不够直观
- Modal 弹窗:遮挡列表,不利于对比查看
- 独立页面:过于重量级,不适合轻量演示

### 决策 2: 使用 Tabs 展示入参和回包

**选择**: Ant Design `a-tabs` 组件
**理由**:
- ✅ Tabs 是 Ant Design 标准组件,视觉统一
- ✅ 节省垂直空间,避免滚动过多
- ✅ 清晰区分入参和回包,不会混淆
- ✅ 支持键盘导航,可访问性好

**替代方案**:
- 上下排列:占用过多垂直空间
- 左右排列:在窄面板中空间不足
- 折叠面板:额外的展开/收起操作,不够直观

### 决策 3: JSON 使用 textarea 而非代码编辑器

**选择**: 原生 `<textarea>` + 等宽字体
**理由**:
- ✅ 零依赖,不增加打包体积
- ✅ 足够演示场景使用,JSON 数据通常不大
- ✅ 实现简单,维护成本低
- ✅ 性能好,无额外渲染开销
- ❌ 无语法高亮,但在演示中不是关键需求

**替代方案**:
- Monaco Editor:过于重量级,打包体积大
- CodeMirror:需要额外依赖,配置复杂
- 自定义语法高亮:实现成本高,收益不明显

### 决策 4: 列表项使用圆形序号徽章

**选择**: 圆形背景徽章 + 白色数字
**理由**:
- ✅ 视觉醒目,在演示中容易识别
- ✅ 符合常见设计模式(步骤指示器)
- ✅ 圆形徽章与拦截器调用的"顺序"语义匹配
- ✅ 颜色对比度足够(蓝底白字)

**替代方案**:
- 纯文本序号:不够醒目
- 方形徽章:不够友好,略显生硬
- 无序号:难以表达执行顺序

## 技术实现

### JSON 格式化

```typescript
// 统一的 JSON 格式化函数
const formatJSON = (obj: any): string => {
  return JSON.stringify(obj, null, 2)
}

// 在 computed 中自动格式化
const interceptorInputJson = computed({
  get: () => selectedInterceptorDetails.value?.input
    ? formatJSON(selectedInterceptorDetails.value.input)
    : '',
  set: () => {}
})
```

**性能考虑**:
- `JSON.stringify` 对于 < 100KB 的数据性能很好 (< 10ms)
- Computed 属性自动缓存,不会重复格式化
- 如果数据 > 1MB,考虑延迟格式化或分页展示

### 时间戳格式化

```typescript
const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()  // 如 "10:30:45"
  } catch (e) {
    return timestamp  // 降级显示原始字符串
  }
}
```

**改进空间**:
- 可以添加相对时间(如"2 分钟前")
- 可以添加完整日期(如"2025-01-15 10:30:45")
- 可以支持时区配置

### 列表项选中逻辑

```typescript
// 点击列表项选中
<div
  v-for="call in lastResult.interceptorCalls"
  :key="call.order"
  :class="['interceptor-item', { active: selectedInterceptor === call.order }]"
  @click="selectedInterceptor = call.order"
>
  ...
</div>

// 计算选中的详情
const selectedInterceptorDetails = computed(() => {
  if (!selectedInterceptor.value || !lastResult.value?.interceptorCalls) return null
  return lastResult.value.interceptorCalls.find(call => call.order === selectedInterceptor.value)
})
```

**边界情况**:
- 如果 `interceptorCalls` 为空,列表显示空状态
- 如果 `selectedInterceptor` 为 null,详情显示"请选择"提示
- 如果 `selectedInterceptorDetails` 找不到,降级显示空状态

## 样式实现

### 颜色方案

```css
/* 主题色 - 蓝色系 */
--primary-color: #1890ff;
--primary-light: #e6f7ff;
--primary-hover: #40a9ff;

/* 中性色 */
--border-color: #e8e8e8;
--bg-light: #fafafa;
--bg-hover: #f5f5f5;
--text-primary: #333;
--text-secondary: #999;

/* 功能色 */
--success-color: #52c41a;
--error-color: #ff4d4f;
```

### 关键样式

```css
/* 序号徽章 */
.interceptor-order {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 列表项交互状态 */
.interceptor-item {
  background: white;
  border: 1px solid #e8e8e8;
  transition: all 0.2s;
}

.interceptor-item:hover {
  background: #f5f5f5;
  border-color: #1890ff;
}

.interceptor-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

/* JSON textarea */
.code-editor {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}
```

## 演示场景设计

### 演示流程

1. **准备阶段**:
   - 加载演示工作流(`demo-interceptor.bpmn`)
   - 打开 Mock 控制面板
   - 确保面板可见且布局清晰

2. **执行阶段**:
   - 点击"开始执行"按钮
   - 讲解工作流正在执行
   - 等待执行完成(通常 < 5 秒)

3. **展示阶段**:
   - 切换到"拦截器调用" tab
   - 讲解拦截器列表(序号、名称、时间)
   - 点击第一个拦截器
   - 展示入参 tab,讲解输入数据
   - 切换到回包 tab,讲解输出数据
   - 点击其他拦截器,展示不同数据

4. **交互阶段**:
   - 演示模式切换(记录 → Mock)
   - 再次执行,展示 Mock 效果
   - 对比前后两次的数据变化

### 示例数据

```json
{
  "interceptorCalls": [
    {
      "name": "GetWorkflow:demo-workflow-001",
      "order": 1,
      "timestamp": "2025-01-15T10:30:00Z",
      "input": {
        "workflowId": "demo-workflow-001"
      },
      "output": {
        "id": "demo-workflow-001",
        "name": "示例工作流",
        "version": "1.0",
        "nodes": [...]
      }
    },
    {
      "name": "GetInstance:instance-abc123",
      "order": 2,
      "timestamp": "2025-01-15T10:30:01Z",
      "input": {
        "instanceId": "instance-abc123"
      },
      "output": {
        "id": "instance-abc123",
        "status": "running",
        "currentNodeIds": ["node-1"],
        "variables": {}
      }
    },
    {
      "name": "ExecuteServiceTask:node-1",
      "order": 3,
      "timestamp": "2025-01-15T10:30:02Z",
      "input": {
        "nodeId": "node-1",
        "apiUrl": "https://api.example.com/users",
        "method": "GET"
      },
      "output": {
        "statusCode": 200,
        "body": {
          "users": [
            { "id": 1, "name": "Alice" },
            { "id": 2, "name": "Bob" }
          ]
        }
      }
    }
  ]
}
```

## 可扩展性考虑

### 未来可能的增强

1. **JSON 编辑功能**:
   - 允许直接在 textarea 中编辑 mock 数据
   - 添加"保存"按钮将修改后的数据应用
   - 需要实现 JSON 校验和错误提示

2. **复制到剪贴板**:
   - 在详情区域添加"复制"按钮
   - 一键复制 JSON 数据到剪贴板
   - 显示复制成功的 toast 提示

3. **搜索和过滤**:
   - 在列表上方添加搜索框
   - 支持按拦截器名称过滤
   - 支持按时间范围过滤

4. **时序图展示**:
   - 可视化展示拦截器调用的时间线
   - 显示每个拦截器的耗时
   - 支持点击时序图节点跳转到详情

5. **数据导出**:
   - 导出所有拦截器调用为 JSON 文件
   - 支持导入历史记录进行回放
   - 用于团队分享和调试

### 架构扩展点

```typescript
// 未来可以抽取为独立组件
<InterceptorList
  :calls="interceptorCalls"
  v-model:selected="selectedInterceptor"
  @mode-change="handleModeChange"
/>

<InterceptorDetail
  :call="selectedInterceptorDetails"
  :editable="false"
  @save="handleSave"
/>
```

## 测试策略

### 单元测试

- [ ] 测试 `formatJSON` 函数
- [ ] 测试 `formatTime` 函数
- [ ] 测试 `selectedInterceptorDetails` computed
- [ ] 测试列表项点击事件

### 集成测试

- [ ] 测试拦截器列表渲染
- [ ] 测试详情 Tabs 切换
- [ ] 测试空状态展示
- [ ] 测试模式切换功能

### E2E 测试

- [ ] 测试完整的工作流执行 → 查看拦截器 → 查看详情流程
- [ ] 测试在不同数据量下的性能
- [ ] 测试在不同浏览器中的兼容性

## 总结

本设计文档详细描述了拦截器详情视图的实现方案,关键要点:

1. **已有良好基础**: 当前实现已经包含了列表和详情的核心功能
2. **优化重点**: 主要是视觉设计和交互体验的微调
3. **演示友好**: 布局和样式适合演示场景,信息清晰易懂
4. **可扩展性**: 架构设计考虑了未来的功能扩展
5. **实施简单**: 大部分工作是 UI 优化,技术风险低

本次变更预计工作量 1.5-2.5 天,主要集中在 UI 验证、优化和演示场景准备。
