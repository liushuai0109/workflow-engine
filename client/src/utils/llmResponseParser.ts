/**
 * LLM 响应解析工具
 *
 * 用于解析 MarketAgent 返回的结构化 JSON 响应
 */

import type {
  LLMResponse,
  LLMResponseType,
  LLMParseResult
} from '../types/llmResponse'

/**
 * 从文本中提取 JSON
 */
const extractJSON = (text: string): string | null => {
  // 1. 尝试匹配 ```json ... ``` 格式
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/i
  const jsonMatch = text.match(jsonBlockRegex)
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim()
  }

  // 2. 尝试匹配通用代码块
  const codeBlockRegex = /```\s*([\s\S]*?)```/
  const codeMatch = text.match(codeBlockRegex)
  if (codeMatch && codeMatch[1]) {
    const content = codeMatch[1].trim()
    // 检查是否为 JSON
    if (content.startsWith('{') || content.startsWith('[')) {
      return content
    }
  }

  // 3. 尝试在文本中找到 JSON 对象
  const jsonObjectRegex = /\{[\s\S]*"responseType"[\s\S]*\}/
  const objectMatch = text.match(jsonObjectRegex)
  if (objectMatch) {
    return objectMatch[0]
  }

  return null
}

/**
 * 验证响应类型是否有效
 */
const isValidResponseType = (type: string): type is LLMResponseType => {
  const validTypes: LLMResponseType[] = [
    'plan_form',
    'audience_selector',
    'audience_recommendation',
    'reach_strategy',
    'product_config',
    'smart_strategy',
    'channel_selector',
    'channel_copy',
    'bpmn_flow',
    'campaign_report',
    'text'
  ]
  return validTypes.includes(type as LLMResponseType)
}

/**
 * 解析 LLM 响应
 */
export const parseLLMResponse = (text: string): LLMParseResult => {
  try {
    // 尝试提取 JSON
    const jsonStr = extractJSON(text)

    if (!jsonStr) {
      // 没有找到 JSON，返回原始文本作为 text 类型
      return {
        success: true,
        response: {
          responseType: 'text',
          data: text,
          message: text
        },
        rawContent: text
      }
    }

    // 解析 JSON
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    // 验证必要字段
    if (!parsed.responseType || typeof parsed.responseType !== 'string') {
      return {
        success: false,
        error: '响应缺少 responseType 字段',
        rawContent: text
      }
    }

    if (!isValidResponseType(parsed.responseType)) {
      return {
        success: false,
        error: `无效的响应类型: ${parsed.responseType}`,
        rawContent: text
      }
    }

    // 构建响应对象
    const response: LLMResponse = {
      responseType: parsed.responseType as LLMResponseType,
      data: parsed.data as LLMResponse['data'],
      message: (parsed.message as string) || ''
    }

    return {
      success: true,
      response,
      rawContent: text
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '解析响应时出错'
    return {
      success: false,
      error: `JSON 解析失败: ${errorMessage}`,
      rawContent: text
    }
  }
}

/**
 * 从 LLM 响应中提取消息文本
 * 移除 JSON 代码块，保留纯文本部分
 */
export const extractMessageText = (text: string): string => {
  // 移除 JSON 代码块
  let cleanedText = text.replace(/```json[\s\S]*?```/gi, '')
  cleanedText = cleanedText.replace(/```[\s\S]*?```/g, '')

  // 移除独立的 JSON 对象（以 { 开头且包含 responseType）
  cleanedText = cleanedText.replace(/\{[\s\S]*"responseType"[\s\S]*\}/g, '')

  // 清理多余的空白
  cleanedText = cleanedText.trim()

  return cleanedText || text
}

/**
 * 根据响应类型获取默认提示消息
 */
export const getDefaultMessageForType = (responseType: LLMResponseType): string => {
  const messages: Record<LLMResponseType, string> = {
    plan_form: '已为您生成营销方案，请查看并确认：',
    audience_selector: '请选择目标人群：',
    audience_recommendation: '以下是人群推荐详情：',
    reach_strategy: '已为您生成触达策略流程图：',
    product_config: '请配置推荐的商品和优惠：',
    smart_strategy: '已为您生成智能营销策略：',
    channel_selector: '请选择推广渠道：',
    channel_copy: '已为各渠道生成个性化文案：',
    bpmn_flow: '已生成可执行流程图：',
    campaign_report: '活动复盘报告已生成：',
    text: ''
  }
  return messages[responseType]
}
