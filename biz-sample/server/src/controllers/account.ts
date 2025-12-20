import { Context } from 'koa';
import { accountService } from '../services/account';

interface OpenAccountRequest {
  userId: string;
  realName: string;
  idCard: string;
  bankCard: string;
  bankName: string;
}

interface DepositRequest {
  accountId: string;
  amount: number;
  bankCard: string;
}

const open = async (ctx: Context) => {
  const body = ctx.request.body as OpenAccountRequest;

  // 验证必填字段
  if (!body.userId || !body.realName || !body.idCard || !body.bankCard || !body.bankName) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '所有字段都是必填的',
      },
    };
    return;
  }

  try {
    const account = await accountService.openAccount(body);

    ctx.status = 201;
    ctx.body = {
      success: true,
      data: account,
    };
  } catch (error: any) {
    ctx.status = error.code === 'USER_NOT_FOUND' ? 404 : 400;
    ctx.body = {
      success: false,
      error: {
        code: error.code || 'INVALID_REQUEST',
        message: error.message || '开户失败',
      },
    };
  }
};

const deposit = async (ctx: Context) => {
  const body = ctx.request.body as DepositRequest;

  // 验证必填字段
  if (!body.accountId || !body.amount || !body.bankCard) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '账户ID、金额和银行卡号不能为空',
      },
    };
    return;
  }

  // 验证金额
  if (body.amount <= 0) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: 'INVALID_AMOUNT',
        message: '入金金额必须大于0',
      },
    };
    return;
  }

  try {
    const result = await accountService.deposit(body);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result,
    };
  } catch (error: any) {
    ctx.status = error.code === 'ACCOUNT_NOT_FOUND' ? 404 : 400;
    ctx.body = {
      success: false,
      error: {
        code: error.code || 'INVALID_REQUEST',
        message: error.message || '入金失败',
      },
    };
  }
};

export default { open, deposit };

