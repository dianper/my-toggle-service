import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiTarget =
  process.env.services__apiservice__http__0 ??
  process.env.VITE_API_BASE_URL ??
  'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/auth': {
        target: apiTarget,
        // Keep original host so backend can generate callback URLs for the public origin.
        changeOrigin: false,
      },
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/alive': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
