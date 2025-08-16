const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();

// Load configuration from .env file
let authToken = '';
let apiBaseUrl = 'http://192.168.1.241:8484';

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const authMatch = envFile.match(/REACT_APP_AUTH_TOKEN=(.+)/);
  const urlMatch = envFile.match(/REACT_APP_API_BASE_URL=(.+)/);
  
  if (authMatch) {
    authToken = authMatch[1].trim();
  }
  if (urlMatch) {
    apiBaseUrl = urlMatch[1].trim();
  }
} catch (err) {
  console.log('Using default configuration');
}

console.log(`🔧 Configuration:`);
console.log(`   API proxy: /api/* → ${apiBaseUrl}`);
if (authToken) {
  console.log('   Auth token: configured');
} else {
  console.log('   Auth token: not configured');
}

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Proxy API requests to rebuilderd backend
const apiProxy = createProxyMiddleware({
  target: apiBaseUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Keep the /api prefix
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`🔄 ${req.method} ${req.originalUrl} → ${apiBaseUrl}${req.originalUrl}`);
    if (authToken) {
      const existingCookie = proxyReq.getHeader('Cookie') || '';
      const authCookie = `auth=${authToken}`;
      const newCookie = existingCookie ? `${existingCookie}; ${authCookie}` : authCookie;
      proxyReq.setHeader('Cookie', newCookie);
    }
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`✅ ${req.method} ${req.originalUrl} → ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`❌ API proxy error: ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: 'API proxy error', message: err.message });
    }
  }
});

app.use('/api', apiProxy);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📁 Static files: ./public/`);
  console.log(`🔄 API proxy: /api/* → ${apiBaseUrl}`);
  console.log(`\n💡 Usage:`);
  console.log(`   Open: http://localhost:${PORT}`);
  console.log(`   API:  http://localhost:${PORT}/api/...`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});