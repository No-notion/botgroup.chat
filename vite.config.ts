import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react()
  ],
  base: '/',
  server: {
    port: 9000,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库
          'ui-vendor': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-label',
          ],
          // Markdown 渲染 (仅聊天页面需要)
          'markdown': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex'],
          // KaTeX 数学公式 (仅聊天页面需要)
          'katex': ['katex'],
          // 图片生成 (仅分享海报需要)
          'image-utils': ['html2canvas', 'dom-to-image', 'dom-to-image-more'],
          // OpenAI SDK
          'openai': ['openai'],
          // 阿里云 SDK (仅登录需要)
          'aliyun': ['@alicloud/credentials', '@alicloud/dysmsapi20170525'],
          // 图标库
          'icons': ['lucide-react'],
          // 状态管理
          'zustand': ['zustand'],
        }
      }
    }
  }
})
