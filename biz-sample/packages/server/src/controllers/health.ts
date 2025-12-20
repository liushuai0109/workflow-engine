import { Context } from 'koa';

const check = async (ctx: Context) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  ctx.status = 200;
};

export default { check };

