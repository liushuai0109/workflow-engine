/**
 * Claude API 代理路由
 * 解决前端CORS问题，保护API Key安全
 */

import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger'

const router = Router()

// Claude API 配置
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const CLAUDE_BASE_URL = process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com'
const CLAUDE_API_VERSION = '2023-06-01'

/**
 * POST /api/claude/messages
 * 代理 Claude Messages API 请求
 */
router.post('/messages', async (req: Request, res: Response) => {
  try {
    // 检查 API Key
    if (!CLAUDE_API_KEY) {
      logger.error('Claude API Key not configured')
      return res.status(500).json({
        error: 'Claude API Key not configured. Please set CLAUDE_API_KEY environment variable.'
      })
    }

    // 转发请求到 Claude API
    const claudeResponse = await fetch(`${CLAUDE_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': CLAUDE_API_VERSION
      },
      body: JSON.stringify(req.body)
    })

    // 获取响应
    const responseData = await claudeResponse.json()

    // 转发状态码和响应
    res.status(claudeResponse.status).json(responseData)

    logger.info('Claude API request proxied', {
      status: claudeResponse.status,
      model: req.body.model
    })
  } catch (error) {
    logger.error('Claude API proxy error', error)
    res.status(500).json({
      error: 'Failed to proxy request to Claude API',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})

/**
 * GET /api/claude/health
 * 检查 Claude API 配置状态
 */
router.get('/health', (req: Request, res: Response) => {
  const isConfigured = !!CLAUDE_API_KEY

  res.json({
    configured: isConfigured,
    baseUrl: CLAUDE_BASE_URL,
    apiVersion: CLAUDE_API_VERSION,
    message: isConfigured
      ? 'Claude API is configured and ready'
      : 'Claude API Key not configured. Set CLAUDE_API_KEY environment variable.'
  })
})

export const claudeRoutes = router
