import { Context } from 'koa';
import { tradeService } from '../services/trade';

interface BuyRequest {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  price: number;
}

interface SellRequest {
  accountId: string;
  stockCode: string;
  quantity: number;
  price: number;
}

const buy = async (ctx: Context) => {
  const body = ctx.request.body as BuyRequest;

  // 验证必填字段
  if (!body.accountId || !body.stockCode || !body.stockName || !body.quantity || !body.price) {
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

  // 验证数量和价格
  if (body.quantity <= 0 || body.price <= 0) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '数量和价格必须大于0',
      },
    };
    return;
  }

  try {
    const result = await tradeService.buy(body);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result,
    };
  } catch (error: any) {
    ctx.status = error.code === 'ACCOUNT_NOT_FOUND' ? 404 : 
                 error.code === 'INSUFFICIENT_BALANCE' ? 400 : 400;
    ctx.body = {
      success: false,
      error: {
        code: error.code || 'INVALID_REQUEST',
        message: error.message || '买入失败',
      },
    };
  }
};

const sell = async (ctx: Context) => {
  const body = ctx.request.body as SellRequest;

  // 验证必填字段
  if (!body.accountId || !body.stockCode || !body.quantity || !body.price) {
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

  // 验证数量和价格
  if (body.quantity <= 0 || body.price <= 0) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '数量和价格必须大于0',
      },
    };
    return;
  }

  try {
    const result = await tradeService.sell(body);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result,
    };
  } catch (error: any) {
    ctx.status = error.code === 'ACCOUNT_NOT_FOUND' ? 404 : 
                 error.code === 'INSUFFICIENT_POSITION' ? 400 : 400;
    ctx.body = {
      success: false,
      error: {
        code: error.code || 'INVALID_REQUEST',
        message: error.message || '卖出失败',
      },
    };
  }
};

export default { buy, sell };

