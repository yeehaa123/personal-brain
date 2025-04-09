import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  outDir: './dist',
  publicDir: './public',
  build: {
    format: 'directory',
  },
});