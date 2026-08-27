import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base URL para o GitHub Pages (corresponde ao nome do repositório /mmorpg-Mega/)
  base: '/mmorpg-Mega/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname || '.', 'index.html'),
        editor: resolve(import.meta.dirname || '.', 'sprite-editor.html'),
        mapEditor: resolve(import.meta.dirname || '.', 'map-editor.html')
      }
    }
  }
});
