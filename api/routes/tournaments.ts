import { neon } from '@neondatabase/serverless';
import { jsonResponse, requireAdmin, getAuthUser } from '../utils';

const sql = neon(process.env.DATABASE_URL || '');

export async function handleTournaments(req: Request, segments: string[]): Promise<Response> {
  const method = req.method;

  // Segment 0 is usually '' or an id (e.g. /api/tournaments or /api/tournaments/:id)
  const tournamentId = segments[0] || null;
  const subAction = segments[1] || null;

  // 1. GET /api/tournaments — List all
  if (!tournamentId && method === 'GET') {
    const list = await sql`
      SELECT 
        t.id, t.name, t.slug, t.description, t.format, t.team_size, t.best_of, t.status, t.created_at,
        COUNT(r.id)::int as registrations_count
      FROM cs_arena.tournaments t
      LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id
      GROUP BY t.id
      ORDER BY t.created_at DESC;
    `;
    return jsonResponse({ tournaments: list });
  }

  // 2. POST /api/tournaments — Create tournament (Admin only)
  if (!tournamentId && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const { name, slug, description, bestOf = 1, rules } = body;

      if (!name || !slug) {
        return jsonResponse({ error: 'Nome e slug são obrigatórios.' }, 400);
      }

      const [created] = await sql`
        INSERT INTO cs_arena.tournaments (name, slug, description, best_of, rules, status, created_by)
        VALUES (${name}, ${slug}, ${description || null}, ${bestOf}, ${rules || null}, 'registration_open', ${authCheck.user.userId})
        RETURNING *;
      `;

      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (${authCheck.user.userId}, ${authCheck.user.name}, 'CREATE_TOURNAMENT', 'tournaments', ${created.id}, ${JSON.stringify(created)});
      `;

      return jsonResponse({ tournament: created }, 201);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao criar campeonato' }, 400);
    }
  }

  // If tournamentId is specified:
  if (tournamentId) {
    // 3. GET /api/tournaments/:id — Get details
    if (!subAction && method === 'GET') {
      const [t] = await sql`
        SELECT 
          t.*,
          COUNT(DISTINCT r.id)::int as registrations_count,
          COUNT(DISTINCT tm.id)::int as teams_count
        FROM cs_arena.tournaments t
        LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id
        LEFT JOIN cs_arena.teams tm ON t.id = tm.tournament_id
        WHERE t.id = ${tournamentId} OR t.slug = ${tournamentId}
        GROUP BY t.id;
      `;

      if (!t) return jsonResponse({ error: 'Campeonato não encontrado.' }, 404);
      return jsonResponse({ tournament: t });
    }

    // 4. PATCH /api/tournaments/:id — Update tournament (Admin only)
    if (!subAction && method === 'PATCH') {
      const authCheck = await requireAdmin(req);
      if ('errorResponse' in authCheck) return authCheck.errorResponse;

      const body = await req.json();
      const { name, description, rules, status } = body;

      const [updated] = await sql`
        UPDATE cs_arena.tournaments
        SET 
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          rules = COALESCE(${rules}, rules),
          status = COALESCE(${status}, status),
          updated_at = NOW()
        WHERE id = ${tournamentId}
        RETURNING *;
      `;

      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (${authCheck.user.userId}, ${authCheck.user.name}, 'UPDATE_TOURNAMENT', 'tournaments', ${tournamentId}, ${JSON.stringify(updated)});
      `;

      return jsonResponse({ tournament: updated });
    }

    // 5. POST /api/tournaments/:id/register — Player registration
    if (subAction === 'register' && method === 'POST') {
      try {
        const body = await req.json();
        const { nickname, steamId, preferredRole = 'Flex', avatarUrl } = body;

        if (!nickname || !nickname.trim()) {
          return jsonResponse({ error: 'Nickname é obrigatório.' }, 400);
        }

        // Fetch or create player
        let [player] = await sql`
          SELECT id, nickname FROM cs_arena.players WHERE LOWER(nickname) = LOWER(${nickname.trim()}) LIMIT 1;
        `;

        if (!player) {
          const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname.trim())}`;
          [player] = await sql`
            INSERT INTO cs_arena.players (nickname, steam_id, avatar_url, preferred_role)
            VALUES (${nickname.trim()}, ${steamId || null}, ${avatar}, ${preferredRole})
            RETURNING id, nickname;
          `;
        }

        // Check if already registered
        const existing = await sql`
          SELECT id FROM cs_arena.registrations
          WHERE tournament_id = ${tournamentId} AND player_id = ${player.id};
        `;

        if (existing.length > 0) {
          return jsonResponse({ error: 'Este jogador já está inscrito neste campeonato.' }, 409);
        }

        // Insert registration
        const [reg] = await sql`
          INSERT INTO cs_arena.registrations (tournament_id, player_id, status)
          VALUES (${tournamentId}, ${player.id}, 'confirmed')
          RETURNING *;
        `;

        await sql`
          INSERT INTO cs_arena.audit_logs (action, entity_type, entity_id, after_state)
          VALUES ('PLAYER_REGISTERED', 'registrations', ${reg.id}, ${JSON.stringify({ tournamentId, playerId: player.id, nickname })});
        `;

        return jsonResponse({ success: true, registration: reg, player }, 201);
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro na inscrição' }, 400);
      }
    }

    // 6. GET /api/tournaments/:id/registrations — List players
    if (subAction === 'registrations' && method === 'GET') {
      const list = await sql`
        SELECT 
          r.id as registration_id, r.status, r.registered_at,
          p.id as player_id, p.nickname, p.steam_id, p.avatar_url, p.preferred_role, p.skill_rating
        FROM cs_arena.registrations r
        JOIN cs_arena.players p ON r.player_id = p.id
        WHERE r.tournament_id = ${tournamentId}
        ORDER BY r.registered_at ASC;
      `;
      return jsonResponse({ registrations: list });
    }

    // 7. POST /api/tournaments/:id/close-registration — Close registration (Admin only)
    if (subAction === 'close-registration' && method === 'POST') {
      const authCheck = await requireAdmin(req);
      if ('errorResponse' in authCheck) return authCheck.errorResponse;

      const [updated] = await sql`
        UPDATE cs_arena.tournaments
        SET status = 'registration_closed', updated_at = NOW()
        WHERE id = ${tournamentId}
        RETURNING *;
      `;

      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (${authCheck.user.userId}, ${authCheck.user.name}, 'CLOSE_REGISTRATION', 'tournaments', ${tournamentId}, ${JSON.stringify(updated)});
      `;

      return jsonResponse({ tournament: updated });
    }

    // 8. GET /api/tournaments/:id/teams — List drawn teams and members
    if (subAction === 'teams' && method === 'GET') {
      const teamsList = await sql`
        SELECT 
          t.id, t.name, t.seed, t.status, t.captain_id,
          p.nickname as captain_nickname
        FROM cs_arena.teams t
        LEFT JOIN cs_arena.players p ON t.captain_id = p.id
        WHERE t.tournament_id = ${tournamentId}
        ORDER BY t.seed ASC, t.created_at ASC;
      `;

      const membersList = await sql`
        SELECT 
          tm.team_id, tm.is_captain,
          p.id as player_id, p.nickname, p.preferred_role, p.skill_rating, p.avatar_url
        FROM cs_arena.team_members tm
        JOIN cs_arena.players p ON tm.player_id = p.id
        WHERE tm.tournament_id = ${tournamentId}
        ORDER BY tm.is_captain DESC, p.nickname ASC;
      `;

      // Group members by team
      const teamMap = new Map();
      for (const t of teamsList) {
        teamMap.set(t.id, { ...t, members: [] });
      }

      for (const m of membersList) {
        const team = teamMap.get(m.team_id);
        if (team) {
          team.members.push(m);
        }
      }

      // Also get reserves
      const reserves = await sql`
        SELECT 
          r.id, p.id as player_id, p.nickname, p.preferred_role, p.skill_rating, p.avatar_url
        FROM cs_arena.registrations r
        JOIN cs_arena.players p ON r.player_id = p.id
        WHERE r.tournament_id = ${tournamentId} AND r.status = 'reserve'
        ORDER BY p.skill_rating DESC;
      `;

      return jsonResponse({
        teams: Array.from(teamMap.values()),
        reserves,
      });
    }

    // 9. GET /api/tournaments/:id/bracket — Bracket with rounds and matches
    if (subAction === 'bracket' && method === 'GET') {
      const rounds = await sql`
        SELECT id, round_number, name
        FROM cs_arena.bracket_rounds
        WHERE tournament_id = ${tournamentId}
        ORDER BY round_number ASC;
      `;

      const matchesList = await sql`
        SELECT 
          m.id, m.round_id, m.bracket_position, m.is_bye, m.best_of, m.status,
          m.next_match_id, m.next_match_slot, m.winner_id,
          t1.id as team_a_id, t1.name as team_a_name, t1.seed as team_a_seed,
          t2.id as team_b_id, t2.name as team_b_name, t2.seed as team_b_seed,
          w.name as winner_name
        FROM cs_arena.matches m
        LEFT JOIN cs_arena.teams t1 ON m.team_a_id = t1.id
        LEFT JOIN cs_arena.teams t2 ON m.team_b_id = t2.id
        LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY m.bracket_position ASC;
      `;

      const mapsList = await sql`
        SELECT mm.*
        FROM cs_arena.match_maps mm
        JOIN cs_arena.matches m ON mm.match_id = m.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY mm.match_id, mm.order_number ASC;
      `;

      // Group maps by match
      const mapsByMatch = new Map();
      for (const mapItem of mapsList) {
        if (!mapsByMatch.has(mapItem.match_id)) {
          mapsByMatch.set(mapItem.match_id, []);
        }
        mapsByMatch.get(mapItem.match_id).push(mapItem);
      }

      const matchesWithMaps = matchesList.map(m => ({
        ...m,
        maps: mapsByMatch.get(m.id) || [],
      }));

      return jsonResponse({
        rounds,
        matches: matchesWithMaps,
      });
    }

    // 10. GET /api/tournaments/:id/audit — Audit logs (Admin only)
    if (subAction === 'audit' && method === 'GET') {
      const authCheck = await requireAdmin(req);
      if ('errorResponse' in authCheck) return authCheck.errorResponse;

      const logs = await sql`
        SELECT id, actor_id, actor_name, action, entity_type, entity_id, before_state, after_state, created_at
        FROM cs_arena.audit_logs
        WHERE entity_id = ${tournamentId} OR (after_state->>'tournamentId') = ${tournamentId}
        ORDER BY created_at DESC
        LIMIT 100;
      `;

      return jsonResponse({ auditLogs: logs });
    }
  }

  return jsonResponse({ error: 'Endpoint não encontrado.' }, 404);
}
