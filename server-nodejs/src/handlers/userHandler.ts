import { Context } from 'koa';
import { UserService } from '../services/userService';
import { Logger } from '../pkg/logger';
import { ApiResponse } from '../models/response';

export class UserHandler {
  constructor(
    private service: UserService,
    private logger: Logger
  ) {}

  createUser = async (ctx: Context) => {
    const { username, email, fullName } = ctx.request.body as any;

    if (!username || !email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required fields: username and email',
      } as ApiResponse;
      return;
    }

    try {
      const user = await this.service.createUser(username, email, fullName);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: user,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to create user');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to create user',
      } as ApiResponse;
    }
  };

  getUser = async (ctx: Context) => {
    const { userId } = ctx.params;

    try {
      const user = await this.service.getUserById(userId);

      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'User not found',
        } as ApiResponse;
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: user,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, userId }, 'Failed to get user');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get user',
      } as ApiResponse;
    }
  };

  updateUser = async (ctx: Context) => {
    const { userId } = ctx.params;
    const updates = ctx.request.body as any;

    try {
      const user = await this.service.updateUser(userId, updates);

      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'User not found',
        } as ApiResponse;
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: user,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, userId }, 'Failed to update user');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to update user',
      } as ApiResponse;
    }
  };
}
