import Router from '@koa/router';
import healthController from '../controllers/health';
import authController from '../controllers/auth';
import accountController from '../controllers/account';
import tradeController from '../controllers/trade';

const router = new Router({
  prefix: '/api',
});

// 健康检查
router.get('/health', healthController.check);

// 认证相关
router.post('/auth/register', authController.register);

// 账户相关
router.post('/account/open', accountController.open);
router.post('/account/deposit', accountController.deposit);

// 交易相关
router.post('/trade/buy', tradeController.buy);
router.post('/trade/sell', tradeController.sell);

export default router;

