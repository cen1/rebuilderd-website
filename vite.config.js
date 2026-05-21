import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import http from 'http';

// Load configuration: process.env takes priority over .env file
let authToken = '';
let apiBaseUrl = 'http://localhost:8484';

try {
  const envPath = path.join(process.cwd(), '.env');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const authMatch = envFile.match(/^REACT_APP_AUTH_TOKEN=(.+)$/m);
  const urlMatch = envFile.match(/^REACT_APP_API_BASE_URL=(.+)$/m);

  if (authMatch) authToken = authMatch[1].trim();
  if (urlMatch) apiBaseUrl = urlMatch[1].trim();
} catch (err) {
  console.log('No .env file found, using defaults');
}

// Environment variables override .env file
if (process.env.REACT_APP_AUTH_TOKEN) authToken = process.env.REACT_APP_AUTH_TOKEN;
if (process.env.REACT_APP_API_BASE_URL) apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

console.log('Using API base URL:', apiBaseUrl);

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiBaseUrl,
        changeOrigin: true,
        agent: new http.Agent({
          family: 4, // Force IPv4
          keepAlive: true
        }),
        configure: (proxy, options) => {
          if (authToken) {
            proxy.on('proxyReq', (proxyReq) => {
              const existingCookie = proxyReq.getHeader('Cookie') || '';
              const authCookie = `auth=${authToken}`;
              const newCookie = existingCookie ? `${existingCookie}; ${authCookie}` : authCookie;
              proxyReq.setHeader('Cookie', newCookie);
            });
          }
        }
      },
      '/upstream/debian': {
        target: 'https://reproduce.debian.net',
        changeOrigin: true,
        rewrite: (path) => {
          // /upstream/debian/amd64/dashboard -> /amd64/api/v1/dashboard
          // /upstream/debian/all/dashboard -> /all/api/v1/dashboard
          return path.replace(/^\/upstream\/debian\/([^/]+)\/dashboard/, '/$1/api/v1/dashboard');
        }
      },
      '/upstream/arch': {
        target: 'https://reproducible.archlinux.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upstream\/arch/, '/api/v0')
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
