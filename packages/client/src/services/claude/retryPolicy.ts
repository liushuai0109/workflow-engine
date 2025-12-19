/**
 * 重试策略
 * 实现指数退避重试机制
 */

import { LLMError, ErrorType, isRetryableError } from './errorHandler'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // 基础延迟（毫秒）
  maxDelay: number // 最大延迟（毫秒）
  multiplier: number // 延迟倍数
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 8000, // 8秒
  multiplier: 2
}

/**
 * 计算重试延迟（指数退避）
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.multiplier, attempt - 1),
    config.maxDelay
  )

  // 添加随机抖动（jitter），避免惊群效应
  const jitter = Math.random() * 0.3 * delay
  return delay + jitter
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 使用重试策略执行异步函数
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // 如果是最后一次尝试，直接抛出错误
      if (attempt > retryConfig.maxRetries) {
        throw error
      }

      // 检查是否为可重试错误
      if (error instanceof LLMError && !isRetryableError(error)) {
        // 不可重试的错误，直接抛出
        throw error
      }

      // 计算延迟并等待
      const delay = calculateDelay(attempt, retryConfig)
      console.warn(
        `API 请求失败（第 ${attempt} 次尝试），${delay}ms 后重试...`,
        error instanceof Error ? error.message : error
      )

      await sleep(delay)
    }
  }

  // 理论上不会到达这里，但为了类型安全
  throw lastError || new Error('重试失败')
}

/**
 * 针对特定错误类型的重试策略
 */
export async function retryOnRateLimit<T>(
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    multiplier: 2
  })
}

/**
 * 针对服务器错误的重试策略
 */
export async function retryOnServerError<T>(
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 4000,
    multiplier: 2
  })
}

/**
 * 针对网络错误的重试策略
 */
export async function retryOnNetworkError<T>(
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    multiplier: 1.5
  })
}

/**
 * 智能重试策略（根据错误类型选择策略）
 */
export async function smartRetry<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (!(error instanceof LLMError)) {
      throw error
    }

    // 根据错误类型选择重试策略
    switch (error.type) {
      case ErrorType.RATE_LIMIT_ERROR:
        return retryOnRateLimit(fn)
      case ErrorType.SERVER_ERROR:
        return retryOnServerError(fn)
      case ErrorType.NETWORK_ERROR:
        return retryOnNetworkError(fn)
      default:
        // 不可重试的错误，直接抛出
        throw error
    }
  }
}
