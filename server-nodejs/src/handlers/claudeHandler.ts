import { Context } from 'koa';
import { Logger } from '../pkg/logger';
import axios, { AxiosError } from 'axios';

export class ClaudeHandler {
  private claudeApiKey: string;
  private claudeBaseUrl: string;

  constructor(private logger: Logger) {
    this.claudeApiKey = process.env.CLAUDE_API_KEY || '';
    this.claudeBaseUrl = process.env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com';

    if (!this.claudeApiKey) {
      this.logger.warn('CLAUDE_API_KEY not configured');
    }
  }

  /**
   * Proxy Claude API messages endpoint
   */
  proxyMessages = async (ctx: Context): Promise<void> => {
    if (!this.claudeApiKey) {
      ctx.status = 500;
      ctx.body = {
        error: {
          type: 'api_error',
          message: 'Claude API key not configured',
        },
      };
      return;
    }

    try {
      const requestBody = ctx.request.body;
      const anthropicVersion = ctx.get('anthropic-version') || '2023-06-01';

      this.logger.info({
        model: (requestBody as any)?.model,
        messageCount: (requestBody as any)?.messages?.length,
        msg: 'Proxying Claude API request',
      });

      const response = await axios.post(
        `${this.claudeBaseUrl}/anthropic/v1/messages`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.claudeApiKey,
            'anthropic-version': anthropicVersion,
          },
          timeout: 120000, // 2 minutes timeout for Claude API
        }
      );

      ctx.status = response.status;
      ctx.body = response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        this.logger.error({
          status: axiosError.response?.status,
          error: axiosError.message,
          msg: 'Claude API request failed',
        });

        ctx.status = axiosError.response?.status || 500;
        ctx.body = axiosError.response?.data || {
          error: {
            type: 'api_error',
            message: 'Failed to proxy Claude API request',
          },
        };
      } else {
        this.logger.error({
          error: error instanceof Error ? error.message : String(error),
          msg: 'Unexpected error in Claude API proxy',
        });

        ctx.status = 500;
        ctx.body = {
          error: {
            type: 'api_error',
            message: 'Internal server error',
          },
        };
      }
    }
  };
}
