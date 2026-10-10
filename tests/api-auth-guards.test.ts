import { describe, it, expect } from 'vitest';
import { createSessionToken } from '../src/lib/auth';
import { requireAdmin, getAuthUser } from '../api/utils';

describe('CS Arena — Security & RBAC Guards', () => {
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

  it('Caso 11b: Usuário jogador (role user) tentando ação admin deve retornar HTTP 403 Forbidden', async () => {
    const playerToken = await createSessionToken({
      userId: 'user-player-1',
      email: 'player@csarena.com',
      name: 'Player Comum',
      role: 'user',
    });

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

  it('Caso 11c: Administrador autenticado (role admin) deve ser autorizado com sucesso', async () => {
    const adminToken = await createSessionToken({
      userId: 'admin-user-1',
      email: 'admin@csarena.com',
      name: 'Admin Master',
      role: 'admin',
    });

    const req = new Request('http://localhost:5173/api/tournaments/123/close-registration', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const check = await requireAdmin(req);
    expect('user' in check).toBe(true);
    if ('user' in check) {
      expect(check.user.role).toBe('admin');
      expect(check.user.email).toBe('admin@csarena.com');
    }
  });
});
