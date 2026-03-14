import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        host:       './index.html',
        controller: './controller.html'
      }
    }
  },

  server: {
    port: 5173,
    proxy: {
      // Forward all socket.io traffic (including WebSocket upgrade) to the game server
      '/socket.io': {
        target:       'http://localhost:3100',
        ws:           true,
        changeOrigin: true
      }
    }
  }
})
