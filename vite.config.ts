import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

/**
 * Vite is used ONLY as the build tool / dev server for the renderer process.
 * The final product is a self-contained Windows desktop application — the
 * renderer is loaded from local files inside Electron, never from a web server.
 */
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the production build works over the file:// protocol.
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
});
