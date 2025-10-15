# BPMN 元素选择面板 (Palette) 功能说明

本文档详细介绍了 BPMN Explorer 中的元素选择面板功能，该功能参考了 [demo.bpmn.io](https://demo.bpmn.io/new) 的设计。

## 功能概述

BPMN 元素选择面板（Palette）是 BPMN 编辑器左侧的工具面板，提供了所有可用的 BPMN 元素，用户可以通过拖拽的方式将元素添加到画布中。

## 主要特性

### 1. 可视化元素选择
- **位置**：位于画布左侧
- **样式**：现代化的卡片式设计，带有阴影和圆角
- **布局**：垂直排列，按功能分组

### 2. 元素分类
Palette 中的元素按以下类别分组：

#### 开始事件 (Start Events)
- 开始事件
- 消息开始事件
- 定时器开始事件
- 条件开始事件

#### 活动 (Activities)
- 用户任务
- 服务任务
- 脚本任务
- 业务规则任务
- 手动任务
- 接收任务
- 子流程
- 调用活动

#### 网关 (Gateways)
- 排他网关
- 并行网关
- 包容网关
- 事件网关

#### 结束事件 (End Events)
- 结束事件
- 消息结束事件
- 错误结束事件
- 取消结束事件
- 补偿结束事件

#### 连接对象 (Connecting Objects)
- 序列流
- 消息流
- 关联

### 3. 交互方式

#### 拖拽创建
1. 从 Palette 中选择元素
2. 拖拽到画布上的目标位置
3. 释放鼠标完成创建

#### 点击创建
1. 点击 Palette 中的元素
2. 在画布上点击目标位置
3. 元素将在点击位置创建

### 4. 控制方式

#### 工具栏按钮
- 点击标题栏中的 "🎨 Palette" 按钮
- 切换面板的显示/隐藏状态

#### 键盘快捷键
- `Ctrl+P` - 快速切换 Palette 显示/隐藏

#### 自动显示
- 默认情况下 Palette 自动显示
- 可以通过配置控制初始状态

## 样式设计

### 面板样式
```css
.djs-palette {
    background: #fff;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    top: 20px;
    left: 20px;
    width: 48px;
}
```

### 元素按钮样式
```css
.djs-palette .entry {
    width: 32px;
    height: 32px;
    margin: 2px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.djs-palette .entry:hover {
    background: #f0f9ff;
    border-color: #3b82f6;
}

.djs-palette .entry.selected {
    background: #3b82f6;
    color: #fff;
}
```

## 技术实现

### 1. BPMN.js 集成
```typescript
modeler.value = new BpmnModeler({
  container: container.value,
  keyboard: {
    bindTo: document
  },
  // 确保 Palette 可见
  palette: {
    open: true
  }
})
```

### 2. 控制方法
```typescript
// 切换 Palette 显示状态
const togglePalette = (): void => {
  if (!modeler.value) return
  
  const palette = modeler.value.get('palette')
  if (palette) {
    palette.toggle()
  }
}

// 显示 Palette
const showPalette = (): void => {
  if (!modeler.value) return
  
  const palette = modeler.value.get('palette')
  if (palette) {
    palette.open()
  }
}

// 隐藏 Palette
const hidePalette = (): void => {
  if (!modeler.value) return
  
  const palette = modeler.value.get('palette')
  if (palette) {
    palette.close()
  }
}
```

### 3. 键盘快捷键
```typescript
case 'p':
  if (isCtrl) {
    event.preventDefault()
    togglePalette()
  }
  break
```

## 使用指南

### 基本操作

1. **打开应用**
   - 访问 `http://21.91.238.173:8003`
   - Palette 默认显示在左侧

2. **创建元素**
   - 从 Palette 中选择需要的元素
   - 拖拽到画布上
   - 释放鼠标完成创建

3. **控制面板**
   - 点击 "🎨 Palette" 按钮隐藏/显示面板
   - 使用 `Ctrl+P` 快捷键快速切换

### 高级功能

1. **元素编辑**
   - 双击元素进行文本编辑
   - 右键点击元素查看上下文菜单
   - 拖拽元素调整位置

2. **连接元素**
   - 选择连接工具
   - 从一个元素拖拽到另一个元素
   - 创建序列流或消息流

3. **元素属性**
   - 选择元素后查看属性面板
   - 修改元素名称、类型等属性
   - 设置业务规则和条件

## 与 demo.bpmn.io 的对比

| 功能 | demo.bpmn.io | BPMN Explorer |
|------|--------------|---------------|
| 元素选择面板 | ✅ | ✅ |
| 拖拽创建 | ✅ | ✅ |
| 键盘快捷键 | ✅ | ✅ |
| 现代样式 | ✅ | ✅ |
| 响应式设计 | ✅ | ✅ |
| 自定义配置 | ❌ | ✅ |
| TypeScript 支持 | ❌ | ✅ |
| Vue 3 集成 | ❌ | ✅ |

## 自定义配置

### 修改面板位置
```typescript
// 在 BpmnModeler 配置中
palette: {
  open: true,
  position: 'left' // 或 'right'
}
```

### 自定义样式
```css
/* 修改面板背景色 */
.djs-palette {
    background: #f8f9fa !important;
}

/* 修改元素按钮大小 */
.djs-palette .entry {
    width: 40px !important;
    height: 40px !important;
}
```

### 添加自定义元素
```typescript
// 通过 additionalModules 添加自定义元素
additionalModules: [
  CustomPaletteProvider
]
```

## 故障排除

### 常见问题

1. **Palette 不显示**
   - 检查 BpmnModeler 配置
   - 确保 `palette.open: true`
   - 检查 CSS 样式是否正确加载

2. **元素无法拖拽**
   - 确保画布已正确初始化
   - 检查元素类型是否支持
   - 验证拖拽事件是否正确绑定

3. **样式显示异常**
   - 检查 CSS 文件是否正确加载
   - 验证样式优先级设置
   - 确保没有样式冲突

### 调试方法

1. **控制台检查**
   ```javascript
   // 检查 Palette 状态
   const palette = modeler.get('palette')
   console.log('Palette open:', palette.isOpen())
   ```

2. **元素检查**
   ```javascript
   // 检查可用元素
   const elementFactory = modeler.get('elementFactory')
   console.log('Available elements:', elementFactory.getAll())
   ```

## 总结

BPMN 元素选择面板是 BPMN Explorer 的核心功能之一，提供了直观、易用的元素创建方式。通过现代化的设计和丰富的交互功能，用户可以快速创建和编辑 BPMN 图表。

该功能完全兼容 BPMN 2.0 标准，支持所有标准的 BPMN 元素，并提供了与 demo.bpmn.io 相似的用户体验，同时增加了更多的自定义选项和 TypeScript 支持。
