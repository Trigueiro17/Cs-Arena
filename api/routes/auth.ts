import { sql } from '../db';
import { comparePassword, createSessionToken, hashPassword, verifySessionToken } from '../../src/lib/auth';

export async function handleAuth(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/api\/auth\/?/, '').replace(/\/+$/, '').split('?')[0];
  if (path.includes('[...')) {
    const pathParam = url.searchParams.getAll('path');
    if (pathParam.length > 0) {
      path = pathParam[pathParam.length - 1];
    }
  }

  if (req.method === 'POST' && path === 'register') {
    try {
      const body = await req.json();
      const { name, email, password } = body;

      if (!name || !email || !password) {
        return new Response(JSON.stringify({ error: 'Nome, e-mail e senha são obrigatórios.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'A senha deve conter no mínimo 6 caracteres.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const existing = await sql`
        SELECT id FROM cs_arena.users WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1;
      `;
      if (existing.length > 0) {
        return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const passwordHash = await hashPassword(password);
      const [newUser] = await sql`
        INSERT INTO cs_arena.users (name, email, password_hash, role)
        VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${passwordHash}, 'user')
        RETURNING id, name, email, role;
      `;

      const token = await createSessionToken({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as 'admin' | 'user',
      });

      return new Response(
        JSON.stringify({
          success: true,
          token,
          user: newUser,
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `cs_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
          },
        }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Erro ao criar conta' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

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
        WHERE LOWER(email) = LOWER(${email.trim()})
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
