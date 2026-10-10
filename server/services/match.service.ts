import { sql } from '../db';
import { checkSeriesWinner } from '../../src/lib/tournament-engine';

export interface SubmitMatchResultInput {
  maps: {
    orderNumber: number;
    mapName: string;
    scoreA: number;
    scoreB: number;
  }[];
  evidenceUrl?: string | null;
}

export class MatchService {
  static async getMatch(matchId: string) {
    const [match] = await sql`
      SELECT 
        m.*,
        r.name as round_name, r.round_number,
        t.game_mode, t.team_size, t.name as tournament_name,
        t1.name as team_a_name, t1.seed as team_a_seed,
        t2.name as team_b_name, t2.seed as team_b_seed,
        w.name as winner_name,
        pa.nickname as player_a_name, pa.avatar_url as player_a_avatar,
        pb.nickname as player_b_name, pb.avatar_url as player_b_avatar,
        pw.nickname as winner_player_name, pw.avatar_url as winner_player_avatar
      FROM cs_arena.matches m
      JOIN cs_arena.bracket_rounds r ON m.round_id = r.id
      JOIN cs_arena.tournaments t ON m.tournament_id = t.id
      LEFT JOIN cs_arena.teams t1 ON m.team_a_id = t1.id
      LEFT JOIN cs_arena.teams t2 ON m.team_b_id = t2.id
      LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
      LEFT JOIN cs_arena.players pa ON m.player_a_id = pa.id
      LEFT JOIN cs_arena.players pb ON m.player_b_id = pb.id
      LEFT JOIN cs_arena.players pw ON m.winner_player_id = pw.id
      WHERE m.id = ${matchId};
    `;

    if (!match) return null;

    const maps = await sql`
      SELECT *
      FROM cs_arena.match_maps
      WHERE match_id = ${matchId}
      ORDER BY order_number ASC;
    `;

    return { match, maps };
  }

  static async submitMatchResult(
    matchId: string,
    input: SubmitMatchResultInput,
    actor: { userId: string; name: string }
  ) {
    const { maps, evidenceUrl } = input;

    if (!Array.isArray(maps) || maps.length === 0) {
      throw new Error('É necessário informar os dados do mapa disputado.');
    }

    const [match] = await sql`
      SELECT m.*, t.game_mode, t.team_size
      FROM cs_arena.matches m
      JOIN cs_arena.tournaments t ON m.tournament_id = t.id
      WHERE m.id = ${matchId};
    `;

    if (!match) throw new Error('Partida não encontrada.');

    const is1v1 = match.team_size === 1 || match.game_mode === '1v1';

    // Validate that participants exist
    if (is1v1) {
      if (!match.player_a_id || !match.player_b_id) {
        throw new Error('A partida 1x1 ainda não possui ambos os duelistas definidos.');
      }
    } else {
      if (!match.team_a_id || !match.team_b_id) {
        throw new Error('A partida ainda não possui ambas as equipes definidas.');
      }
    }

    // Validate series winner and ensure no ties
    const participantA = is1v1 ? match.player_a_id : match.team_a_id;
    const participantB = is1v1 ? match.player_b_id : match.team_b_id;

    const seriesCheck = checkSeriesWinner(maps, participantA, participantB, match.best_of || 1);
    if (seriesCheck.error) {
      throw new Error(seriesCheck.error);
    }

    // Replace match maps
    await sql`DELETE FROM cs_arena.match_maps WHERE match_id = ${matchId};`;

    for (const m of maps) {
      const winnerParticipantId = m.scoreA > m.scoreB ? participantA : participantB;
      const winnerTeamId = is1v1
        ? (m.scoreA > m.scoreB ? match.team_a_id : match.team_b_id)
        : winnerParticipantId;
      const winnerPlayerId = is1v1 ? winnerParticipantId : null;

      await sql`
        INSERT INTO cs_arena.match_maps (
          match_id, order_number, map_name, score_a, score_b, winner_id, winner_player_id
        )
        VALUES (
          ${matchId}, ${m.orderNumber}, ${m.mapName}, ${m.scoreA}, ${m.scoreB},
          ${winnerTeamId || null}, ${winnerPlayerId || null}
        );
      `;
    }

    // Determine series winner IDs
    const newStatus = seriesCheck.isCompleted ? 'completed' : 'in_progress';
    const seriesWinnerPartId = seriesCheck.seriesWinnerId;

    let finalWinnerTeamId = null;
    let finalWinnerPlayerId = null;

    if (seriesWinnerPartId) {
      if (is1v1) {
        finalWinnerPlayerId = seriesWinnerPartId;
        finalWinnerTeamId = seriesWinnerPartId === match.player_a_id ? match.team_a_id : match.team_b_id;
      } else {
        finalWinnerTeamId = seriesWinnerPartId;
      }
    }

    const firstMap = maps[0];

    const [updatedMatch] = await sql`
      UPDATE cs_arena.matches
      SET 
        status = ${newStatus},
        winner_id = ${finalWinnerTeamId || null},
        winner_player_id = ${finalWinnerPlayerId || null},
        map_name = COALESCE(${firstMap?.mapName || null}, map_name),
        evidence_url = COALESCE(${evidenceUrl || null}, evidence_url),
        completed_at = ${seriesCheck.isCompleted ? new Date().toISOString() : null},
        version = version + 1
      WHERE id = ${matchId}
      RETURNING *;
    `;

    // Advance winner to next match if series is completed
    if (seriesCheck.isCompleted && seriesWinnerPartId) {
      if (updatedMatch.next_match_id) {
        if (updatedMatch.next_match_slot === 'team_a') {
          await sql`
            UPDATE cs_arena.matches
            SET 
              team_a_id = ${finalWinnerTeamId || null},
              player_a_id = ${finalWinnerPlayerId || null}
            WHERE id = ${updatedMatch.next_match_id};
          `;
        } else if (updatedMatch.next_match_slot === 'team_b') {
          await sql`
            UPDATE cs_arena.matches
            SET 
              team_b_id = ${finalWinnerTeamId || null},
              player_b_id = ${finalWinnerPlayerId || null}
            WHERE id = ${updatedMatch.next_match_id};
          `;
        }
      } else {
        // Grand Final completed -> crown champion and runner-up!
        const loserTeamId = finalWinnerTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;

        await sql`
          UPDATE cs_arena.tournaments
          SET status = 'completed', updated_at = NOW()
          WHERE id = ${match.tournament_id};
        `;

        if (finalWinnerTeamId) {
          await sql`
            UPDATE cs_arena.teams
            SET status = 'champion'
            WHERE id = ${finalWinnerTeamId};
          `;
        }

        if (loserTeamId) {
          await sql`
            UPDATE cs_arena.teams
            SET status = 'runner_up'
            WHERE id = ${loserTeamId};
          `;
        }
      }
    }

    // Audit Log
    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (
        ${actor.userId}, ${actor.name}, 'SUBMIT_MATCH_RESULT', 'matches', ${matchId},
        ${JSON.stringify({ matchId, seriesCheck, maps, evidenceUrl })}
      );
    `;

    return {
      success: true,
      match: updatedMatch,
      series: seriesCheck,
      tournamentCompleted: Boolean(!updatedMatch.next_match_id && seriesCheck.isCompleted),
    };
  }
}
