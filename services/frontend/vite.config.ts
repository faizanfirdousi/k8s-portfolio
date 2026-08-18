import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['three'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/about': 'http://localhost:8080',
      '/projects': 'http://localhost:8080',
      '/skills': 'http://localhost:8080',
      '/blog': 'http://localhost:8080',
      '/contact': 'http://localhost:8080',
    },
  },
})
