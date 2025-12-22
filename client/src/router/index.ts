import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/workflows'
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

