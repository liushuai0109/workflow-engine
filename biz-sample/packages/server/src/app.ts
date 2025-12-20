import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import json from 'koa-json';
import os from 'os';
import router from './routes';

const app = new Koa();

// 错误处理（放在最前面）
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

// CORS 配置 - 允许 client.biz.com 域名（包括带端口的开发环境）
app.use(cors({
  origin: (ctx: any): string => {
    const origin = ctx.request.header.origin || '';
    if (origin.includes('client.biz.com')) {
      return origin;
    }
    // 开发环境允许所有源
    if (process.env.NODE_ENV === 'development') {
      return origin || '*';
    }
    // 生产环境拒绝其他源
    return '';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// 中间件配置
app.use(json());
app.use(bodyParser());

// 路由
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// 获取实际可访问的 IP 地址用于显示
const getDisplayHost = (): string => {
  if (HOST !== '0.0.0.0') {
    return HOST;
  }
  // 尝试获取本机 IP 地址
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const displayHost = getDisplayHost();

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${displayHost}:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log(`Listening on all interfaces (0.0.0.0:${PORT})`);
  }
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

