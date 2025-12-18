# Figma 集成快速开始指南

## 概述

本指南帮助你快速实现 Figma 关联功能的核心部分。完整方案请参考 [FIGMA_INTEGRATION.md](./FIGMA_INTEGRATION.md)。

---

## 第一步：扩展定义（已完成 ✅）

已在 `xflowExtension.json` 中添加 `FigmaLink` 类型定义。

---

## 第二步：创建 Figma 服务（已完成 ✅）

已创建 `client/src/services/figmaService.ts`，包含：
- URL 解析功能
- 嵌入链接生成
- API 调用方法（可选）

---

## 第三步：在属性面板中添加 Figma 关联

### 3.1 修改 XFlowPropertiesProvider.ts

在 `client/src/extensions/xflow/XFlowPropertiesProvider.ts` 中添加以下方法：

```typescript
// 在类的私有方法区域添加

/**
 * 获取 Figma 关联信息
 */
private getFigmaLink(element: BpmnElement): any {
  const businessObject = getBusinessObject(element)
  const extensionElements = businessObject?.extensionElements
  if (!extensionElements?.values) return null
  
  return extensionElements.values.find(
    (v: any) => v.$type === 'xflow:FigmaLink'
  )
}

/**
 * 设置 Figma 关联信息
 */
private setFigmaLink(element: BpmnElement, link: any) {
  const bpmnFactory = this.injector.get('bpmnFactory')
  const commandStack = this.injector.get('commandStack')
  const businessObject = getBusinessObject(element)
  
  // 确保 extensionElements 存在
  let extensionElements = businessObject.extensionElements
  if (!extensionElements) {
    extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
      values: []
    })
  }
  
  // 查找或创建 FigmaLink
  let figmaLink = extensionElements.values.find(
    (v: any) => v.$type === 'xflow:FigmaLink'
  )
  
  if (!figmaLink) {
    figmaLink = bpmnFactory.create('xflow:FigmaLink', {
      fileKey: link.fileKey || '',
      nodeId: link.nodeId || '',
      fileUrl: link.fileUrl || '',
      nodeName: link.nodeName || ''
    })
    figmaLink.$parent = extensionElements
    extensionElements.values.push(figmaLink)
  } else {
    figmaLink.fileKey = link.fileKey || ''
    figmaLink.nodeId = link.nodeId || ''
    figmaLink.fileUrl = link.fileUrl || ''
    figmaLink.nodeName = link.nodeName || ''
  }
  
  // 更新元素
  commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: businessObject,
    properties: { extensionElements }
  })
}

/**
 * 创建 Figma 关联属性组
 */
private createFigmaLinkGroup(element: BpmnElement): Group | null {
  const figmaService = require('../../services/figmaService').default
  
  return {
    id: 'figma-link',
    label: 'Figma 设计稿',
    entries: [
      {
        id: 'figma-file-url',
        label: 'Figma 链接',
        type: 'textfield',
        get: (element: BpmnElement) => {
          const link = this.getFigmaLink(element)
          return link?.fileUrl || ''
        },
        set: (element: BpmnElement, value: string) => {
          if (!value) {
            // 清空关联
            const businessObject = getBusinessObject(element)
            const extensionElements = businessObject?.extensionElements
            if (extensionElements?.values) {
              const index = extensionElements.values.findIndex(
                (v: any) => v.$type === 'xflow:FigmaLink'
              )
              if (index >= 0) {
                extensionElements.values.splice(index, 1)
                const commandStack = this.injector.get('commandStack')
                commandStack.execute('element.updateModdleProperties', {
                  element,
                  moddleElement: businessObject,
                  properties: { extensionElements }
                })
              }
            }
            return
          }
          
          const link = figmaService.parseFigmaUrl(value)
          if (link) {
            this.setFigmaLink(element, link)
          } else {
            console.warn('无法解析 Figma URL:', value)
          }
        }
      },
      {
        id: 'figma-preview',
        label: '预览设计稿',
        type: 'button',
        action: (element: BpmnElement) => {
          const link = this.getFigmaLink(element)
          if (link) {
            const embedUrl = figmaService.generateEmbedUrl({
              fileKey: link.fileKey,
              nodeId: link.nodeId,
              fileUrl: link.fileUrl || '',
              nodeName: link.nodeName
            }, {
              theme: 'light',
              embedHost: 'bpmn-explorer'
            })
            window.open(embedUrl, '_blank', 'width=1200,height=800')
          }
        },
        get: (element: BpmnElement) => {
          const link = this.getFigmaLink(element)
          return link ? '打开设计稿' : '未关联'
        }
      }
    ]
  }
}
```

### 3.2 在 getGroups 方法中注册

找到 `getGroups` 方法，添加 Figma 组：

```typescript
getGroups(element: BpmnElement): Group[] {
  const groups = [
    // ... 现有组
    this.createFigmaLinkGroup(element)
  ]
  return groups.filter(Boolean)
}
```

---

## 第四步：在画布上显示 Figma 图标（可选）

### 4.1 创建图标渲染器

创建 `client/src/extensions/figma/FigmaIconRenderer.ts`：

```typescript
import { BaseRenderer } from 'diagram-js/lib/draw/BaseRenderer'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

export default class FigmaIconRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnRenderer']

  private bpmnRenderer: any

  constructor(eventBus: any, bpmnRenderer: any) {
    super(eventBus, 1500)
    this.bpmnRenderer = bpmnRenderer
  }

  canRender(element: any): boolean {
    return is(element, 'bpmn:FlowNode') && this.hasFigmaLink(element)
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    const shape = this.bpmnRenderer.drawShape(parentNode, element)
    const figmaIcon = this.createFigmaIcon(element)
    if (figmaIcon) {
      parentNode.appendChild(figmaIcon)
    }
    return shape
  }

  private hasFigmaLink(element: any): boolean {
    const businessObject = getBusinessObject(element)
    const extensionElements = businessObject?.extensionElements
    if (!extensionElements?.values) return false
    
    return extensionElements.values.some(
      (v: any) => v.$type === 'xflow:FigmaLink'
    )
  }

  private createFigmaIcon(element: any): SVGElement | null {
    if (!this.hasFigmaLink(element)) return null

    const iconSize = 20
    const iconPadding = 5
    const bounds = element.width && element.height
      ? { width: element.width, height: element.height }
      : { width: 100, height: 80 }

    const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    iconGroup.setAttribute('class', 'figma-icon-group')
    iconGroup.setAttribute('transform', `translate(${bounds.width - iconSize - iconPadding}, ${iconPadding})`)

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', iconSize / 2)
    circle.setAttribute('cy', iconSize / 2)
    circle.setAttribute('r', iconSize / 2)
    circle.setAttribute('fill', '#0ACF83')
    circle.setAttribute('stroke', '#fff')
    circle.setAttribute('stroke-width', '1')
    circle.setAttribute('cursor', 'pointer')
    circle.setAttribute('title', '查看 Figma 设计稿')
    
    circle.addEventListener('click', (e) => {
      e.stopPropagation()
      this.openFigmaLink(element)
    })

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', iconSize / 2)
    text.setAttribute('y', iconSize / 2 + 4)
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('fill', '#fff')
    text.setAttribute('font-size', '12')
    text.setAttribute('font-weight', 'bold')
    text.setAttribute('pointer-events', 'none')
    text.textContent = 'F'

    iconGroup.appendChild(circle)
    iconGroup.appendChild(text)

    return iconGroup
  }

  private openFigmaLink(element: any) {
    const businessObject = getBusinessObject(element)
    const extensionElements = businessObject?.extensionElements
    if (!extensionElements?.values) return

    const figmaLink = extensionElements.values.find(
      (v: any) => v.$type === 'xflow:FigmaLink'
    )

    if (!figmaLink) return

    const figmaService = require('../../services/figmaService').default
    const link = {
      fileKey: figmaLink.fileKey,
      nodeId: figmaLink.nodeId,
      fileUrl: figmaLink.fileUrl,
      nodeName: figmaLink.nodeName
    }

    const embedUrl = figmaService.generateEmbedUrl(link, {
      theme: 'light',
      embedHost: 'bpmn-explorer'
    })

    window.open(embedUrl, '_blank', 'width=1200,height=800')
  }
}
```

### 4.2 创建扩展模块

创建 `client/src/extensions/figma/FigmaExtensionModule.ts`：

```typescript
import FigmaIconRenderer from './FigmaIconRenderer'

export default {
  __init__: ['figmaIconRenderer'],
  figmaIconRenderer: ['type', FigmaIconRenderer]
}
```

### 4.3 注册模块

在 `client/src/components/BpmnEditor.vue` 中：

```typescript
import FigmaExtensionModule from '../extensions/figma/FigmaExtensionModule'

// 在创建 modeler 时
const modeler = new BpmnModeler({
  container: container.value,
  additionalModules: [
    // ... 现有模块
    FigmaExtensionModule
  ]
})
```

---

## 测试步骤

1. **启动应用**
   ```bash
   npm start
   ```

2. **测试属性面板**
   - 在编辑器中创建一个节点
   - 选中节点，查看右侧属性面板
   - 应该能看到 "Figma 设计稿" 组
   - 输入 Figma URL，例如：
     ```
     https://www.figma.com/file/BAZsTPbh6W1r66Bdo/Example?node-id=0-1
     ```
   - 点击 "预览设计稿" 按钮，应该在新窗口打开 Figma 嵌入页面

3. **测试画布图标**（如果实现了）
   - 关联 Figma 后，节点右上角应该显示绿色圆形图标
   - 点击图标应该打开 Figma 设计稿

4. **验证数据持久化**
   - 关联 Figma 后保存流程图
   - 重新加载流程图
   - 验证 Figma 关联信息是否保留

---

## 常见问题

### Q: 属性面板中没有显示 "Figma 设计稿" 组？

A: 检查：
1. 是否在 `getGroups` 方法中添加了 `createFigmaLinkGroup` 调用
2. 控制台是否有错误信息
3. 确保 `xflowExtension.json` 已正确更新并重新加载

### Q: 无法解析 Figma URL？

A: 检查 URL 格式：
- 正确格式：`https://www.figma.com/file/{fileKey}/{fileName}?node-id={nodeId}`
- 确保 URL 完整且可访问

### Q: 图标不显示？

A: 检查：
1. 是否注册了 `FigmaExtensionModule`
2. 节点是否确实有关联的 Figma 信息
3. 浏览器控制台是否有渲染错误

---

## 下一步

完成基础功能后，可以考虑：
1. 添加 Figma API Token 配置
2. 实现设计稿预览缩略图
3. 添加批量关联功能
4. 实现设计稿变更检测

详细方案请参考 [FIGMA_INTEGRATION.md](./FIGMA_INTEGRATION.md)。
