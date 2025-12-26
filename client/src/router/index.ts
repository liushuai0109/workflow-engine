import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomePage.vue')
  },
  {
    path: '/workflows',
    name: 'Workflows',
    component: () => import('../pages/WorkflowListPage.vue')
  },
  {
    path: '/editor',
    name: 'EditorNew',
    component: () => import('../pages/BpmnEditorPage.vue')
  },
  {
    path: '/editor/:workflowId',
    name: 'EditorEdit',
    component: () => import('../pages/BpmnEditorPage.vue')
  },
  {
    path: '/tool',
    name: 'Tool',
    component: () => import('../pages/RequestBodyConverter.vue')
  },
  {
    path: '/marketing-agent',
    name: 'MarketingAgent',
    component: () => import('../pages/MarketingAgentPage.vue'),
    meta: {
      title: '营销智能体',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

