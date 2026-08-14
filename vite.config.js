import { defineConfig } from 'vite';

export default defineConfig({
  // Base URL para o GitHub Pages (corresponde ao nome do repositório /mmorpg-Mega/)
  base: '/mmorpg-Mega/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
