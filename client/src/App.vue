<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="navbar-brand">
        <h1>XPMN Explorer</h1>
      </div>
      <div class="navbar-nav">
        <router-link to="/" class="nav-link" active-class="active">
          <span class="icon">📊</span>
          XPMN Editor
        </router-link>
        <router-link to="/tool" class="nav-link" active-class="active">
          <span class="icon">🔧</span>
          RequestBody Converter
        </router-link>
      </div>
    </nav>

    <!-- 路由视图 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// 布局组件，不需要额外的逻辑
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.navbar-brand h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.navbar-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  text-decoration: none;
  color: #6b7280;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f9fafb;
  color: #374151;
}

.nav-link.active {
  background: #3b82f6;
  color: white;
}

.nav-link.active:hover {
  background: #2563eb;
}

.icon {
  font-size: 16px;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
