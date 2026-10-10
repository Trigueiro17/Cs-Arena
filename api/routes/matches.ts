import { neon } from '@neondatabase/serverless';
import { jsonResponse, requireAdmin } from '../utils';
import { checkSeriesWinner } from '../../src/lib/tournament-engine';

const sql = neon(process.env.DATABASE_URL || '');

export async function handleMatches(req: Request, segments: string[]): Promise<Response> {
  const method = req.method;
  const matchId = segments[0] || null;
  const subAction = segments[1] || null;

  if (!matchId) {
    return jsonResponse({ error: 'ID da partida é obrigatório.' }, 400);
  }

  // 1. GET /api/matches/:id
  if (!subAction && method === 'GET') {
    const [match] = await sql`
      SELECT 
        m.*,
        r.name as round_name, r.round_number,
        t1.name as team_a_name, t1.seed as team_a_seed,
        t2.name as team_b_name, t2.seed as team_b_seed,
        w.name as winner_name
      FROM cs_arena.matches m
      JOIN cs_arena.bracket_rounds r ON m.round_id = r.id
      LEFT JOIN cs_arena.teams t1 ON m.team_a_id = t1.id
      LEFT JOIN cs_arena.teams t2 ON m.team_b_id = t2.id
      LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
      WHERE m.id = ${matchId};
    `;

    if (!match) return jsonResponse({ error: 'Partida não encontrada.' }, 404);

    const maps = await sql`
      SELECT *
      FROM cs_arena.match_maps
      WHERE match_id = ${matchId}
      ORDER BY order_number ASC;
    `;

    return jsonResponse({ match, maps });
  }

  // 2. POST /api/matches/:id/results — Update map scores & calculate series
  if (subAction === 'results' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const { maps } = body; // Array of { orderNumber, mapName, scoreA, scoreB }

      if (!Array.isArray(maps) || maps.length === 0) {
        return jsonResponse({ error: 'É necessário informar ao menos um mapa.' }, 400);
      }

      // Fetch match
      const [match] = await sql`
        SELECT * FROM cs_arena.matches WHERE id = ${matchId};
      `;

      if (!match) return jsonResponse({ error: 'Partida não encontrada.' }, 404);
      if (!match.team_a_id || !match.team_b_id) {
        return jsonResponse({ error: 'A partida ainda não possui ambas as equipes definidas.' }, 400);
      }

      // Validate series rules
      const seriesCheck = checkSeriesWinner(maps, match.team_a_id, match.team_b_id, match.best_of);
      if (seriesCheck.error) {
        return jsonResponse({ error: seriesCheck.error }, 400);
      }

      // Replace match maps
      await sql`DELETE FROM cs_arena.match_maps WHERE match_id = ${matchId};`;

      for (const m of maps) {
        const winnerId = m.scoreA > m.scoreB ? match.team_a_id : match.team_b_id;
        await sql`
          INSERT INTO cs_arena.match_maps (match_id, order_number, map_name, score_a, score_b, winner_id)
          VALUES (${matchId}, ${m.orderNumber}, ${m.mapName}, ${m.scoreA}, ${m.scoreB}, ${winnerId});
        `;
      }

      // Update match status & winner
      const newStatus = seriesCheck.isCompleted ? 'completed' : 'in_progress';
      const winnerId = seriesCheck.seriesWinnerId;

      const [updatedMatch] = await sql`
        UPDATE cs_arena.matches
        SET 
          status = ${newStatus},
          winner_id = ${winnerId || null},
          completed_at = ${seriesCheck.isCompleted ? new Date().toISOString() : null},
          version = version + 1
        WHERE id = ${matchId}
        RETURNING *;
      `;

      // If series is completed and has a next match, advance winner
      if (seriesCheck.isCompleted && winnerId) {
        if (updatedMatch.next_match_id) {
          if (updatedMatch.next_match_slot === 'team_a') {
            await sql`
              UPDATE cs_arena.matches
              SET team_a_id = ${winnerId}
              WHERE id = ${updatedMatch.next_match_id};
            `;
          } else if (updatedMatch.next_match_slot === 'team_b') {
            await sql`
              UPDATE cs_arena.matches
              SET team_b_id = ${winnerId}
              WHERE id = ${updatedMatch.next_match_id};
            `;
          }
        } else {
          // No next match => this was the Grand Final! Conclude tournament!
          const loserId = winnerId === match.team_a_id ? match.team_b_id : match.team_a_id;

          await sql`
            UPDATE cs_arena.tournaments
            SET status = 'completed', updated_at = NOW()
            WHERE id = ${match.tournament_id};
          `;

          await sql`
            UPDATE cs_arena.teams
            SET status = 'champion'
            WHERE id = ${winnerId};
          `;

          await sql`
            UPDATE cs_arena.teams
            SET status = 'runner_up'
            WHERE id = ${loserId};
          `;
        }
      }

      // Audit Log
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (
          ${authCheck.user.userId}, ${authCheck.user.name}, 'SUBMIT_MATCH_RESULT', 'matches', ${matchId},
          ${JSON.stringify({ matchId, seriesCheck, maps })}
        );
      `;

      return jsonResponse({
        success: true,
        match: updatedMatch,
        series: seriesCheck,
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao registrar resultado da partida' }, 500);
    }
  }

  return jsonResponse({ error: 'Ação não reconhecida.' }, 404);
}
