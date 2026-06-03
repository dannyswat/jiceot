import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({
      ext: '.gz',
      algorithm: 'gzip',
      threshold: 0,
      deleteOriginFile: false,
    }),
  ],
  esbuild: {
    legalComments: 'none',
    target: 'es2022',
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})