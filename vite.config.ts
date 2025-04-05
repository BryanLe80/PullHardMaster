import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react']
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'spotify-sdk': ['./src/components/SpotifyPlayer.tsx']
        }
      }
    },
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  server: {
    // This helps with development
    host: true,
    port: 5173
  }
});
