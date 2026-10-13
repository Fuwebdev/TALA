import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { processModerationRequest } from './api/moderate';

function moderationApiPlugin(): Plugin {
  return {
    name: 'moderation-api-plugin',
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
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), moderationApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

