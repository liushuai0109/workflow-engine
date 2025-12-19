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
