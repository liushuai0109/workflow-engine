<template>
  <div class="home-page">
    <div class="home-content">
      <h1 class="home-title">BPMN Workflow Engine</h1>
      <p class="home-subtitle">Create and manage your BPMN workflows with ease</p>

      <div class="home-actions">
        <a-button type="primary" size="large" @click="goToWorkflowList">
          <template #icon><UnorderedListOutlined /></template>
          查看工作流列表
        </a-button>
        <a-button size="large" @click="createNewWorkflow">
          <template #icon><FileAddOutlined /></template>
          创建新工作流
        </a-button>
        <a-button size="large" @click="goToMarketingAgent" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
          <template #icon><RobotOutlined /></template>
          营销智能体
        </a-button>
      </div>

      <div class="home-features">
        <div class="feature-card">
          <FileTextOutlined class="feature-icon" />
          <h3>BPMN 2.0 标准</h3>
          <p>完全符合 BPMN 2.0 规范，支持各种流程元素和属性</p>
        </div>
        <div class="feature-card">
          <EditOutlined class="feature-icon" />
          <h3>可视化编辑</h3>
          <p>直观的图形化编辑器，轻松创建和修改工作流</p>
        </div>
        <div class="feature-card">
          <RobotOutlined class="feature-icon" />
          <h3>AI 辅助</h3>
          <p>集成 AI 助手，通过自然语言描述生成流程图</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  UnorderedListOutlined,
  FileAddOutlined,
  FileTextOutlined,
  EditOutlined,
  RobotOutlined
} from '@ant-design/icons-vue'

const router = useRouter()

const goToWorkflowList = () => {
  router.push('/workflows')
}

const createNewWorkflow = () => {
  router.push('/editor')
}

const goToMarketingAgent = () => {
  router.push('/marketing-agent')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.home-content {
  max-width: 900px;
  width: 100%;
  text-align: center;
  color: white;
}

.home-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.home-subtitle {
  font-size: 1.5rem;
  margin-bottom: 48px;
  opacity: 0.95;
  font-weight: 300;
}

.home-actions {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-bottom: 80px;
}

.home-actions :deep(.ant-btn) {
  height: 56px;
  padding: 0 40px;
  font-size: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.home-actions :deep(.ant-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.home-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-top: 48px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 32px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: white;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: white;
}

.feature-card p {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.9;
  color: white;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-title {
    font-size: 2.5rem;
  }

  .home-subtitle {
    font-size: 1.2rem;
  }

  .home-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .home-actions :deep(.ant-btn) {
    width: 100%;
  }

  .home-features {
    grid-template-columns: 1fr;
  }
}
</style>
