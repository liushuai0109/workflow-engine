/**
 * LLM 配置管理
 * 支持 Claude API 的配置
 */

export interface LLMConfig {
  provider: 'claude'
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
  enableCache: boolean
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'claude',
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
  baseUrl: import.meta.env.VITE_CLAUDE_BASE_URL || 'https://api.anthropic.com',
  model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
  temperature: 0.7,
  enableCache: true
}

class LLMConfigManager {
  private config: LLMConfig

  constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(partialConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...partialConfig }
  }

  /**
   * 设置 API Key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey
  }

  /**
   * 设置 Base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl
  }

  /**
   * 设置模型
   */
  setModel(model: string): void {
    this.config.model = model
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
  }
}

// 导出单例
export const llmConfig = new LLMConfigManager()

/**
 * 便捷函数：获取当前配置
 */
export function getLLMConfig(): LLMConfig {
  return llmConfig.getConfig()
}
