import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 禁用静态提升以避免 Ant Design Vue 的 ref 警告
          hoistStatic: false
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // 修复 hammerjs 的导入问题
      'hammerjs': 'hammerjs/hammer.js'
    }
  },
  optimizeDeps: {
    exclude: ['diagram-js/lib/navigation/touch'],
    include: ['hammerjs']
  },
  server: {
    host: '0.0.0.0',
    port: 8000,
    cors: true,
    allowedHosts: [
      'api.workflow.com',
      'editor.workflow.com',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://api.workflow.com:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    commonjsOptions: {
      include: [/hammerjs/, /node_modules/]
    },
    // 优化 chunk 分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          'antd': ['ant-design-vue'],
          'antd-icons': ['@ant-design/icons-vue']
        }
      },
      external: ['diagram-js/lib/navigation/touch']
    }
  }
})