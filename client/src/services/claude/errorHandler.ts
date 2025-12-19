/**
 * 错误处理器
 * 分类和处理 Claude API 错误
 */

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class LLMError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

/**
 * 解析 HTTP 响应错误
 */
export async function parseResponseError(response: Response): Promise<LLMError> {
  const statusCode = response.status
  let errorMessage = `API 请求失败: ${statusCode} ${response.statusText}`
  let errorType = ErrorType.UNKNOWN_ERROR

  try {
    const errorData = await response.json()
    if (errorData.error?.message) {
      errorMessage = errorData.error.message
    }
  } catch {
    // 无法解析 JSON，使用默认消息
  }

  // 根据状态码分类错误
  switch (statusCode) {
    case 401:
    case 403:
      errorType = ErrorType.AUTH_ERROR
      errorMessage = 'API Key 无效或已过期，请检查配置'
      break
    case 429:
      errorType = ErrorType.RATE_LIMIT_ERROR
      errorMessage = 'API 请求频率超限，请稍后再试'
      break
    case 400:
      errorType = ErrorType.INVALID_REQUEST
      errorMessage = `请求参数错误: ${errorMessage}`
      break
    case 500:
    case 502:
    case 503:
      errorType = ErrorType.SERVER_ERROR
      errorMessage = 'AI 服务暂时不可用，请稍后再试'
      break
    default:
      if (statusCode >= 500) {
        errorType = ErrorType.SERVER_ERROR
      }
  }

  return new LLMError(errorMessage, errorType, statusCode)
}

/**
 * 解析网络错误
 */
export function parseNetworkError(error: any): LLMError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new LLMError(
      '网络连接失败，请检查网络设置',
      ErrorType.NETWORK_ERROR,
      undefined,
      error
    )
  }

  if (error instanceof LLMError) {
    return error
  }

  return new LLMError(
    error.message || '未知错误',
    ErrorType.UNKNOWN_ERROR,
    undefined,
    error
  )
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: LLMError): boolean {
  return (
    error.type === ErrorType.RATE_LIMIT_ERROR ||
    error.type === ErrorType.SERVER_ERROR ||
    error.type === ErrorType.NETWORK_ERROR
  )
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyErrorMessage(error: LLMError): string {
  switch (error.type) {
    case ErrorType.AUTH_ERROR:
      return 'API 密钥验证失败，请联系管理员检查配置'
    case ErrorType.RATE_LIMIT_ERROR:
      return 'AI 服务请求过于频繁，请稍后再试'
    case ErrorType.SERVER_ERROR:
      return 'AI 服务暂时不可用，请稍后再试'
    case ErrorType.NETWORK_ERROR:
      return '网络连接失败，请检查网络连接'
    case ErrorType.INVALID_REQUEST:
      return '请求参数有误，请重新输入'
    case ErrorType.MODEL_ERROR:
      return 'AI 无法处理此请求，请换个方式描述'
    default:
      return 'AI 服务出现问题，请稍后再试'
  }
}
