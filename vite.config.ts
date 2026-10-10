import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            try {
              // Dynamically import API router
              const { router } = await server.ssrLoadModule('/api/index.ts');
              const host = req.headers.host || 'localhost:5173';
              const fullUrl = `http://${host}${req.url}`;

              // Read request body if present
              let body: string | undefined = undefined;
              if (req.method !== 'GET' && req.method !== 'HEAD') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                }
                body = Buffer.concat(chunks).toString('utf-8');
              }

              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) {
                if (value) {
                  headers.set(key, Array.isArray(value) ? value.join(', ') : (value as string));
                }
              }

              const webReq = new Request(fullUrl, {
                method: req.method,
                headers,
                body,
              });

              const webRes: Response = await router(webReq);

              res.statusCode = webRes.status;
              webRes.headers.forEach((val, key) => {
                res.setHeader(key, val);
              });

              const text = await webRes.text();
              res.end(text);
              return;
            } catch (err: any) {
              console.error('Error handling API request:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'API Internal Server Error' }));
              return;
            }
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
