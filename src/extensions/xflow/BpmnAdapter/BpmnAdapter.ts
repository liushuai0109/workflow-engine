/**
 * XPMN 适配器
 * 用于在 XPMN 格式（无前缀）和 XPMN 格式（带 bpmn: 或 xflow: 前缀）之间进行转换
 */

import elementMapping from './elementMapping.json'
import xmlFormatter from 'xml-formatter'

export const formatOptions = {
  indentation: '  ',
  filter: (node: any) => node.type !== 'Comment',
  collapseContent: true,
  lineSeparator: '\n'
}

// XPMN 命名空间
const BPMN_NS = 'http://www.omg.org/spec/XPMN/20100524/MODEL'
const XFLOW_NS = 'http://example.com/bpmn/xflow-extension'

// 反向映射：从 XPMN 元素名（带前缀）映射到 XPMN 元素名
const reverseMapping: Record<string, string> = {}
Object.entries(elementMapping.elements).forEach(([xpmnName, bpmnName]) => {
  if (bpmnName) {
    // 优先使用第一个映射（如果同一个 bpmnName 对应多个 xpmnName，后面的会覆盖前面的）
    // 对于 documentation，我们优先使用 documentation 而不是 document
    if (!reverseMapping[bpmnName] || (bpmnName === 'bpmn:documentation' && xpmnName === 'documentation')) {
    reverseMapping[bpmnName] = xpmnName
    }
    // 也支持不带前缀的版本（用于处理已转换的元素）
    const nameWithoutPrefix = bpmnName.split(':')[1] || bpmnName
    if (!reverseMapping[nameWithoutPrefix] || (nameWithoutPrefix === 'documentation' && xpmnName === 'documentation')) {
    reverseMapping[nameWithoutPrefix] = xpmnName
    }
  }
})

// 反向属性映射：从 XPMN 属性名映射到 XPMN 属性名
const reverseAttributeMapping: Record<string, string> = {}
Object.entries(elementMapping.attributes).forEach(([xpmnAttr, bpmnAttr]) => {
  if (bpmnAttr) {
    reverseAttributeMapping[bpmnAttr] = xpmnAttr
  }
})

/**
 * 从 XPMN 格式转换为 XPMN 格式
 * - 将元素名转换为带 bpmn: 或 xflow: 前缀
 * - 将 xflow: 前缀的元素放在 bpmn:extensionElements 下
 * - 将 xpmndi:BPMNDiagram 及其子元素中的 xpmn 关键字恢复为 bpmn
 */
export function convertFromXPMNToBPMN(xml: string): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    
    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Invalid XML format: ' + (parseError as any).innerText)
    }

    // 转换根元素 definitions
    const definitionsElement = doc.documentElement || (doc.querySelector && doc.querySelector('definitions'))
    if (definitionsElement && (definitionsElement.localName === 'definitions' || definitionsElement.tagName === 'definitions')) {
      const convertedDefinitions = convertXPMNDefinitionsToBPMN(definitionsElement, doc)
      
      // 直接序列化转换后的元素
      // 这样可以避免文档结构问题，同时确保所有属性都被正确序列化
      const serializer = new XMLSerializer()
      let result = serializer.serializeToString(convertedDefinitions)
    
    // 修复命名空间别名问题：将自动生成的 ns1:, ns2: 等替换为正确的 bpmn:, xflow: 等前缀
    // 这是因为 createElementNS 会忽略前缀，自动分配别名
    result = fixNamespaceAliases(result)
    
      // 从映射文件中动态获取所有带前缀的元素，用于后续处理
      const prefixToNamespace: Record<string, string> = {
        'bpmndi': 'http://www.omg.org/spec/XPMN/20100524/DI',
        'dc': 'http://www.omg.org/spec/DD/20100524/DC',
        'di': 'http://www.omg.org/spec/DD/20100524/DI',
        'xflow': XFLOW_NS,
        'bpmn': BPMN_NS
      }
      
      // 收集所有带前缀的元素映射
      const prefixedElements: Array<{ prefix: string, localName: string, bpmnName: string, namespace: string }> = []
      Object.entries(elementMapping.elements).forEach(([xpmnName, bpmnName]) => {
        if (bpmnName && bpmnName.includes(':')) {
          const [prefix, localName] = bpmnName.split(':')
          const namespace = prefixToNamespace[prefix]
          if (namespace) {
            prefixedElements.push({ prefix, localName, bpmnName, namespace })
          }
        }
      })
      
      // 移除子元素上的 xmlns 属性（从映射文件中动态获取）
      // 这些命名空间声明应该在根元素上，而不是在子元素上
      // 注意：只移除子元素上的，保留根元素上的
      prefixedElements.forEach(({ prefix, localName }) => {
        // 移除 xmlns:prefix 属性
        const regex = new RegExp(`(<[^>]*${prefix}:${localName}[^>]*)\\s+xmlns:${prefix}="[^"]*"([^>]*>)`, 'g')
        result = result.replace(regex, '$1$2')
      })
      
      // 移除所有带命名空间的元素上的 xmlns 属性（包括默认命名空间）
      result = result.replace(/(<[^>]*)\s+xmlns="[^"]*"([^>]*>)/g, (match, before, after) => {
        // 如果是在根元素上，保留 xmlns
        if (before.includes('bpmn:definitions') || before.includes('definitions')) {
          return match
        }
        return before + after
      })
      
      // 移除所有带前缀的元素上的 xmlns:prefix 属性
      result = result.replace(/(<[^>]*)\s+xmlns:[^=]+="[^"]*"([^>]*>)/g, (match, before, after) => {
        // 如果是在根元素上，保留 xmlns
        if (before.includes('bpmn:definitions') || before.includes('definitions')) {
          return match
        }
        return before + after
      })
      
      // 修复默认命名空间的元素：将默认命名空间改为带前缀的形式（从映射文件中动态获取）
      prefixedElements.forEach(({ prefix, localName, bpmnName, namespace }) => {
        // 只处理 Diagram 相关的元素（bpmndi:, dc:, di:）
        if (prefix === 'bpmndi' || prefix === 'dc' || prefix === 'di') {
          const escapedNamespace = namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`<${localName}([^>]*)\\s+xmlns="${escapedNamespace}"([^>]*)>`, 'g')
          result = result.replace(regex, `<${bpmnName}$1$2>`)
          result = result.replace(new RegExp(`</${localName}>`, 'g'), `</${bpmnName}>`)
        }
      })
      
      // 将 Diagram 元素中的 xpmndi: 前缀还原为 bpmndi:（如果存在）
      result = result.replace(/xpmndi:/g, 'bpmndi:')
      
      // 修复没有前缀的元素：添加正确的前缀（从映射文件中动态获取）
      prefixedElements.forEach(({ prefix, localName, bpmnName }) => {
        // 只处理 Diagram 相关的元素（bpmndi:, dc:, di:）
        if (prefix === 'bpmndi' || prefix === 'dc' || prefix === 'di') {
          const regexOpen = new RegExp(`<${localName}([^>]*)>`, 'g')
          const regexClose = new RegExp(`</${localName}>`, 'g')
          result = result.replace(regexOpen, `<${bpmnName}$1>`)
          result = result.replace(regexClose, `</${bpmnName}>`)
        }
      })
      
      // 确保根元素上有必要的命名空间声明，且不重复添加
      const requiredNamespaces: Record<string, string> = {
        'xmlns:bpmn': BPMN_NS,
        'xmlns:xflow': XFLOW_NS,
        'xmlns:bpmndi': 'http://www.omg.org/spec/XPMN/20100524/DI',
        'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
        'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI'
      }
      
      // 查找根元素（bpmn:definitions）
      const rootMatch = result.match(/<bpmn:definitions([^>]*)>/)
      if (rootMatch) {
        let rootAttrs = rootMatch[1]
        const existingAttrs: Record<string, string> = {}
        
        // 解析现有属性（支持属性值中可能包含空格的情况）
        const attrMatches = rootAttrs.matchAll(/(\S+)="([^"]*)"/g)
        for (const match of attrMatches) {
          existingAttrs[match[1]] = match[2]
        }
        
        // 也检查可能存在的 xmlns:xsi 等属性
        const xsiMatch = rootAttrs.match(/xmlns:xsi="([^"]*)"/)
        if (xsiMatch) {
          existingAttrs['xmlns:xsi'] = xsiMatch[1]
        }
        
        // 构建命名空间属性字符串（按顺序）
        const namespaceAttrs: string[] = []
        Object.entries(requiredNamespaces).forEach(([attrName, attrValue]) => {
          // 如果不存在或值不同，添加或更新
          if (!existingAttrs[attrName] || existingAttrs[attrName] !== attrValue) {
            namespaceAttrs.push(`${attrName}="${attrValue}"`)
            existingAttrs[attrName] = attrValue
          }
        })
        
        // 移除现有的命名空间属性，然后重新添加（确保顺序）
        let otherAttrs = rootAttrs
        Object.keys(requiredNamespaces).forEach(attrName => {
          const escapedAttrName = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`\\s*${escapedAttrName}="[^"]*"`, 'g')
          otherAttrs = otherAttrs.replace(regex, '')
        })
        
        // 确保 targetNamespace 属性存在
        if (!existingAttrs['targetNamespace']) {
          existingAttrs['targetNamespace'] = 'http://bpmn.io/schema/bpmn'
        }
        
        // 从 otherAttrs 中移除 targetNamespace 和 xmlns:xsi（如果存在），因为我们已经单独处理了
        const otherAttrsWithoutSpecial = otherAttrs.trim()
          .replace(/\s*targetNamespace="[^"]*"/g, '')
          .replace(/\s*xmlns:xsi="[^"]*"/g, '')
          .trim()
        
        // 重新组合属性：先 xmlns:xsi，再命名空间（xmlns:*），再其他属性（id等），最后 targetNamespace
        const xsiAttr = existingAttrs['xmlns:xsi'] ? ` xmlns:xsi="${existingAttrs['xmlns:xsi']}"` : ''
        const namespaceStr = namespaceAttrs.length > 0 ? ' ' + namespaceAttrs.join(' ') : ''
        const targetNamespaceAttr = existingAttrs['targetNamespace'] ? ` targetNamespace="${existingAttrs['targetNamespace']}"` : ''
        const finalAttrs = xsiAttr + namespaceStr + (otherAttrsWithoutSpecial ? ' ' + otherAttrsWithoutSpecial : '') + targetNamespaceAttr
        
        // 替换根元素
        result = result.replace(/<bpmn:definitions[^>]*>/, `<bpmn:definitions${finalAttrs}>`)
      }
      
      // 格式化输出（formatXML 会自动添加 XML 声明）
      return formatXML(result)
    }

    // 如果没有找到 definitions 元素，返回原始 XML
    let result = new XMLSerializer().serializeToString(doc)
    result = fixNamespaceAliases(result)
    return formatXML(result)
  } catch (error) {
    console.error('Error converting from XPMN to XPMN:', error)
    throw error
  }
}

/**
 * 修复命名空间别名：将自动生成的 ns1:, ns2: 等替换为正确的 bpmn:, xflow: 等前缀
 */
function fixNamespaceAliases(xml: string): string {
  // 确定每个命名空间 URI 应该使用的前缀
  const uriToPrefix: Record<string, string> = {
    'http://www.omg.org/spec/XPMN/20100524/MODEL': 'bpmn',
    'http://example.com/bpmn/xflow-extension': 'xflow',
    'http://www.omg.org/spec/XPMN/20100524/DI': 'bpmndi',
    'http://www.omg.org/spec/DD/20100524/DC': 'dc',
    'http://www.omg.org/spec/DD/20100524/DI': 'di',
    'http://www.w3.org/2001/XMLSchema-instance': 'xsi'
  }
  
  // 匹配命名空间声明，找出 ns1, ns2 等别名对应的命名空间 URI
  const namespaceMap: Record<string, string> = {}
  const nsPattern = /xmlns:(ns\d+)="([^"]+)"/g
  let match
  
  while ((match = nsPattern.exec(xml)) !== null) {
    const alias = match[1]
    const uri = match[2]
    if (alias && uri) {
      namespaceMap[alias] = uri
    }
  }
  
  // 如果没有找到任何 ns 别名，直接返回
  if (Object.keys(namespaceMap).length === 0) {
    return xml
  }
  
  // 替换命名空间别名
  let result = xml
  
  // 首先替换元素和属性中的别名
  for (const [alias, uri] of Object.entries(namespaceMap)) {
    const prefix = uriToPrefix[uri]
    if (prefix) {
      // 替换开始标签中的 ns1: 为 prefix:
      result = result.replace(new RegExp(`<${alias}:`, 'g'), `<${prefix}:`)
      // 替换结束标签中的 ns1: 为 prefix:
      result = result.replace(new RegExp(`</${alias}:`, 'g'), `</${prefix}:`)
      // 替换属性名中的 ns1: 为 prefix:（注意空格）
      result = result.replace(new RegExp(`\\s${alias}:`, 'g'), ` ${prefix}:`)
    }
  }
  
  // 然后处理命名空间声明
  // 删除所有 xmlns:ns\d+ 声明（因为我们已经用正确的前缀替换了元素）
  result = result.replace(/xmlns:ns\d+="[^"]*"\s*/g, '')
  
  // 确保根元素上有正确的命名空间声明（如果缺失）
  const rootMatch = result.match(/<(\w+):definitions/)
  if (rootMatch) {
    const rootPrefix = rootMatch[1]
    // 检查是否已经有 xmlns:bpmn 声明
    if (!result.includes('xmlns:bpmn=') && rootPrefix === 'bpmn') {
      // 在根元素开始标签后添加命名空间声明
      result = result.replace(
        /<bpmn:definitions\s+/,
        '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/XPMN/20100524/MODEL" '
      )
    }
  }
  
  return result
}

/**
 * 对 process 的子元素进行排序，确保被引用的元素在引用它们的元素之前
 * 这对于 XPMN 规范很重要：被引用的元素必须在引用它们的元素之前定义
 */
function sortProcessChildren(processElement: Element): void {
  // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
  const childNodes = processElement.childNodes || []
  const children: Element[] = []
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i]
    if (node.nodeType === 1) {
      children.push(node as Element)
    }
  }
  if (children.length === 0) return
  
  // 收集所有元素的 ID
  const elementIds = new Set<string>()
  children.forEach(child => {
    const id = child.getAttribute('id')
    if (id) {
      elementIds.add(id)
    }
  })
  
  // 识别引用关系：哪些元素引用了哪些元素
  const dependencies = new Map<string, Set<string>>() // elementId -> Set of referenced elementIds
  
  children.forEach(child => {
    const childId = child.getAttribute('id')
    if (!childId) return
    
    const refs = new Set<string>()
    
    // 检查 sourceRef 和 targetRef（sequenceFlow）
    const sourceRef = child.getAttribute('sourceRef')
    const targetRef = child.getAttribute('targetRef')
    if (sourceRef && elementIds.has(sourceRef)) {
      refs.add(sourceRef)
    }
    if (targetRef && elementIds.has(targetRef)) {
      refs.add(targetRef)
    }
    
    // 检查 attachedToRef（boundaryEvent）
    const attachedToRef = child.getAttribute('attachedToRef')
    if (attachedToRef && elementIds.has(attachedToRef)) {
      refs.add(attachedToRef)
    }
    
    // 检查 incoming 和 outgoing 子元素（这些子元素引用 sequenceFlow）
    const childChildNodes = child.childNodes || []
    for (let i = 0; i < childChildNodes.length; i++) {
      const node = childChildNodes[i]
      if (node && node.nodeType === 1) {
        const subChild = node as Element
        const subChildLocalName = subChild.localName || subChild.tagName.split(':').pop() || subChild.tagName
        if (subChildLocalName === 'incoming' || subChildLocalName === 'outgoing') {
          const flowRef = subChild.textContent?.trim()
          if (flowRef && elementIds.has(flowRef)) {
            // incoming/outgoing 引用的是 sequenceFlow，所以当前元素依赖于 sequenceFlow
            refs.add(flowRef)
          }
        }
      }
    }
    
    if (refs.size > 0) {
      dependencies.set(childId, refs)
    }
  })
  
  // 拓扑排序：被引用的元素排在前面
  const sorted: Element[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  
  function visit(elementId: string | null): void {
    if (!elementId || visited.has(elementId) || visiting.has(elementId)) return
    
    visiting.add(elementId)
    
    // 先访问依赖的元素
    const deps = dependencies.get(elementId)
    if (deps) {
      deps.forEach(depId => visit(depId))
    }
    
    visiting.delete(elementId)
    visited.add(elementId)
    
    // 找到对应的元素并添加到排序列表
    const element = children.find(child => child.getAttribute('id') === elementId)
    if (element && !sorted.includes(element)) {
      sorted.push(element)
    }
  }
  
  // 对每个元素进行访问
  children.forEach(child => {
    const id = child.getAttribute('id')
    if (id) {
      visit(id)
    } else {
      // 没有 ID 的元素（如 extensionElements）直接添加
      if (!sorted.includes(child)) {
        sorted.push(child)
      }
    }
  })
  
  // 确保所有元素都被包含在 sorted 中
  // 如果某些元素没有被访问到（比如没有依赖关系的独立元素），确保它们也被添加
  children.forEach(child => {
    if (!sorted.includes(child)) {
      sorted.push(child)
    }
  })
  
  // 将排序后的元素重新添加到 process
  // 先移除所有子元素
  while (processElement.firstChild) {
    processElement.removeChild(processElement.firstChild)
  }
  
  // 按排序后的顺序添加
  sorted.forEach(child => {
    processElement.appendChild(child)
  })
}

/**
 * 转义 XML 属性值中的特殊字符
 */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 格式化 XML 字符串
 * 使用 xml-formatter 库进行格式化
 */
function formatXML(xml: string): string {
  try {
    // 如果 xml 不包含 XML 声明，添加一个以便正确解析
    let xmlToParse = xml.trim()
    if (!xmlToParse.startsWith('<?xml')) {
      xmlToParse = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlToParse
      }
      
    // 使用 xml-formatter 进行格式化
    const formatted = xmlFormatter(xmlToParse, formatOptions)
    
    return formatted
  } catch (error) {
    console.warn('XML formatting failed, returning original:', error)
    return xml
  }
}

/**
 * 从 XPMN 格式转换为 XPMN 格式
 * - 从根元素 bpmn:definitions 开始转换
 * - 将 bpmn:process 及其子元素转换为无前缀
 * - 删除 bpmn:extensionElements 容器，直接使用扩展元素
 * - 将 bpmndi:BPMNDiagram 及其子元素中的 bpmn 关键字改为 xpmn
 */
export function convertFromBPMNToXPMN(xml: string): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    
    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Invalid XML format')
    }

    // 转换根元素 definitions
    // 尝试多种方式查找 definitions 元素
    let definitionsElement = doc.documentElement
    
    // 如果 documentElement 不是 definitions，尝试查找
    if (!definitionsElement || (definitionsElement.localName !== 'definitions' && !definitionsElement.tagName.includes('definitions'))) {
      definitionsElement = doc.querySelector('bpmn\\:definitions') || 
                          (doc.getElementsByTagName && doc.getElementsByTagName('definitions')[0]) ||
                          null
      
      // 如果通过 querySelector 找不到，尝试通过命名空间查找
      if (!definitionsElement || (definitionsElement.tagName && !definitionsElement.tagName.includes('definitions'))) {
        const allElements = doc.getElementsByTagName('*')
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i]
          if (el.localName === 'definitions' || el.tagName.includes('definitions')) {
            definitionsElement = el
            break
          }
        }
      }
    }
    
    if (definitionsElement && (definitionsElement.localName === 'definitions' || definitionsElement.tagName.includes('definitions'))) {
      const convertedDefinitions = convertBPMNDefinitionsToXPMN(definitionsElement, doc)
      
      // 直接序列化转换后的元素，而不是替换文档中的元素
      // 这样可以避免文档结构问题
      const serializer = new XMLSerializer()
      let result = serializer.serializeToString(convertedDefinitions)
      
      // 将 Diagram 元素中的 bpmndi: 前缀替换为 xpmndi:
      result = result.replace(/bpmndi:/g, 'xpmndi:')
      
      // 移除根元素上的命名空间声明和 targetNamespace 属性（XPMN 格式不需要这些）
      const attributesToRemove = [
        'xmlns:bpmn',
        'xmlns:xflow',
        'xmlns:bpmndi',
        'xmlns:dc',
        'xmlns:di',
        'targetNamespace'
      ]
      
      // 查找根元素（definitions）
      const rootMatch = result.match(/<definitions([^>]*)>/)
      if (rootMatch) {
        let rootAttrs = rootMatch[1]
        
        // 移除指定的属性
        attributesToRemove.forEach(attrName => {
          const escapedAttrName = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`\\s*${escapedAttrName}="[^"]*"`, 'g')
          rootAttrs = rootAttrs.replace(regex, '')
        })
        
        // 替换根元素
        result = result.replace(/<definitions[^>]*>/, `<definitions${rootAttrs}>`)
      }
      
      // 移除 dc:Bounds 和 di:waypoint 元素上的 xmlns:dc、xmlns:di 和默认 xmlns 属性
      // 这些命名空间声明应该在根元素上，而不是在子元素上
      // 注意：只移除子元素上的，保留根元素上的
      result = result.replace(/(<[^>]*dc:Bounds[^>]*)\s+xmlns:dc="[^"]*"([^>]*>)/g, '$1$2')
      result = result.replace(/(<[^>]*di:waypoint[^>]*)\s+xmlns:di="[^"]*"([^>]*>)/g, '$1$2')
      // 修复 Bounds 和 waypoint 元素：将默认命名空间改为带前缀的形式
      // <Bounds ... xmlns="http://www.omg.org/spec/DD/20100524/DC"/> -> <dc:Bounds ... />
      result = result.replace(/<Bounds([^>]*)\s+xmlns="http:\/\/www\.omg\.org\/spec\/DD\/20100524\/DC"([^>]*)>/g, '<dc:Bounds$1$2>')
      result = result.replace(/<\/Bounds>/g, '</dc:Bounds>')
      result = result.replace(/<waypoint([^>]*)\s+xmlns="http:\/\/www\.omg\.org\/spec\/DD\/20100524\/DI"([^>]*)>/g, '<di:waypoint$1$2>')
      result = result.replace(/<\/waypoint>/g, '</di:waypoint>')
      
      // 格式化输出（formatXML 会自动添加 XML 声明）
      return formatXML(result)
      }

    // 如果没有找到 definitions 元素，返回原始 XML
    const result = new XMLSerializer().serializeToString(doc)
    return formatXML(result)
  } catch (error) {
    console.error('Error converting from XPMN to XPMN:', error)
    throw error
  }
}

/**
 * 转换 definitions 元素从 XPMN 到 XPMN
 * 所有子元素都通过 elementMapping.json 的映射关系统一处理
 */
function convertXPMNDefinitionsToBPMN(element: Element, doc: Document): Element {
  // 创建 bpmn:definitions 元素
  const definitions = doc.createElementNS(BPMN_NS, 'bpmn:definitions')
  
  // 复制所有属性
  if (element.attributes) {
  Array.from(element.attributes).forEach(attr => {
    definitions.setAttribute(attr.name, attr.value)
  })
  }
  
  // 确保 definitions 元素有 id 属性
  if (!definitions.getAttribute('id')) {
    const originalId = element.getAttribute('id')
    if (originalId) {
      definitions.setAttribute('id', originalId)
    } else {
      // 如果没有 id，生成一个
      definitions.setAttribute('id', 'Definitions_' + Date.now())
    }
  }
  
  // 处理子元素 - 统一使用映射关系处理，不硬编码特定元素
  // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
  const childNodes = element.childNodes || []
  const stateMachines: Element[] = []
  const convertedElements: Element[] = []
  const diagramElements: Element[] = []
  
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i]
    // 只处理元素节点（nodeType === 1）
    if (node.nodeType === 1) {
      const child = node as Element
    const childLocalName = child.localName || child.tagName.split(':').pop() || child.tagName
    const childTagName = child.tagName
    
    // XPMNDiagram 需要特殊处理（将 xpmn 关键字恢复为 bpmn，这是 DI 命名空间的特殊处理）
      // XPMN 格式中 Diagram 元素没有前缀
      if (childLocalName === 'XPMNDiagram' || childTagName.startsWith('xpmndi:XPMNDiagram') || childTagName === 'XPMNDiagram') {
      const convertedDiagram = convertXPMNDiagramToBPMN(child, doc)
        diagramElements.push(convertedDiagram)
        // 先不添加，等 extensionElements 添加后再添加
      } else if (childLocalName === 'stateMachine') {
        // stateMachine 需要特殊处理：包装到 extensionElements 下作为 xflow:stateMachine
        const convertedStateMachine = convertXPMNElementTreeToBPMN(child, doc)
        stateMachines.push(convertedStateMachine)
    } else {
      // 所有其他子元素（process, message 等）统一通过 elementMapping.json 映射处理
      // convertElementTreeToBPMN 会查找 elementMapping 来转换元素名
      const convertedChild = convertXPMNElementTreeToBPMN(child, doc)
      
        // 保持原始元素顺序，不进行排序
        // 如果需要排序，可以取消下面的注释
        // if (childLocalName === 'process') {
        //   sortProcessChildren(convertedChild)
        // }
      
        convertedElements.push(convertedChild)
      }
    }
  }
  
  // 按顺序添加元素：message, process, extensionElements (包含 stateMachine), diagram
  convertedElements.forEach(el => {
    definitions.appendChild(el)
    // 如果是 process，在其后插入 extensionElements (包含 stateMachine)
    const elLocalName = el.localName || el.tagName.split(':').pop() || el.tagName
    if (elLocalName === 'process') {
      if (stateMachines.length > 0) {
        const extensionElements = doc.createElementNS(BPMN_NS, 'bpmn:extensionElements')
        stateMachines.forEach(stateMachine => {
          extensionElements.appendChild(stateMachine)
        })
        definitions.appendChild(extensionElements)
      }
    }
  })
  
  // 如果 process 不在 convertedElements 中，直接添加 extensionElements
  const hasProcess = convertedElements.some(el => {
    const elLocalName = el.localName || el.tagName.split(':').pop() || el.tagName
    return elLocalName === 'process'
  })
  if (!hasProcess && stateMachines.length > 0) {
    const extensionElements = doc.createElementNS(BPMN_NS, 'bpmn:extensionElements')
    stateMachines.forEach(stateMachine => {
      extensionElements.appendChild(stateMachine)
    })
    definitions.appendChild(extensionElements)
  }
  
  // 最后添加所有 diagram 元素
  diagramElements.forEach(diagramElement => {
    definitions.appendChild(diagramElement)
  })
  
  return definitions
}

/**
 * 转换 definitions 元素从 XPMN 到 XPMN
 * 对于 definitions 元素本身，只需要去掉 bpmn: 前缀即可
 * 所有子元素都通过 elementMapping.json 的映射关系统一处理
 */
function convertBPMNDefinitionsToXPMN(element: Element, doc: Document): Element {
  // 创建 definitions 元素（无前缀）- 这就是简单的去掉 bpmn: 前缀
  const definitions = doc.createElement('definitions')
  
  // 需要移除的属性（XPMN 格式不需要这些）
  const attributesToRemove = [
    'xmlns:bpmn',
    'xmlns:xflow',
    'xmlns:bpmndi',
    'xmlns:dc',
    'xmlns:di',
    'targetNamespace'
  ]
  
  // 复制所有属性，但排除指定的属性
  Array.from(element.attributes).forEach(attr => {
    if (!attributesToRemove.includes(attr.name)) {
    definitions.setAttribute(attr.name, attr.value)
    }
  })
  
  // 处理子元素 - 统一使用映射关系处理，不硬编码特定元素
  // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
  const childNodes = element.childNodes || []
  const stateMachines: Element[] = []
  const convertedElements: Element[] = []
  const diagramElements: Element[] = []
  
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i]
    // 只处理元素节点（nodeType === 1）
    if (node.nodeType === 1) {
      const child = node as Element
      const childTagName = child.tagName
      const childLocalName = child.localName || child.tagName.split(':').pop() || child.tagName
      
    // BPMNDiagram 需要特殊处理（将 bpmn 关键字改为 xpmn，这是 DI 命名空间的特殊处理）
      if (childTagName === 'bpmndi:BPMNDiagram' || childTagName.startsWith('bpmndi:BPMNDiagram')) {
        const convertedDiagram = convertBPMNDiagramToXPMN(child, doc)
        diagramElements.push(convertedDiagram)
        // 先不添加，等 stateMachine 添加后再添加
      } else if (childTagName === 'bpmn:extensionElements' || (child.namespaceURI === BPMN_NS && childLocalName === 'extensionElements')) {
        // 处理 definitions 下的 extensionElements：提取 stateMachine
        const extChildNodes = child.childNodes || []
        for (let j = 0; j < extChildNodes.length; j++) {
          const extNode = extChildNodes[j]
          if (extNode.nodeType === 1) {
            const extChild = extNode as Element
            const extChildLocalName = extChild.localName || extChild.tagName.split(':').pop() || extChild.tagName
            const extChildTagName = extChild.tagName
            
            // 如果是 stateMachine，提取出来放到 definitions 下
            if (extChildTagName === 'xflow:stateMachine' || (extChild.namespaceURI === XFLOW_NS && extChildLocalName === 'stateMachine')) {
              const convertedStateMachine = convertElementTreeToXPMN(extChild, doc)
              stateMachines.push(convertedStateMachine)
            }
          }
        }
        // 跳过这个 extensionElements，不添加到 definitions
    } else {
      // 所有其他子元素（process, message 等）统一通过 elementMapping.json 映射处理
      // convertElementTreeToXPMN 会查找 reverseMapping 来转换元素名
      const convertedChild = convertElementTreeToXPMN(child, doc)
        convertedElements.push(convertedChild)
      }
    }
  }
  
  // 按顺序添加元素：message, process, stateMachine, diagram
  convertedElements.forEach(el => {
    definitions.appendChild(el)
    // 如果是 process，在其后插入 stateMachine
    const elLocalName = el.localName || el.tagName.split(':').pop() || el.tagName
    if (elLocalName === 'process') {
      stateMachines.forEach(stateMachine => {
        definitions.appendChild(stateMachine)
      })
    }
  })
  
  // 如果 process 不在 convertedElements 中，直接添加 stateMachine
  const hasProcess = convertedElements.some(el => {
    const elLocalName = el.localName || el.tagName.split(':').pop() || el.tagName
    return elLocalName === 'process'
  })
  if (!hasProcess) {
    stateMachines.forEach(stateMachine => {
      definitions.appendChild(stateMachine)
    })
  }
  
  // 最后添加所有 diagram 元素
  diagramElements.forEach(diagramElement => {
    definitions.appendChild(diagramElement)
  })
  
  return definitions
}

/**
 * 转换 XPMNDiagram 元素从 XPMN 到 XPMN（将 xpmn 恢复为 bpmn）
 */
function convertXPMNDiagramToBPMN(element: Element, doc: Document): Element {
  // 使用映射文件获取元素名（从 XPMNDiagram -> bpmndi:BPMNDiagram）
  const xpmnName = element.localName || element.tagName.split(':').pop() || element.tagName
  const bpmnName = elementMapping.elements[xpmnName as keyof typeof elementMapping.elements]
  
  let diagram: Element
  if (!bpmnName) {
    // 如果没有映射，使用字符串替换作为后备
  const tagName = element.tagName
    .replace(/xpmn/g, 'bpmn')
    .replace(/XPMN/g, 'XPMN')
    diagram = doc.createElementNS('http://www.omg.org/spec/XPMN/20100524/DI', tagName)
  } else {
    // 解析前缀和本地名（例如：bpmndi:BPMNDiagram -> prefix: bpmndi, localName: BPMNDiagram）
    const [prefix, localName] = bpmnName.includes(':') 
      ? bpmnName.split(':') 
      : [null, bpmnName]
    
    // 根据前缀确定命名空间
    let namespace: string
    if (prefix === 'bpmndi') {
      namespace = 'http://www.omg.org/spec/XPMN/20100524/DI'
    } else if (prefix === 'dc') {
      namespace = 'http://www.omg.org/spec/DD/20100524/DC'
    } else if (prefix === 'di') {
      namespace = 'http://www.omg.org/spec/DD/20100524/DI'
    } else {
      namespace = 'http://www.omg.org/spec/XPMN/20100524/DI'
    }
    
    // 使用 createElementNS 创建元素，但使用本地名（不包含前缀）
    // 序列化时会根据命名空间自动添加前缀，但我们需要确保不会添加 xmlns 属性
    diagram = doc.createElementNS(namespace, localName)
  }
  
  // 复制所有属性，处理属性映射和值转换
  // 跳过 xmlns 相关属性，避免添加命名空间声明
  Array.from(element.attributes).forEach(attr => {
    // 跳过 xmlns 相关的属性
    if (attr.name.startsWith('xmlns')) {
      return
    }
    
    // 处理属性名映射（xpmnElement -> bpmnElement）
    // 注意：type 属性映射只适用于特定元素（如 conditionExpression），不适用于所有元素
    // declaration 元素的 type 属性不应该被转换为 xsi:type
    let attrName = attr.name
    const elementLocalName = element.localName || element.tagName.split(':').pop() || element.tagName
    // 只对 conditionExpression 元素的 type 属性应用映射
    if (elementLocalName === 'conditionExpression' && attrName === 'type' && elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]) {
      attrName = elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
    } else if (attrName === 'xpmnElement' && elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]) {
      // xpmnElement 属性映射到 bpmnElement
      attrName = elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
    } else {
      // 如果没有映射，使用字符串替换（将 xpmn 恢复为 bpmn）
    attrName = attrName.replace(/xpmn/gi, (match) => {
      if (match === 'xpmn') return 'bpmn'
      if (match === 'XPMN') return 'XPMN'
      return 'bpmn'
    })
    }
    
    let attrValue = attr.value
    // 对于 xpmnElement（映射为 bpmnElement）属性，属性值不应该被转换
    // 因为它指向的是 process 元素的 id，而不是包含 xpmn 关键字的字符串
    const isXpmnElementAttr = attrName === 'xpmnElement' && elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
    if (!isXpmnElementAttr) {
    // 将属性值中的 xpmn 恢复为 bpmn（保持大小写）
      // 注意：id 属性值也应该被转换（XPMNDiagram_1 -> BPMNDiagram_1）
      // 先替换大写，再替换小写，避免重复替换
      attrValue = attrValue.replace(/XPMN/g, 'XPMN')
      attrValue = attrValue.replace(/xpmn/g, 'bpmn')
    }
    
    diagram.setAttribute(attrName, attrValue)
  })
  
  // 递归处理子元素
  // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
  const childNodes = element.childNodes || []
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i]
    if (node.nodeType === 1) {
      const child = node as Element
      const childLocalName = child.localName || child.tagName.split(':').pop() || child.tagName
      const childNamespaceURI = child.namespaceURI
      
      // 使用映射文件获取子元素的 XPMN 名称
      const childBpmnName = elementMapping.elements[childLocalName as keyof typeof elementMapping.elements]
      
      if (childBpmnName) {
        // 解析前缀和本地名
        const [childPrefix, childLocalNameOnly] = childBpmnName.includes(':') 
          ? childBpmnName.split(':') 
          : [null, childBpmnName]
        
        // 根据前缀确定命名空间
        let childNamespace: string
        if (childPrefix === 'bpmndi') {
          childNamespace = 'http://www.omg.org/spec/XPMN/20100524/DI'
        } else if (childPrefix === 'dc') {
          childNamespace = 'http://www.omg.org/spec/DD/20100524/DC'
        } else if (childPrefix === 'di') {
          childNamespace = 'http://www.omg.org/spec/DD/20100524/DI'
        } else {
          childNamespace = 'http://www.omg.org/spec/XPMN/20100524/DI'
        }
        
        // 创建子元素
        const childElement = doc.createElementNS(childNamespace, childLocalNameOnly)
        
        // 复制属性
        Array.from(child.attributes).forEach(attr => {
          if (!attr.name.startsWith('xmlns')) {
            // 处理属性名映射
            let attrName = attr.name
            const isXpmnElementAttr = attrName === 'xpmnElement' && elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
            if (isXpmnElementAttr) {
              attrName = elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
            }
            let attrValue = attr.value
            // 对于 xpmnElement（映射为 bpmnElement）属性，属性值不应该被转换
            // 因为它指向的是 process 元素的 id，而不是包含 xpmn 关键字的字符串
            if (!isXpmnElementAttr) {
              // 转换属性值中的 xpmn -> bpmn
              attrValue = attrValue.replace(/XPMN/g, 'XPMN')
              attrValue = attrValue.replace(/xpmn/g, 'bpmn')
            }
            childElement.setAttribute(attrName, attrValue)
          }
        })
        
        // 递归处理子元素的子元素
        const childChildNodes = child.childNodes || []
        for (let j = 0; j < childChildNodes.length; j++) {
          const childNode = childChildNodes[j]
          if (childNode.nodeType === 1) {
            const childChild = childNode as Element
            const convertedGrandChild = convertXPMNDiagramToBPMN(childChild, doc)
            childElement.appendChild(convertedGrandChild)
          }
        }
        
        diagram.appendChild(childElement)
      } else {
        // 如果没有映射，递归转换
    const convertedChild = convertXPMNDiagramToBPMN(child, doc)
    diagram.appendChild(convertedChild)
      }
    }
  }
  
  return diagram
}

/**
 * 转换 BPMNDiagram 元素从 XPMN 到 XPMN（将 bpmn 改为 xpmn）
 */
function convertBPMNDiagramToXPMN(element: Element, doc: Document): Element {
  // 获取元素标签名，将 XPMN 改为 XPMN（去掉 bpmndi: 前缀，XPMN 格式不使用前缀）
  const localName = element.localName || element.tagName.split(':').pop() || element.tagName
  // 将元素名中的 XPMN 改为 XPMN（不添加前缀）
  const tagName = localName.replace(/XPMN/g, 'XPMN').replace(/bpmn/g, 'xpmn')
  
  // 创建 XPMN 格式的元素（无前缀）
  const diagram = doc.createElement(tagName)
  
  // 复制所有属性，处理属性映射和值转换
  // 跳过 xmlns 相关属性，避免添加命名空间声明
  Array.from(element.attributes).forEach(attr => {
    // 跳过 xmlns 相关的属性
    if (attr.name.startsWith('xmlns')) {
      return
    }
    
    // 处理属性名映射（bpmnElement -> xpmnElement）
    // 注意：xsi:type 是 XML Schema 实例属性，不应该被转换
    let attrName = attr.name
    if (attrName.startsWith('xsi:')) {
      // xsi: 前缀的属性不应该被转换
      attrName = attrName
    } else {
      const mappedAttrName = reverseAttributeMapping[attrName]
      if (mappedAttrName) {
        attrName = mappedAttrName
      } else {
        // 如果没有映射，使用字符串替换（将 bpmn 改为 xpmn）
    attrName = attrName.replace(/bpmn/gi, (match) => {
      if (match === 'bpmn') return 'xpmn'
      if (match === 'XPMN') return 'XPMN'
      return 'xpmn'
    })
      }
    }
    
    let attrValue = attr.value
    // 将属性值中的 bpmn 改为 xpmn（保持大小写）
    // 注意：id 属性值也应该被转换（BPMNDiagram_1 -> XPMNDiagram_1）
    attrValue = attrValue.replace(/bpmn/gi, (match) => {
      if (match === 'bpmn') return 'xpmn'
      if (match === 'XPMN') return 'XPMN'
      return 'xpmn'
    })
    
    diagram.setAttribute(attrName, attrValue)
  })
  
  // 递归处理子元素
  // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
  const childNodes = element.childNodes || []
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i]
    if (node.nodeType === 1) {
      const child = node as Element
      const childLocalName = child.localName || child.tagName.split(':').pop() || child.tagName
      const childNamespaceURI = child.namespaceURI
      
      // Bounds 和 waypoint 需要特殊处理，XPMN 格式不使用前缀
      if ((childNamespaceURI === 'http://www.omg.org/spec/DD/20100524/DC' || child.tagName.startsWith('dc:')) && childLocalName === 'Bounds') {
        // 创建 Bounds 元素（无前缀）
        const bounds = doc.createElement('Bounds')
        Array.from(child.attributes).forEach(attr => {
          // 跳过 xmlns 相关的属性，避免添加命名空间声明
          if (!attr.name.startsWith('xmlns')) {
            bounds.setAttribute(attr.name, attr.value)
          }
        })
        diagram.appendChild(bounds)
      } else if ((childNamespaceURI === 'http://www.omg.org/spec/DD/20100524/DI' || child.tagName.startsWith('di:')) && childLocalName === 'waypoint') {
        // 创建 waypoint 元素（无前缀）
        const waypoint = doc.createElement('waypoint')
        Array.from(child.attributes).forEach(attr => {
          // 跳过 xmlns 相关的属性，避免添加命名空间声明
          if (!attr.name.startsWith('xmlns')) {
            waypoint.setAttribute(attr.name, attr.value)
          }
        })
        diagram.appendChild(waypoint)
      } else {
        // 其他元素递归转换（XPMN 格式不使用前缀）
    const convertedChild = convertBPMNDiagramToXPMN(child, doc)
    diagram.appendChild(convertedChild)
      }
    }
  }
  
  return diagram
}

/**
 * 递归转换元素树从 XPMN 格式到 XPMN 格式
 */
function convertXPMNElementTreeToBPMN(element: Element, doc: Document): Element {
  const xpmnName = element.localName || element.tagName.split(':').pop() || element.tagName
  const bpmnName = elementMapping.elements[xpmnName as keyof typeof elementMapping.elements]
  
  let targetElement: Element
  
  if (bpmnName) {
    const [prefix, localName] = bpmnName.includes(':') 
      ? bpmnName.split(':') 
      : [null, bpmnName]
    
    const namespace = prefix === 'bpmn' ? BPMN_NS : XFLOW_NS
    targetElement = doc.createElementNS(namespace, bpmnName)
    
    // 复制所有属性，处理属性映射和值转换
    Array.from(element.attributes).forEach(attr => {
      // 跳过 xmlns 相关属性
      if (attr.name.startsWith('xmlns')) {
        return
      }
      
      // 处理属性名映射（xpmnElement -> bpmnElement）
      // 注意：type 属性映射只适用于 conditionExpression 元素，不适用于其他元素（如 declaration）
      let attrName = attr.name
      const elementLocalName = element.localName || element.tagName.split(':').pop() || element.tagName
      // 只对 conditionExpression 元素的 type 属性应用映射
      if (elementLocalName === 'conditionExpression' && attrName === 'type' && elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]) {
        attrName = elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
      } else if (attrName === 'xpmnElement' && elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]) {
        // xpmnElement 属性映射到 bpmnElement
        attrName = elementMapping.attributes[attrName as keyof typeof elementMapping.attributes]
      }
      
      let attrValue = attr.value
      // 将属性值中的 tFormalExpression 转换为 bpmn:tFormalExpression
      if (attrValue === 'tFormalExpression' || attrValue.endsWith(':tFormalExpression')) {
        // 如果已经是 bpmn:tFormalExpression，保持不变；否则转换为 bpmn:tFormalExpression
        if (!attrValue.startsWith('bpmn:')) {
          attrValue = attrValue.replace(/^([^:]*:)?tFormalExpression$/, 'bpmn:tFormalExpression')
        }
      }
      targetElement.setAttribute(attrName, attrValue)
    })
    
    // 如果是 bpmn:process，确保设置 isExecutable="true" 和 id 属性
    if (bpmnName === 'bpmn:process') {
      targetElement.setAttribute('isExecutable', 'true')
      // 确保 process 元素有 id 属性（这是 bpmn-js 必需的）
      if (!targetElement.getAttribute('id')) {
        const originalId = element.getAttribute('id')
        if (originalId) {
          targetElement.setAttribute('id', originalId)
        } else {
          // 如果没有 id，生成一个
          targetElement.setAttribute('id', 'Process_' + Date.now())
        }
      }
    }
    
    // 保持原始元素顺序，但将 xflow 元素包装在 extensionElements 中
    // 注意：如果 targetElement 本身已经是 xflow: 元素，它的子元素应该直接添加到它，而不是再创建 extensionElements
    const isXflowElement = bpmnName && bpmnName.startsWith('xflow:')
    
    if (isXflowElement) {
      // 如果 targetElement 本身是 xflow: 元素，它的子元素直接添加到它，不再创建 extensionElements
      const childNodes = element.childNodes || []
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i]
        if (node && node.nodeType === 1) {
          const child = node as Element
          const convertedChild = convertXPMNElementTreeToBPMN(child, doc)
          targetElement.appendChild(convertedChild)
        }
      }
    } else {
      // 如果 targetElement 不是 xflow: 元素，需要将 xflow: 子元素包装在 extensionElements 中
    // 使用一个标志来跟踪当前是否在 extensionElements 块中
    let currentExtensionElements: Element | null = null
    
    // 按原始顺序处理所有子元素
      // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
      const childNodes = element.childNodes || []
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i]
        if (node && node.nodeType === 1) {
          const child = node as Element
      const childXpmnName = child.localName || child.tagName.split(':').pop() || child.tagName
          const childBpmnName = elementMapping.elements[childXpmnName as keyof typeof elementMapping.elements]
      
      if (childBpmnName && childBpmnName.startsWith('xflow:')) {
        // 这是 xflow 元素，需要放在 extensionElements 下
        // 如果还没有创建 extensionElements，创建一个
        if (!currentExtensionElements) {
          currentExtensionElements = doc.createElementNS(BPMN_NS, 'bpmn:extensionElements')
          targetElement.appendChild(currentExtensionElements)
        }
        const convertedChild = convertXPMNElementTreeToBPMN(child, doc)
        currentExtensionElements.appendChild(convertedChild)
      } else {
        // 其他元素直接转换，保持原始顺序
        // 如果之前有 extensionElements，先关闭它（因为 xflow 元素应该连续）
        // 但实际上，我们可以让 extensionElements 保持打开，直到遇到非 xflow 元素
        // 为了保持顺序，我们在这里不关闭 extensionElements，而是让它自然结束
        const convertedChild = convertXPMNElementTreeToBPMN(child, doc)
        targetElement.appendChild(convertedChild)
        // 遇到非 xflow 元素后，重置 extensionElements 标志（下次遇到 xflow 元素时创建新的）
        currentExtensionElements = null
      }
        }
      }
    }
    
    // 复制文本内容（如果没有子元素）
    // 检查是否有元素子节点
    const elementChildNodes = element.childNodes || []
    let hasElementChildren = false
    for (let i = 0; i < elementChildNodes.length; i++) {
      if (elementChildNodes[i].nodeType === 1) {
        hasElementChildren = true
        break
      }
    }
    if (element.textContent && !hasElementChildren) {
      targetElement.textContent = element.textContent
    }
  } else {
    // 没有映射的元素，保持原样但递归处理子元素
    targetElement = element.cloneNode(false) as Element
    Array.from(element.attributes).forEach(attr => {
      let attrValue = attr.value
      // 将属性值中的 tFormalExpression 转换为 bpmn:tFormalExpression
      if (attrValue === 'tFormalExpression' || attrValue.endsWith(':tFormalExpression')) {
        if (!attrValue.startsWith('bpmn:')) {
          attrValue = attrValue.replace(/^([^:]*:)?tFormalExpression$/, 'bpmn:tFormalExpression')
        }
      }
      targetElement.setAttribute(attr.name, attrValue)
    })
    
    // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
    const elementChildNodes = element.childNodes || []
    let hasElementChildren = false
    for (let i = 0; i < elementChildNodes.length; i++) {
      const node = elementChildNodes[i]
      if (node.nodeType === 1) {
        hasElementChildren = true
        const child = node as Element
      const convertedChild = convertXPMNElementTreeToBPMN(child, doc)
      targetElement.appendChild(convertedChild)
      }
    }
    
    if (element.textContent && !hasElementChildren) {
      targetElement.textContent = element.textContent
    }
  }
  
  return targetElement
}

/**
 * 递归转换元素树从 XPMN 格式到 XPMN 格式
 */
function convertElementTreeToXPMN(element: Element, doc: Document): Element {
  const localName = element.localName || element.tagName.split(':').pop() || element.tagName
  const fullName = element.tagName
  
  // 获取 XPMN 元素名
  let xpmnName: string
  if (fullName.startsWith('bpmn:') || element.namespaceURI === BPMN_NS) {
    xpmnName = reverseMapping[`bpmn:${localName}`] || reverseMapping[localName] || localName
  } else if (fullName.startsWith('xflow:') || element.namespaceURI === XFLOW_NS) {
    xpmnName = reverseMapping[`xflow:${localName}`] || reverseMapping[localName] || localName
  } else {
    xpmnName = reverseMapping[localName] || localName
  }
  
  // 创建 XPMN 格式的元素（无命名空间）
  const targetElement = doc.createElement(xpmnName)
  
  // 复制所有属性，处理属性映射和值转换
  // 跳过 xmlns 相关属性，避免添加命名空间声明
  Array.from(element.attributes).forEach(attr => {
    // 跳过 xmlns 相关的属性
    if (attr.name.startsWith('xmlns')) {
      return
    }
    
    // 如果是 process 元素，跳过 isExecutable 属性（XPMN 格式不需要此属性）
    if (xpmnName === 'process' && attr.name === 'isExecutable') {
      return
    }
    
    // 处理属性名映射（bpmnElement -> xpmnElement）
    // 注意：xsi:type 是 XML Schema 实例属性，不应该被转换
    let attrName = attr.name
    if (attrName.startsWith('xsi:')) {
      // xsi: 前缀的属性不应该被转换
      attrName = attrName
    } else {
      const mappedAttrName = reverseAttributeMapping[attrName]
      if (mappedAttrName) {
        attrName = mappedAttrName
      }
    }
    
    let attrValue = attr.value
    // 将属性值中的 bpmn:tFormalExpression 转换为 tFormalExpression
    if (attrValue === 'bpmn:tFormalExpression' || attrValue.includes('bpmn:tFormalExpression')) {
      attrValue = attrValue.replace(/bpmn:tFormalExpression/g, 'tFormalExpression')
    }
    targetElement.setAttribute(attrName, attrValue)
  })
  
  // 处理子元素
  // 使用 childNodes 而不是 children，因为 @xmldom/xmldom 可能不支持 children
  const childNodes = element.childNodes || []
  let hasElementChildren = false
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i]
    if (node.nodeType === 1) {
      hasElementChildren = true
      const child = node as Element
    const childLocalName = child.localName || child.tagName.split(':').pop() || child.tagName
    
    // 如果是 extensionElements，展开其子元素
    if (childLocalName === 'extensionElements' || 
        (child.namespaceURI === BPMN_NS && childLocalName === 'extensionElements')) {
        const extChildNodes = child.childNodes || []
        for (let j = 0; j < extChildNodes.length; j++) {
          const extNode = extChildNodes[j]
          if (extNode.nodeType === 1) {
            const extChild = extNode as Element
        const convertedChild = convertElementTreeToXPMN(extChild, doc)
        targetElement.appendChild(convertedChild)
          }
        }
    } else {
      // 其他元素递归转换
      const convertedChild = convertElementTreeToXPMN(child, doc)
      targetElement.appendChild(convertedChild)
    }
    }
  }
  
  // 复制文本内容（如果没有子元素）
  if (element.textContent && !hasElementChildren) {
    targetElement.textContent = element.textContent
  }
  
  return targetElement
}

