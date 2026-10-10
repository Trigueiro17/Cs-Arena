import { handleAuth } from './routes/auth';
import { handleTournaments } from './routes/tournaments';
import { handleDraws } from './routes/draws';
import { handleMatches } from './routes/matches';
import { jsonResponse } from './utils';

export async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/api\/?/, '');
  const segments = pathname.split('/').filter(Boolean);

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const primary = segments[0];

  if (primary === 'auth') {
    return handleAuth(req);
  }

  if (primary === 'tournaments') {
    const tournamentId = segments[1];
    const subAction = segments[2];
    if (tournamentId && (subAction === 'draw-teams' || subAction === 'draw-bracket')) {
      return handleDraws(req, tournamentId, subAction);
    }
    return handleTournaments(req, segments.slice(1));
  }

  if (primary === 'matches') {
    return handleMatches(req, segments.slice(1));
  }

  return jsonResponse({ error: `Rota API '/api/${pathname}' não encontrada.` }, 404);
}

// Vercel Serverless Function handler (works on both Node.js HTTP req/res and Web Request/Response)
export default async function handler(req: any, res?: any) {
  // If running in Node.js serverless environment (Vercel standard Node runtime)
  if (res && (typeof res.setHeader === 'function' || typeof res.writeHead === 'function')) {
    try {
      const url = `http://${req.headers.host || 'localhost'}${req.url}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : (value as string));
      }

      let body: string | undefined = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (typeof req.body === 'string') {
          body = req.body;
        } else if (req.body && typeof req.body === 'object') {
          body = JSON.stringify(req.body);
        } else {
          // Read from Node stream if body not pre-parsed
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          if (chunks.length > 0) {
            body = Buffer.concat(chunks).toString('utf-8');
          }
        }
      }

      const request = new Request(url, {
        method: req.method,
        headers,
        body,
      });

      const response = await router(request);

      res.statusCode = response.status;
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });
      const data = await response.text();
      res.end(data);
    } catch (err: any) {
      console.error('API Error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
    return;
  }

  // If called directly with Web Request
  return router(req);
}
