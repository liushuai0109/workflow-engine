import { createRouter, createWebHistory } from 'vue-router';
import RegisterPage from '../pages/RegisterPage.vue';
import OpenAccountPage from '../pages/OpenAccountPage.vue';
import DepositPage from '../pages/DepositPage.vue';
import TradePage from '../pages/TradePage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/register',
    },
    {
      path: '/register',
      name: 'Register',
      component: RegisterPage,
    },
    {
      path: '/account/open',
      name: 'OpenAccount',
      component: OpenAccountPage,
    },
    {
      path: '/account/deposit',
      name: 'Deposit',
      component: DepositPage,
    },
    {
      path: '/trade',
      name: 'Trade',
      component: TradePage,
    },
  ],
});

export default router;

