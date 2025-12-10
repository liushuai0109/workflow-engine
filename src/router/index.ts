import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/BpmnEditorPage.vue')
  },
  {
    path: '/tool',
    name: 'Tool',
    component: () => import('../pages/RequestBodyConverter.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

