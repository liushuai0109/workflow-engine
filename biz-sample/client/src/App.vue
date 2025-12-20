<template>
  <div id="app">
    <nav class="navbar">
      <router-link to="/register">注册</router-link>
      <router-link to="/account/open">开户</router-link>
      <router-link to="/account/deposit">入金</router-link>
      <router-link to="/trade">交易</router-link>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// App component
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

.navbar {
  background-color: #007bff;
  padding: 15px;
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.navbar a {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.navbar a:hover,
.navbar a.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
}

main {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 10px;
  }

  .navbar a {
    width: 100%;
    text-align: center;
  }

  main {
    padding: 10px;
  }
}
</style>
