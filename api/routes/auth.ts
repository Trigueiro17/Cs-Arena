import { neon } from '@neondatabase/serverless';
import { comparePassword, createSessionToken, hashPassword, verifySessionToken } from '../../src/lib/auth';

const sql = neon(process.env.DATABASE_URL || '');

export async function handleAuth(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/auth\/?/, '');

  if (req.method === 'POST' && path === 'login') {
    try {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'E-mail e senha são obrigatórios.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const users = await sql`
        SELECT id, email, password_hash, name, role
        FROM cs_arena.users
        WHERE email = ${email}
        LIMIT 1;
      `;

      if (users.length === 0) {
        return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const user = users[0];
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const token = await createSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'user',
      });

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `cs_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
          },
        }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Erro no login' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'GET' && path === 'me') {
    const authHeader = req.headers.get('authorization') || '';
    const cookieHeader = req.headers.get('cookie') || '';
    const cookieToken = cookieHeader.split(';').find(c => c.trim().startsWith('cs_token='))?.split('=')[1];
    const token = authHeader.replace(/^Bearer\s+/i, '') || cookieToken;

    if (!token) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await verifySessionToken(token);
    return new Response(JSON.stringify({ user: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST' && path === 'logout') {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `cs_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
