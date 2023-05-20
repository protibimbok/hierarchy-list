import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'docs', // Output directory for your example build (to be published on GitHub Pages)
  },
  base: '/hierarchy-list/', // Change this to match your GitHub Pages URL
});
