import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Load configuration from .env file
let authToken = '';
let apiBaseUrl = 'http://localhost:8484';

try {
  const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const authMatch = envFile.match(/REACT_APP_AUTH_TOKEN=(.+)/);
  const urlMatch = envFile.match(/REACT_APP_API_BASE_URL=(.+)/);

  if (authMatch) {
    authToken = authMatch[1].trim();
  }
  if (urlMatch) {
    apiBaseUrl = urlMatch[1].trim();
  }
} catch (err) {
  console.log('Using default API configuration');
}

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
