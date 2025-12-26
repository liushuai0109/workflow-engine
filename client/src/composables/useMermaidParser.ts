/**
 * useMermaidParser.ts
 *
 * Mermaid 流程图解析和渲染 Composable
 *
 * 职责：
 * - 解析 MA 回复中的 Mermaid 格式流程图代码
 * - 渲染 Mermaid 图表到指定容器
 * - 处理解析和渲染错误
 */

import { ref } from 'vue'
import mermaid from 'mermaid'

export interface MermaidRenderResult {
  success: boolean
  svg?: string
  error?: string
}

export interface MermaidParseResult {
  success: boolean
  code?: string
  error?: string
}

// Mermaid 是否已初始化
let initialized = false

export function useMermaidParser() {
  const isRendering = ref(false)
  const lastError = ref<string | null>(null)

  /**
   * 初始化 Mermaid
   */
  const initMermaid = () => {
    if (initialized) return

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35
      },
      themeVariables: {
        primaryColor: '#1890ff',
        primaryTextColor: '#333',
        primaryBorderColor: '#1890ff',
        lineColor: '#666',
        secondaryColor: '#f0f5ff',
        tertiaryColor: '#fff'
      }
    })

    initialized = true
  }

  /**
   * 从文本中提取 Mermaid 代码
   * 支持多种格式：
   * 1. ```mermaid ... ```
   * 2. ``` ... ``` (如果内容以 mermaid 关键字开头)
   * 3. 纯 Mermaid 代码（以 graph、flowchart 等开头）
   */
  const extractMermaidCode = (text: string): MermaidParseResult => {
    try {
      // 1. 匹配 ```mermaid ... ``` 格式
      const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/i
      const mermaidMatch = text.match(mermaidBlockRegex)
      if (mermaidMatch && mermaidMatch[1]) {
        const code = mermaidMatch[1].trim()
        if (code) {
          return { success: true, code }
        }
      }

      // 2. 匹配通用代码块 ``` ... ```，检查内容是否为 Mermaid
      const codeBlockRegex = /```\s*([\s\S]*?)```/
      const codeMatch = text.match(codeBlockRegex)
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].trim()
        if (isMermaidCode(code)) {
          return { success: true, code }
        }
      }

      // 3. 检查整个文本是否为裸 Mermaid 代码
      const trimmedText = text.trim()
      if (isMermaidCode(trimmedText)) {
        return { success: true, code: trimmedText }
      }

      return { success: false, error: '未找到有效的 Mermaid 代码' }
    } catch (error: any) {
      return { success: false, error: error.message || '解析 Mermaid 代码时出错' }
    }
  }

  /**
   * 判断代码是否为 Mermaid 格式
   */
  const isMermaidCode = (code: string): boolean => {
    const mermaidKeywords = [
      'graph',
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'erDiagram',
      'journey',
      'gantt',
      'pie',
      'gitGraph',
      'mindmap',
      'timeline',
      'C4Context',
      'C4Container',
      'C4Component',
      'C4Dynamic',
      'C4Deployment'
    ]

    const lines = code.split('\n')
    const firstLine = lines[0]?.trim().toLowerCase() || ''
    return mermaidKeywords.some(keyword => firstLine.startsWith(keyword.toLowerCase()))
  }

  /**
   * 渲染 Mermaid 图表
   * @param code Mermaid 代码
   * @param containerId 容器元素 ID（用于唯一标识渲染）
   */
  const renderMermaid = async (
    code: string,
    containerId: string
  ): Promise<MermaidRenderResult> => {
    try {
      initMermaid()
      isRendering.value = true
      lastError.value = null

      // 生成唯一的渲染 ID
      const renderId = `mermaid-${containerId}-${Date.now()}`

      const { svg } = await mermaid.render(renderId, code)

      return { success: true, svg }
    } catch (error: any) {
      const errorMessage = error.message || 'Mermaid 渲染失败'
      lastError.value = errorMessage
      console.error('Mermaid render error:', error)
      return { success: false, error: errorMessage }
    } finally {
      isRendering.value = false
    }
  }

  /**
   * 验证 Mermaid 代码语法
   */
  const validateMermaidCode = async (code: string): Promise<boolean> => {
    try {
      initMermaid()
      await mermaid.parse(code)
      return true
    } catch {
      return false
    }
  }

  /**
   * 安全地渲染 Mermaid，失败时返回格式化的原始代码
   */
  const safeRenderMermaid = async (
    code: string,
    containerId: string
  ): Promise<{ svg?: string; rawCode?: string; isRaw: boolean; error?: string }> => {
    const result = await renderMermaid(code, containerId)

    if (result.success && result.svg) {
      return { svg: result.svg, isRaw: false }
    }

    // 渲染失败，返回格式化的原始代码作为降级显示
    return {
      rawCode: code,
      isRaw: true,
      error: result.error
    }
  }

  /**
   * 清理 Mermaid 生成的 SVG（用于组件卸载时）
   */
  const cleanupMermaidSvg = (containerId: string) => {
    // Mermaid 会在 DOM 中添加 SVG 元素，可能需要清理
    const elements = document.querySelectorAll(`[id^="mermaid-${containerId}"]`)
    elements.forEach(el => el.remove())
  }

  return {
    // 状态
    isRendering,
    lastError,

    // 方法
    initMermaid,
    extractMermaidCode,
    isMermaidCode,
    renderMermaid,
    validateMermaidCode,
    safeRenderMermaid,
    cleanupMermaidSvg
  }
}
