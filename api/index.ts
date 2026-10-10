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
    // Check if draw action
    // e.g. /api/tournaments/:id/draw-teams or /api/tournaments/:id/draw-bracket
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

// Vercel Serverless Function default export (compatible with Node req/res or Edge Request)
export default async function handler(req: any, res: any) {
  // If running in Node.js serverless environment (Vercel standard Node runtime)
  if (res && typeof res.setHeader === 'function') {
    try {
      const url = `http://${req.headers.host || 'localhost'}${req.url}`;
      
      // Convert node req stream into Request
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : (value as string));
      }

      let body = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const request = new Request(url, {
        method: req.method,
        headers,
        body,
      });

      const response = await router(request);

      res.status(response.status);
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });
      const data = await response.text();
      res.send(data);
    } catch (err: any) {
      console.error('API Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
    return;
  }

  // If called directly with Web Request
  return router(req);
}
