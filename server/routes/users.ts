import { z } from 'zod';
import { sql } from '../db';
import { requireAuth, jsonResponse } from '../utils';

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100).optional(),
  nickname: z
    .string()
    .trim()
    .min(2, 'Nickname deve ter no mínimo 2 caracteres')
    .max(32)
    .regex(/^[a-zA-Z0-9_\-.]+$/, 'Nickname contém caracteres inválidos')
    .optional(),
});

export async function handleUsers(req: Request, segments: string[]): Promise<Response> {
  const method = req.method;
  const subAction = segments[0] || '';

  // 1. GET /api/users/me — Profile + stats
  if (subAction === 'me' && method === 'GET') {
    const authCheck = await requireAuth(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    const [user] = await sql`
      SELECT u.id, u.name, u.nickname, u.email, u.role, u.status, u.created_at,
             p.avatar_url, p.preferred_role, p.skill_rating, p.steam_id
      FROM cs_arena.users u
      LEFT JOIN cs_arena.players p ON LOWER(p.nickname) = LOWER(u.nickname)
      WHERE u.id = ${authCheck.user.userId}
      LIMIT 1;
    `;

    if (!user) {
      return jsonResponse({ error: 'Usuário não encontrado.' }, 404);
    }

    // Registrations of this user
    const userRegistrations = await sql`
      SELECT r.id, r.status, r.registered_at, t.id as tournament_id, t.name as tournament_name
      FROM cs_arena.registrations r
      JOIN cs_arena.tournaments t ON r.tournament_id = t.id
      JOIN cs_arena.players p ON r.player_id = p.id
      WHERE LOWER(p.nickname) = LOWER(${user.nickname})
      ORDER BY r.registered_at DESC;
    `;

    return jsonResponse({
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        preferredRole: user.preferred_role,
        skillRating: user.skill_rating,
        steamId: user.steam_id,
        createdAt: user.created_at,
      },
      registrations: userRegistrations,
    });
  }

  // 2. PATCH /api/users/me — Update editable fields (name, nickname)
  if (subAction === 'me' && method === 'PATCH') {
    const authCheck = await requireAuth(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const parsed = updateUserSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || 'Dados inválidos' }, 400);
      }

      const { name, nickname } = parsed.data;

      if (!name && !nickname) {
        return jsonResponse({ error: 'Nenhum campo fornecido para atualização.' }, 400);
      }

      // Check unique nickname if changing
      if (nickname) {
        const existingNick = await sql`
          SELECT id FROM cs_arena.users 
          WHERE LOWER(nickname) = LOWER(${nickname}) AND id != ${authCheck.user.userId} 
          LIMIT 1;
        `;
        if (existingNick.length > 0) {
          return jsonResponse({ error: 'Este nickname já está em uso por outro usuário.' }, 409);
        }
      }

      const [updated] = await sql`
        UPDATE cs_arena.users
        SET 
          name = COALESCE(${name || null}, name),
          nickname = COALESCE(${nickname || null}, nickname),
          updated_at = NOW()
        WHERE id = ${authCheck.user.userId}
        RETURNING id, name, nickname, email, role, status;
      `;

      // Update player profile if nickname changed
      if (nickname) {
        await sql`
          UPDATE cs_arena.players
          SET nickname = ${nickname}
          WHERE LOWER(nickname) = LOWER(${authCheck.user.nickname || ''});
        `;
      }

      return jsonResponse({ user: updated });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao atualizar dados' }, 500);
    }
  }

  return jsonResponse({ error: `Rota de usuário '/api/users/${subAction}' não encontrada.` }, 404);
}
