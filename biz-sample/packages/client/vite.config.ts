import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 监听所有网络接口，通过 hosts 文件映射到 client.biz.com
    port: 8080,
    strictPort: true,
    allowedHosts: [
      'client.biz.com',
      'localhost',
      '.biz.com', // 允许所有 .biz.com 子域名
    ],
  },
})
