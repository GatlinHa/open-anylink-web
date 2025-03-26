import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), svgLoader()],
  base: '/im',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 配置代理
  server: {
    proxy: {
      '/api': {
        // 获取请求中带 /api 的请求
        target: 'http://localhost:8080', // 后台服务器的源
        changeOrigin: true // 修改源
      },
      '/ws': {
        // 获取请求中带 /api 的请求
        target: 'ws://localhost:8080', // 后台服务器的源
        changeOrigin: true // 修改源
      },
      '/oss/': {
        // 获取图片的请求
        target: 'http://127.0.0.1:9001', // 对象存储oss的源
        changeOrigin: true, // 修改源
        rewrite: (path) => path.replace(/^\/oss\//, '')
      }
    }
  },
  // 屏蔽告警：The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  }
})
