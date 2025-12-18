# Figma 集成方案

## 概述

本方案提供将 BPMN 节点与 Figma 设计稿关联的能力，支持：
- 在节点属性面板中关联 Figma 文件/节点
- 在画布上显示 Figma 关联图标
- 点击图标查看/嵌入 Figma 设计稿
- 通过 Figma API 获取设计稿信息

---

## 方案架构

### 1. 数据存储层

#### 1.1 扩展 XFlow Schema

在 `client/src/extensions/xflow/xflowExtension.json` 中添加 Figma 关联类型：

```json
{
  "name": "FigmaLink",
  "superClass": ["Element"],
  "properties": [
    {
      "name": "fileKey",
      "type": "String",
      "isAttr": true
    },
    {
      "name": "nodeId",
      "type": "String",
      "isAttr": true
    },
    {
      "name": "fileUrl",
      "type": "String",
      "isAttr": true
    },
    {
      "name": "nodeName",
      "type": "String",
      "isAttr": true
    }
  ]
}
```

#### 1.2 存储位置

Figma 关联信息存储在 BPMN 节点的 `extensionElements` 中：

```xml
<bpmn:subProcess id="SubProcess_1" name="用户登录">
  <bpmn:extensionElements>
    <xflow:figmaLink 
      fileKey="BAZsTPbh6W1r66Bdo" 
      nodeId="0-1"
      fileUrl="https://www.figma.com/file/BAZsTPbh6W1r66Bdo/Login-Design"
      nodeName="登录页面"
    />
  </bpmn:extensionElements>
</bpmn:subProcess>
```

---

## 2. 服务层

### 2.1 Figma API 服务

创建 `client/src/services/figmaService.ts`：

```typescript
/**
 * Figma API 服务
 * 用于获取 Figma 文件、节点信息，生成嵌入链接等
 */

export interface FigmaFileInfo {
  fileKey: string
  fileUrl: string
  fileName?: string
}

export interface FigmaNodeInfo {
  nodeId: string
  nodeName?: string
  nodeUrl?: string
}

export interface FigmaLink {
  fileKey: string
  nodeId?: string
  fileUrl: string
  nodeName?: string
}

class FigmaService {
  private apiToken: string | null = null

  /**
   * 设置 Figma API Token（从环境变量或用户输入获取）
   */
  setApiToken(token: string) {
    this.apiToken = token
  }

  /**
   * 从 Figma URL 解析 fileKey 和 nodeId
   * 支持格式：
   * - https://www.figma.com/file/{fileKey}/{fileName}
   * - https://www.figma.com/file/{fileKey}/{fileName}?node-id={nodeId}
   */
  parseFigmaUrl(url: string): FigmaLink | null {
    try {
      const urlObj = new URL(url)
      
      // 提取 fileKey（URL 路径的第二段）
      const pathParts = urlObj.pathname.split('/').filter(p => p)
      if (pathParts.length < 3 || pathParts[0] !== 'file') {
        return null
      }
      
      const fileKey = pathParts[1]
      const fileName = pathParts.slice(2).join('/')
      
      // 提取 nodeId（查询参数）
      const nodeId = urlObj.searchParams.get('node-id') || undefined
      
      return {
        fileKey,
        nodeId,
        fileUrl: `https://www.figma.com/file/${fileKey}/${fileName}`,
        nodeName: nodeId ? undefined : fileName
      }
    } catch (error) {
      console.error('Failed to parse Figma URL:', error)
      return null
    }
  }

  /**
   * 生成 Figma 嵌入 URL
   * 使用 Embed Kit 2.0
   */
  generateEmbedUrl(link: FigmaLink, options?: {
    theme?: 'light' | 'dark' | 'system'
    embedHost?: string
  }): string {
    const { fileKey, nodeId } = link
    const params = new URLSearchParams()
    
    if (nodeId) {
      params.set('node-id', nodeId)
    }
    
    if (options?.theme) {
      params.set('theme', options.theme)
    }
    
    if (options?.embedHost) {
      params.set('embed-host', options.embedHost)
    }
    
    const queryString = params.toString()
    return `https://embed.figma.com/file/${fileKey}${queryString ? `?${queryString}` : ''}`
  }

  /**
   * 获取 Figma 节点信息（需要 API Token）
   */
  async getNodeInfo(fileKey: string, nodeId: string): Promise<any> {
    if (!this.apiToken) {
      throw new Error('Figma API Token 未设置')
    }

    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
      {
        headers: {
          'X-Figma-Token': this.apiToken
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Figma API 请求失败: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 获取 Figma 文件信息（需要 API Token）
   */
  async getFileInfo(fileKey: string): Promise<any> {
    if (!this.apiToken) {
      throw new Error('Figma API Token 未设置')
    }

    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}`,
      {
        headers: {
          'X-Figma-Token': this.apiToken
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Figma API 请求失败: ${response.statusText}`)
    }

    return response.json()
  }
}

export default new FigmaService()
```

---

## 3. UI 层

### 3.1 属性面板集成

在 `client/src/extensions/xflow/XFlowPropertiesProvider.ts` 中添加 Figma 关联属性组：

```typescript
// 在 getGroups 方法中添加
getGroups(element: BpmnElement): Group[] {
  const groups = [
    // ... 现有组
    this.createFigmaLinkGroup(element)
  ]
  return groups.filter(Boolean)
}

// 创建 Figma 关联组
private createFigmaLinkGroup(element: BpmnElement): Group {
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
          const figmaService = require('../../services/figmaService').default
          const link = figmaService.parseFigmaUrl(value)
          if (link) {
            this.setFigmaLink(element, link)
          }
        }
      },
      {
        id: 'figma-preview',
        label: '预览',
        type: 'button',
        action: (element: BpmnElement) => {
          const link = this.getFigmaLink(element)
          if (link) {
            const embedUrl = figmaService.generateEmbedUrl(link, {
              theme: 'light',
              embedHost: 'bpmn-explorer'
            })
            window.open(embedUrl, '_blank')
          }
        }
      }
    ]
  }
}

// 获取 Figma 关联
private getFigmaLink(element: BpmnElement): FigmaLink | null {
  const businessObject = getBusinessObject(element)
  const extensionElements = businessObject.extensionElements
  if (!extensionElements?.values) return null
  
  const figmaLink = extensionElements.values.find(
    (v: any) => v.$type === 'xflow:FigmaLink'
  )
  
  if (!figmaLink) return null
  
  return {
    fileKey: figmaLink.fileKey,
    nodeId: figmaLink.nodeId,
    fileUrl: figmaLink.fileUrl,
    nodeName: figmaLink.nodeName
  }
}

// 设置 Figma 关联
private setFigmaLink(element: BpmnElement, link: FigmaLink) {
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
      fileKey: link.fileKey,
      nodeId: link.nodeId || '',
      fileUrl: link.fileUrl,
      nodeName: link.nodeName || ''
    })
    figmaLink.$parent = extensionElements
    extensionElements.values.push(figmaLink)
  } else {
    figmaLink.fileKey = link.fileKey
    figmaLink.nodeId = link.nodeId || ''
    figmaLink.fileUrl = link.fileUrl
    figmaLink.nodeName = link.nodeName || ''
  }
  
  // 更新元素
  commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: businessObject,
    properties: { extensionElements }
  })
}
```

### 3.2 画布图标显示

创建 `client/src/extensions/figma/FigmaIconRenderer.ts`：

```typescript
/**
 * Figma 图标渲染器
 * 在关联了 Figma 的节点上显示图标
 */

import { BaseRenderer } from 'diagram-js/lib/draw/BaseRenderer'
import { is } from 'bpmn-js/lib/util/ModelUtil'

export default class FigmaIconRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnRenderer']

  constructor(eventBus: any, bpmnRenderer: any) {
    super(eventBus, 1500) // 高优先级，在其他渲染器之后

    this.bpmnRenderer = bpmnRenderer
  }

  canRender(element: any): boolean {
    return is(element, 'bpmn:FlowNode') && this.hasFigmaLink(element)
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    // 先渲染基础形状
    const shape = this.bpmnRenderer.drawShape(parentNode, element)
    
    // 添加 Figma 图标
    const figmaIcon = this.createFigmaIcon(element)
    if (figmaIcon) {
      parentNode.appendChild(figmaIcon)
    }
    
    return shape
  }

  private hasFigmaLink(element: any): boolean {
    const businessObject = element.businessObject
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

    // 创建图标组
    const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    iconGroup.setAttribute('class', 'figma-icon-group')
    iconGroup.setAttribute('transform', `translate(${bounds.width - iconSize - iconPadding}, ${iconPadding})`)

    // 创建图标背景（圆形）
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', iconSize / 2)
    circle.setAttribute('cy', iconSize / 2)
    circle.setAttribute('r', iconSize / 2)
    circle.setAttribute('fill', '#0ACF83') // Figma 绿色
    circle.setAttribute('stroke', '#fff')
    circle.setAttribute('stroke-width', '1')
    circle.setAttribute('cursor', 'pointer')
    circle.setAttribute('title', '查看 Figma 设计稿')
    
    // 点击事件
    circle.addEventListener('click', (e) => {
      e.stopPropagation()
      this.openFigmaLink(element)
    })

    // 创建 Figma "F" 图标（简化版）
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
    const businessObject = element.businessObject
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

    // 在新窗口打开
    window.open(embedUrl, '_blank', 'width=1200,height=800')
  }
}
```

### 3.3 注册扩展模块

创建 `client/src/extensions/figma/FigmaExtensionModule.ts`：

```typescript
import FigmaIconRenderer from './FigmaIconRenderer'

export default {
  __init__: ['figmaIconRenderer'],
  figmaIconRenderer: ['type', FigmaIconRenderer]
}
```

在 `client/src/components/BpmnEditor.vue` 中注册：

```typescript
import FigmaExtensionModule from '../extensions/figma/FigmaExtensionModule'

// 在创建 modeler 时添加
const modeler = new BpmnModeler({
  container: container.value,
  additionalModules: [
    // ... 现有模块
    FigmaExtensionModule
  ]
})
```

---

## 4. 实现步骤

### 阶段 1: 基础数据结构（1-2 天）

1. ✅ 扩展 `xflowExtension.json`，添加 `FigmaLink` 类型
2. ✅ 创建 `figmaService.ts`，实现 URL 解析和嵌入链接生成
3. ✅ 测试数据存储和读取

### 阶段 2: 属性面板集成（2-3 天）

1. ✅ 在 `XFlowPropertiesProvider.ts` 中添加 Figma 属性组
2. ✅ 实现 `getFigmaLink` 和 `setFigmaLink` 方法
3. ✅ 测试属性面板中的 Figma 链接输入和预览

### 阶段 3: 画布图标显示（2-3 天）

1. ✅ 创建 `FigmaIconRenderer.ts`
2. ✅ 实现图标渲染和点击事件
3. ✅ 注册扩展模块
4. ✅ 测试图标显示和交互

### 阶段 4: 高级功能（可选，3-5 天）

1. ⬜ Figma API 集成（获取节点信息、预览图等）
2. ⬜ 内嵌 Figma 查看器（使用 iframe）
3. ⬜ 批量关联功能
4. ⬜ Figma 设计稿同步（检测变更）

---

## 5. 使用示例

### 5.1 关联 Figma 设计稿

1. 在编辑器中选中节点
2. 在右侧属性面板找到 "Figma 设计稿" 组
3. 在 "Figma 链接" 输入框中粘贴 Figma URL：
   ```
   https://www.figma.com/file/BAZsTPbh6W1r66Bdo/Login-Design?node-id=0-1
   ```
4. 系统自动解析并保存关联信息

### 5.2 查看设计稿

- **方式 1**: 点击节点右上角的 Figma 图标（绿色圆形，带 "F"）
- **方式 2**: 在属性面板点击 "预览" 按钮

两种方式都会在新窗口打开 Figma 嵌入页面。

---

## 6. 配置说明

### 6.1 Figma API Token（可选）

如果需要使用 Figma API 获取详细信息，需要配置 Token：

1. 在 Figma 设置中生成 Personal Access Token
2. 在 `.env` 文件中添加：
   ```
   VITE_FIGMA_API_TOKEN=your_token_here
   ```
3. 在应用初始化时设置：
   ```typescript
   import figmaService from './services/figmaService'
   figmaService.setApiToken(import.meta.env.VITE_FIGMA_API_TOKEN)
   ```

### 6.2 嵌入配置

可以在 `figmaService.ts` 中自定义嵌入参数：
- `theme`: 主题（light/dark/system）
- `embedHost`: 应用标识

---

## 7. 注意事项

1. **权限**: 确保 Figma 文件设置为可查看（Public 或已分享给相关用户）
2. **URL 格式**: 支持标准 Figma URL 格式，自动解析 fileKey 和 nodeId
3. **数据持久化**: Figma 关联信息保存在 BPMN XML 中，随流程图一起保存
4. **性能**: 图标渲染使用事件委托，避免影响编辑器性能
5. **兼容性**: 支持所有 BPMN 节点类型（Task、Gateway、Event 等）

---

## 8. 扩展建议

### 8.1 设计稿预览缩略图

- 使用 Figma API 获取节点截图
- 在属性面板显示缩略图
- 点击缩略图打开完整设计稿

### 8.2 双向同步

- 检测 Figma 设计稿变更
- 在 BPMN 编辑器中显示变更提示
- 支持更新关联信息

### 8.3 批量操作

- 批量关联多个节点
- 导出关联信息（CSV/JSON）
- 导入关联信息

---

## 9. 参考资源

- [Figma API 文档](https://www.figma.com/developers/api)
- [Figma Embed Kit 2.0](https://www.figma.com/developers/embed)
- [BPMN.js 扩展开发](https://github.com/bpmn-io/bpmn-js)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-11  
**维护者**: Claude Code
