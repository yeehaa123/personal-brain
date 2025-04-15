import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: process.env.WEBSITE_DOMAIN ? `https://${process.env.WEBSITE_DOMAIN}` : 'https://example.com',
  outDir: './dist',
  publicDir: './public',
  build: {
    format: 'directory',
  },
  server: {
    // Allow any host including nip.io domains
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4321'),
    // Allow all hosts and subdomains
    cors: true,
    headers: {
      // Add CORS headers
      'Access-Control-Allow-Origin': '*',
    },
  },
  vite: {
    server: {
      // Allow all hosts including nip.io domains
      hmr: {
        clientPort: parseInt(process.env.PORT || '4321'),
        port: parseInt(process.env.PORT || '4321'),
      },
      // Allow any hostname to access the dev server
      host: '0.0.0.0',
      // Explicitly allow all hosts
      cors: true,
      // Add nip.io and any other domains you might use
      origin: '*',
    },
  },
});