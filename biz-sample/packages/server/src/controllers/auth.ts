import { Context } from 'koa';
import { userService } from '../services/user';

interface RegisterRequest {
  phone: string;
  password: string;
  verifyCode?: string;
}

const register = async (ctx: Context) => {
  const body = ctx.request.body as RegisterRequest;

  // 验证必填字段
  if (!body.phone || !body.password) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '手机号和密码不能为空',
      },
    };
    return;
  }

  try {
    const user = await userService.create({
      phone: body.phone,
      password: body.password,
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      data: {
        userId: user.userId,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: error.code || 'INVALID_REQUEST',
        message: error.message || '注册失败',
      },
    };
  }
};

export default { register };

