// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { issueAccessToken } from '../server/lib/jwt';
import { requireAdmin } from '../server/utils';
import { sql } from '../server/db';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)('CS Arena — Security & RBAC Guards', () => {
  let playerToken: string = '';
  let adminToken: string = '';

  beforeAll(async () => {
    if (!hasDatabaseUrl) return;
    const [admin] = await sql`
      SELECT id, email, name, role FROM cs_arena.users WHERE LOWER(email) = 'admin@csarena.com' LIMIT 1;
    `;
    if (admin) {
      const res = await issueAccessToken({
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      adminToken = res.token;
    }

    const [player] = await sql`
      SELECT id, email, name, role FROM cs_arena.users WHERE role = 'PLAYER' AND status = 'ACTIVE' LIMIT 1;
    `;
    if (player) {
      const res = await issueAccessToken({
        userId: player.id,
        email: player.email,
        name: player.name,
        role: 'PLAYER',
        status: 'ACTIVE',
      });
      playerToken = res.token;
    }
  });

  it('Caso 11a: Requisição sem token deve retornar 401 Unauthorized', async () => {
    const req = new Request('http://localhost:5173/api/tournaments/123/close-registration', {
      method: 'POST',
      headers: {},
    });

    const check = await requireAdmin(req);
    expect('errorResponse' in check).toBe(true);
    if ('errorResponse' in check) {
      expect(check.errorResponse.status).toBe(401);
      const data = await check.errorResponse.json();
      expect(data.error).toContain('Não autorizado');
    }
  });

  it('Caso 11b: Usuário jogador (role PLAYER) tentando ação admin deve retornar HTTP 403 Forbidden', async () => {
    if (!playerToken) return;
    const req = new Request('http://localhost:5173/api/tournaments/123/close-registration', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${playerToken}`,
      },
    });

    const check = await requireAdmin(req);
    expect('errorResponse' in check).toBe(true);
    if ('errorResponse' in check) {
      expect(check.errorResponse.status).toBe(403);
      const data = await check.errorResponse.json();
      expect(data.error).toContain('Acesso negado');
    }
  });

  it('Caso 11c: Administrador autenticado (role ADMIN) deve ser autorizado com sucesso', async () => {
    if (!adminToken) return;
    const req = new Request('http://localhost:5173/api/tournaments/123/close-registration', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const check = await requireAdmin(req);
    expect('user' in check).toBe(true);
    if ('user' in check) {
      expect(check.user.role.toUpperCase()).toBe('ADMIN');
      expect(check.user.email).toBe('admin@csarena.com');
    }
  });
});

