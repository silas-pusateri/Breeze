import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'axios': 'axios/dist/axios.cjs'
    },
    dedupe: ['react', 'react-dom']
  },
  css: {
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'primereact',
      'quill'
    ],
    exclude: ['primeicons']
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://backend:5001',
        changeOrigin: true,
        secure: false,
      }
    },
    watch: {
      usePolling: true
    },
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['#minpath'],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('primereact') || id.includes('quill')) return 'prime-vendor';
            return 'vendor';
          }
        }
      }
    }
  },
  base: '/'
}); 