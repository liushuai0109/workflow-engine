<template>
  <t-config-provider>
    <div id="app">
      <t-tab-bar v-model="activeTab" @change="handleTabChange" class="bottom-nav">
        <t-tab-bar-item value="register" icon="user">
          <span>注册</span>
        </t-tab-bar-item>
        <t-tab-bar-item value="open" icon="file-add">
          <span>开户</span>
        </t-tab-bar-item>
        <t-tab-bar-item value="deposit" icon="wallet">
          <span>入金</span>
        </t-tab-bar-item>
        <t-tab-bar-item value="trade" icon="chart">
          <span>交易</span>
        </t-tab-bar-item>
      </t-tab-bar>
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </t-config-provider>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const activeTab = ref('register')

const routeMap: Record<string, string> = {
  '/register': 'register',
  '/account/open': 'open',
  '/account/deposit': 'deposit',
  '/trade': 'trade',
}

const tabMap: Record<string, string> = {
  register: '/register',
  open: '/account/open',
  deposit: '/account/deposit',
  trade: '/trade',
}

const handleTabChange = (value: string) => {
  const path = tabMap[value]
  if (path) {
    router.push(path)
  }
}

watch(
  () => route.path,
  (path) => {
    const tab = routeMap[path] || 'register'
    activeTab.value = tab
  },
  { immediate: true }
)

onMounted(() => {
  const path = route.path
  const tab = routeMap[path] || 'register'
  activeTab.value = tab
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  padding-bottom: 60px; /* 为底部导航栏留出空间 */
  overflow-y: auto;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
    padding-bottom: 70px;
  }
}
</style>
