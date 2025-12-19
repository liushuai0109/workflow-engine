/**
 * 工具定义适配器
 * 将 Gemini Function Declarations 转换为 Claude Tool Use 格式
 */

import type { FunctionDeclaration } from '../llmTools'
import type { ClaudeTool, ToolParameter } from './ClaudeAPIClient'

/**
 * 将 Gemini 参数定义转换为 Claude 参数定义
 */
function convertParameter(geminiParam: any): ToolParameter {
  const claudeParam: ToolParameter = {
    type: geminiParam.type as any,
    description: geminiParam.description || ''
  }

  if (geminiParam.enum) {
    claudeParam.enum = geminiParam.enum
  }

  if (geminiParam.items) {
    claudeParam.items = convertParameter(geminiParam.items)
  }

  return claudeParam
}

/**
 * 将 Gemini Function Declaration 转换为 Claude Tool
 */
export function convertFunctionToTool(functionDecl: FunctionDeclaration): ClaudeTool {
  const properties: Record<string, ToolParameter> = {}

  // 转换所有参数
  for (const [propName, propDef] of Object.entries(functionDecl.parameters.properties)) {
    properties[propName] = convertParameter(propDef)
  }

  return {
    name: functionDecl.name,
    description: functionDecl.description,
    input_schema: {
      type: 'object',
      properties,
      required: functionDecl.parameters.required
    }
  }
}

/**
 * 批量转换工具定义
 */
export function convertFunctionsToTools(functionDecls: FunctionDeclaration[]): ClaudeTool[] {
  return functionDecls.map(convertFunctionToTool)
}

/**
 * 为 Claude 工具添加缓存标记
 * 工具定义通常不变，适合使用 Prompt Caching
 */
export function addCacheControlToTools(tools: ClaudeTool[]): ClaudeTool[] {
  // Claude 的 Prompt Caching 通过在 system 消息中标记实现
  // 工具本身不需要标记，但我们可以返回原工具数组
  return tools
}
