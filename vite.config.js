import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: 'all',
    proxy: {
      '/jsonbin': {
        target: 'https://api.jsonbin.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/jsonbin/, '')
      }
    }
  }
})