import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { processModerationRequest } from './api/moderate';
import { processGeocodeRequest } from './api/geocode';
import { processReportAnalysis } from './api/report';
import { processAppealRequest } from './api/appeal';

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/moderate' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(bodyStr || '{}');
              const result = await processModerationRequest(parsed.text);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Server error' }));
            }
          });
          return;
        }

        if (req.url === '/api/report' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(bodyStr || '{}');
              const result = await processReportAnalysis(parsed);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Report processing error' }));
            }
          });
          return;
        }

        if (req.url === '/api/appeal' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(bodyStr || '{}');
              const result = await processAppealRequest(parsed);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Appeal processing error' }));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/geocode') && req.method === 'GET') {
          try {
            const url = new URL(req.url, 'http://localhost:5173');
            const lat = parseFloat(url.searchParams.get('lat') || '');
            const lng = parseFloat(url.searchParams.get('lon') || url.searchParams.get('lng') || '');
            const zoom = parseInt(url.searchParams.get('zoom') || '18', 10);
            const result = await processGeocodeRequest({ lat, lng, zoom });
            res.statusCode = result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.body));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Geocoding failed' }));
          }
          return;
        }

        next();
      });
    },
  };
}



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

