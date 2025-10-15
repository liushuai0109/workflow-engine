# BPMN 文件操作功能说明

本文档详细介绍了 BPMN Explorer 中的文件操作功能，包括打开、保存和验证 BPMN 文件。

## 功能概述

BPMN Explorer 提供了完整的文件操作功能，支持多种方式打开 BPMN 文件，并包含完善的文件验证和错误处理机制。

## 打开文件功能

### 1. 多种打开方式

#### 按钮打开
- 点击标题栏中的 "📁 Open" 按钮
- 弹出文件选择对话框
- 选择 `.bpmn` 或 `.xml` 文件

#### 键盘快捷键
- `Ctrl+O` (Windows/Linux) 或 `Cmd+O` (Mac)
- 快速打开文件选择对话框

#### 拖拽打开
- 直接将 BPMN 文件拖拽到画布上
- 支持从文件管理器拖拽
- 实时验证和加载

### 2. 支持的文件格式

#### 文件扩展名
- `.bpmn` - 标准 BPMN 2.0 文件
- `.xml` - XML 格式的 BPMN 文件

#### MIME 类型
- `application/xml`
- `text/xml`

### 3. 文件验证

#### 格式验证
```typescript
const isValidBpmnFile = (file: File): boolean => {
  const validExtensions = ['.bpmn', '.xml']
  const fileName = file.name.toLowerCase()
  
  return validExtensions.some(ext => fileName.endsWith(ext))
}
```

#### 内容验证
```typescript
const isValidBpmnXml = (content: string): boolean => {
  try {
    // 检查 BPMN 命名空间
    const bpmnNamespaceRegex = /xmlns:bpmn=["']http:\/\/www\.omg\.org\/spec\/BPMN\/20100524\/MODEL["']/
    const bpmnDefinitionsRegex = /<bpmn:definitions/
    
    return bpmnNamespaceRegex.test(content) && bpmnDefinitionsRegex.test(content)
  } catch (error) {
    return false
  }
}
```

#### 大小限制
- 最大文件大小：10MB
- 防止内存溢出
- 提供友好的错误提示

### 4. 错误处理

#### 文件类型错误
```
Invalid File: Please select a valid BPMN file (.bpmn or .xml)
```

#### 文件大小错误
```
File Too Large: File size must be less than 10MB
```

#### 内容验证错误
```
Invalid BPMN Content: The file does not contain valid BPMN 2.0 XML
```

#### 读取错误
```
File Read Error: Failed to read the selected file
```

## 保存文件功能

### 1. 保存方式

#### 按钮保存
- 点击标题栏中的 "💾 Save" 按钮
- 自动下载 BPMN 文件

#### 键盘快捷键
- `Ctrl+S` (Windows/Linux) 或 `Cmd+S` (Mac)
- 快速保存当前图表

### 2. 文件格式

#### 输出格式
- 文件名：`diagram.bpmn`
- 格式：BPMN 2.0 XML
- 编码：UTF-8
- MIME 类型：`application/xml`

#### 文件内容
```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI">
  <!-- BPMN 内容 -->
</bpmn:definitions>
```

## 拖拽功能

### 1. 拖拽支持

#### 拖拽区域
- 整个画布区域
- 包括欢迎界面

#### 拖拽反馈
- 鼠标悬停时显示复制图标
- 拖拽过程中提供视觉反馈

### 2. 实现细节

#### 事件处理
```typescript
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const handleFileDrop = (event: DragEvent): void => {
  event.preventDefault()
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const file = files[0]
  if (!file) return
  
  // 验证和处理文件
  processFile(file)
}
```

#### 文件处理
- 自动验证文件类型
- 检查文件大小
- 验证 XML 内容
- 显示加载状态

## 用户反馈

### 1. 状态指示

#### 加载状态
```
Loading file...
Loading dropped file...
```

#### 成功状态
```
File loaded: example.bpmn
Auto-saved
```

#### 错误状态
```
Invalid File
File Too Large
File Processing Error
```

### 2. 状态样式

#### 成功样式
```css
.auto-save-status.success {
    color: #059669;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
}
```

#### 错误样式
```css
.auto-save-status.error {
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
}
```

#### 信息样式
```css
.auto-save-status.info {
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
}
```

## 技术实现

### 1. 文件读取

#### FileReader API
```typescript
const reader = new FileReader()

reader.onload = (e) => {
  const content = e.target?.result as string
  // 处理文件内容
}

reader.onerror = () => {
  // 处理读取错误
}

reader.readAsText(file, 'UTF-8')
```

#### 异步处理
- 使用 Promise 处理异步操作
- 提供加载状态反馈
- 错误处理和恢复

### 2. 文件下载

#### Blob API
```typescript
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

### 3. 类型安全

#### TypeScript 类型
```typescript
interface FileOperation {
  open: () => void
  save: () => Promise<void>
  createNew: () => Promise<void>
}

const handleFileSelect = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  // 类型安全的文件处理
}
```

## 使用示例

### 1. 基本使用

```typescript
// 打开文件
const openFile = (): void => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 保存文件
const saveFile = async (): Promise<void> => {
  try {
    if (bpmnModeler.value) {
      const xml = await bpmnModeler.value.getXML()
      downloadFile(xml, 'diagram.bpmn', 'application/xml')
    }
  } catch (error) {
    console.error('Error saving diagram:', error)
    showError('Save Error', 'Failed to save diagram')
  }
}
```

### 2. 拖拽处理

```typescript
// 拖拽悬停
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

// 拖拽释放
const handleFileDrop = (event: DragEvent): void => {
  event.preventDefault()
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const file = files[0]
  if (!file) return
  
  // 验证和处理文件
  if (isValidBpmnFile(file)) {
    processFile(file)
  } else {
    showError('Invalid File', 'Please drop a valid BPMN file')
  }
}
```

## 最佳实践

### 1. 文件验证
- 始终验证文件类型
- 检查文件大小限制
- 验证 XML 内容结构

### 2. 错误处理
- 提供清晰的错误消息
- 处理各种异常情况
- 提供恢复机制

### 3. 用户体验
- 显示加载状态
- 提供即时反馈
- 支持多种操作方式

### 4. 性能优化
- 限制文件大小
- 异步处理大文件
- 及时清理资源

## 故障排除

### 1. 常见问题

#### 文件无法打开
- 检查文件格式是否正确
- 验证文件内容是否为有效 BPMN XML
- 确认文件大小未超过限制

#### 拖拽不工作
- 检查浏览器是否支持拖拽 API
- 确认拖拽区域正确设置
- 验证事件处理函数

#### 保存失败
- 检查 BPMN 模型器状态
- 验证 XML 生成是否成功
- 确认浏览器下载权限

### 2. 调试方法

#### 控制台日志
```javascript
// 检查文件信息
console.log('File name:', file.name)
console.log('File size:', file.size)
console.log('File type:', file.type)

// 检查 XML 内容
console.log('XML content:', content)
console.log('Is valid BPMN:', isValidBpmnXml(content))
```

#### 网络检查
- 检查文件读取是否成功
- 验证 XML 解析结果
- 确认下载链接生成

## 总结

BPMN Explorer 的文件操作功能提供了：

1. **多种打开方式**：按钮、快捷键、拖拽
2. **完善的文件验证**：格式、大小、内容验证
3. **友好的用户反馈**：状态指示、错误提示
4. **类型安全**：TypeScript 支持
5. **错误处理**：全面的异常处理机制

这些功能确保了用户可以方便、安全地打开和保存 BPMN 文件，提供了与专业 BPMN 工具相媲美的用户体验。
