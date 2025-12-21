<template>
  <router-view />
</template>

<script setup lang="ts">
// App.vue 作为路由容器
</script>

<style scoped>
/* App.vue 作为路由容器，确保占满全屏 */
</style>

<style>
/* 全局样式，确保 html 和 body 占满全屏 */
html, body {
  margin: 0 !important;
  padding: 0 !important;
  height: 100% !important;
  width: 100% !important;
  overflow: hidden !important;
}

#app {
  height: 100% !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
