import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 8000,
    cors: true,
    allowedHosts: [
      'dev.simonsliu.woa.com'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})