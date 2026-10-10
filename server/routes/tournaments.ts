import { sql } from '../db';
import { jsonResponse, requireAdmin, getAuthUser } from '../utils';
import {
  TournamentService,
  RegistrationService,
  BracketService,
  RankingService,
} from '../services';

export async function handleTournaments(req: Request, segments: string[]): Promise<Response> {
  const method = req.method;
  const url = new URL(req.url);

  // Segment 0 is usually '' or an id (e.g. /api/tournaments or /api/tournaments/:id)
  const tournamentId = segments[0] || null;
  const subAction = segments[1] || null;

  // 1. GET /api/tournaments — List all (with optional gameMode filter)
  if (!tournamentId && method === 'GET') {
    try {
      const gameMode = url.searchParams.get('gameMode') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const list = await TournamentService.listTournaments({ gameMode, status });
      return jsonResponse({ tournaments: list });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao listar campeonatos' }, 500);
    }
  }

  // 2. POST /api/tournaments — Create tournament (Admin only)
  if (!tournamentId && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const created = await TournamentService.createTournament(body, {
        userId: authCheck.user.userId,
        name: authCheck.user.name,
      });
      return jsonResponse({ tournament: created }, 201);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao criar campeonato' }, 400);
    }
  }

  // If tournamentId is specified:
  if (tournamentId) {
    // 3. GET /api/tournaments/:id — Get details
    if (!subAction && method === 'GET') {
      try {
        const tournament = await TournamentService.getTournament(tournamentId);
        if (!tournament) return jsonResponse({ error: 'Campeonato não encontrado.' }, 404);
        return jsonResponse({ tournament });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao buscar campeonato' }, 500);
      }
    }

    // 4. PATCH /api/tournaments/:id — Update tournament (Admin only)
    if (!subAction && method === 'PATCH') {
      const authCheck = await requireAdmin(req);
      if ('errorResponse' in authCheck) return authCheck.errorResponse;

      try {
        const body = await req.json();
        const updated = await TournamentService.updateTournament(tournamentId, body, {
          userId: authCheck.user.userId,
          name: authCheck.user.name,
        });
        return jsonResponse({ tournament: updated });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao atualizar campeonato' }, 400);
      }
    }

    // 5. POST /api/tournaments/:id/register — Player registration
    if (subAction === 'register' && method === 'POST') {
      try {
        const body = await req.json();
        const result = await RegistrationService.registerPlayer(tournamentId, body);
        return jsonResponse({ success: true, ...result }, 201);
      } catch (err: any) {
        const status = err.message?.includes('já está inscrito') ? 409 : 400;
        return jsonResponse({ error: err.message || 'Erro na inscrição' }, status);
      }
    }

    // 6. POST /api/tournaments/:id/cancel-registration or DELETE /api/tournaments/:id/register
    if (
      (subAction === 'cancel-registration' && method === 'POST') ||
      (subAction === 'register' && method === 'DELETE')
    ) {
      try {
        const authUser = await getAuthUser(req);
        const queryPlayerId = url.searchParams.get('playerId');
        let bodyPlayerId: string | undefined;
        try {
          const body = await req.json();
          bodyPlayerId = body.playerId;
        } catch {
          // empty body is ok if playerId is in query string
        }
        const playerId = queryPlayerId || bodyPlayerId;

        if (!playerId) {
          return jsonResponse({ error: 'ID do jogador é obrigatório para cancelamento.' }, 400);
        }

        const result = await RegistrationService.cancelRegistration(tournamentId, playerId, {
          userId: authUser?.userId,
          name: authUser?.name,
        });
        return jsonResponse(result);
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao cancelar inscrição' }, 400);
      }
    }

    // 7. GET /api/tournaments/:id/registrations (and /registrations/projection)
    if (subAction === 'registrations' && method === 'GET') {
      try {
        const result = await RegistrationService.getRegistrations(tournamentId);
        return jsonResponse(result);
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao buscar inscrições' }, 500);
      }
    }

    // 8. POST /api/tournaments/:id/close-registration — Close registration (Admin only)
    if (subAction === 'close-registration' && method === 'POST') {
      const authCheck = await requireAdmin(req);
      if ('errorResponse' in authCheck) return authCheck.errorResponse;

      try {
        const updated = await TournamentService.closeRegistration(tournamentId, {
          userId: authCheck.user.userId,
          name: authCheck.user.name,
        });
        return jsonResponse({ tournament: updated });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao encerrar inscrições' }, 400);
      }
    }

    // 9. GET /api/tournaments/:id/teams — List drawn teams/duelists and members
    if (subAction === 'teams' && method === 'GET') {
      try {
        const teamsList = await sql`
          SELECT 
            t.id, t.name, t.seed, t.status, t.captain_id,
            p.nickname as captain_nickname, p.avatar_url as captain_avatar
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
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao buscar equipes' }, 500);
      }
    }

    // 10. GET /api/tournaments/:id/bracket — Bracket with rounds and matches
    if (subAction === 'bracket' && method === 'GET') {
      try {
        const result = await BracketService.getBracket(tournamentId);
        return jsonResponse(result);
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao buscar chaveamento' }, 500);
      }
    }

    // 11. GET /api/tournaments/:id/ranking — Ranking, champion and podium
    if (subAction === 'ranking' && method === 'GET') {
      try {
        const ranking = await RankingService.getTournamentRanking(tournamentId);
        return jsonResponse({ ranking, rankings: ranking?.rankings || [] });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao buscar classificação' }, 500);
      }
    }

    // 12. GET /api/tournaments/:id/audit — Audit logs (Admin only)
    if (subAction === 'audit' && method === 'GET') {
      const authCheck = await requireAdmin(req);
      if ('errorResponse' in authCheck) return authCheck.errorResponse;

      try {
        const logs = await sql`
          SELECT id, actor_id, actor_name, action, entity_type, entity_id, before_state, after_state, created_at
          FROM cs_arena.audit_logs
          WHERE entity_id = ${tournamentId} OR (after_state->>'tournamentId') = ${tournamentId}
          ORDER BY created_at DESC
          LIMIT 100;
        `;

        return jsonResponse({ auditLogs: logs });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Erro ao buscar auditoria' }, 500);
      }
    }
  }

  return jsonResponse({ error: 'Endpoint não encontrado.' }, 404);
}
