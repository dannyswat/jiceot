import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Enforce strict TypeScript compilation
    legalComments: 'none',
    target: 'es2022',
  },
  build: {
    // Enable source maps for better debugging
    sourcemap: true,
    // Stricter build settings
    target: 'es2022',
    // Fail build on TypeScript errors
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
    // Proxy API requests to the backend server
    proxy: {
      '/api': 'http://localhost:8080',
    },
  }
})
