import { verifySessionToken, SessionPayload } from '../src/lib/auth';

export async function getAuthUser(req: Request): Promise<SessionPayload | null> {
  const authHeader = req.headers.get('authorization') || '';
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieToken = cookieHeader.split(';').find(c => c.trim().startsWith('cs_token='))?.split('=')[1];
  const token = authHeader.replace(/^Bearer\s+/i, '') || cookieToken;

  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAdmin(req: Request): Promise<{ user: SessionPayload } | { errorResponse: Response }> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Não autorizado. Autenticação necessária.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  if (user.role !== 'admin') {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Acesso negado. Esta ação exige privilégios de Administrador.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { user };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
