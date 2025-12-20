import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import json from 'koa-json';
import router from './routes';

const app = new Koa();

// 中间件配置
app.use(json());
app.use(bodyParser());

// CORS 配置 - 允许 client.biz.com 域名（包括带端口的开发环境）
app.use(cors({
  origin: (ctx) => {
    const origin = ctx.request.header.origin || '';
    if (origin.includes('client.biz.com')) {
      return origin;
    }
    // 开发环境允许所有源
    if (process.env.NODE_ENV === 'development') {
      return origin || '*';
    }
    return false;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// 路由
app.use(router.routes()).use(router.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('Server error:', err);
  ctx.status = err.statusCode || err.status || 500;
  ctx.body = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  };
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

