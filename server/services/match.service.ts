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

  static async updateMatchMap(matchId: string, mapName: string) {
    if (!mapName || !mapName.trim()) {
      throw new Error('Nome do mapa é obrigatório.');
    }
    const cleanMap = mapName.trim();

    const [match] = await sql`
      SELECT id, status FROM cs_arena.matches WHERE id = ${matchId};
    `;
    if (!match) throw new Error('Partida não encontrada.');

    await sql`
      UPDATE cs_arena.matches
      SET map_name = ${cleanMap}
      WHERE id = ${matchId};
    `;

    const [existing] = await sql`
      SELECT id FROM cs_arena.match_maps WHERE match_id = ${matchId} AND order_number = 1;
    `;
    if (existing) {
      await sql`
        UPDATE cs_arena.match_maps
        SET map_name = ${cleanMap}
        WHERE id = ${existing.id};
      `;
    } else {
      await sql`
        INSERT INTO cs_arena.match_maps (match_id, order_number, map_name, score_a, score_b)
        VALUES (${matchId}, 1, ${cleanMap}, 0, 0);
      `;
    }

    return { success: true, mapName: cleanMap };
  }

  static async updateLiveScore(
    matchId: string,
    input: {
      scoreA?: number;
      scoreB?: number;
      phase?: string;
      serverIp?: string;
      serverPassword?: string;
    }
  ) {
    const [match] = await sql`
      SELECT id, status, live_score_a, live_score_b FROM cs_arena.matches WHERE id = ${matchId};
    `;
    if (!match) throw new Error('Partida não encontrada.');

    const newScoreA = input.scoreA !== undefined ? Math.max(0, Number(input.scoreA)) : match.live_score_a ?? 0;
    const newScoreB = input.scoreB !== undefined ? Math.max(0, Number(input.scoreB)) : match.live_score_b ?? 0;
    const newPhase = input.phase || (match.status === 'completed' ? 'completed' : 'live');
    const newStatus =
      match.status === 'completed'
        ? 'completed'
        : newPhase === 'live' || newScoreA > 0 || newScoreB > 0
        ? 'in_progress'
        : match.status;

    await sql`
      UPDATE cs_arena.matches
      SET 
        live_score_a = ${newScoreA},
        live_score_b = ${newScoreB},
        live_phase = ${newPhase},
        status = ${newStatus},
        server_ip = COALESCE(${input.serverIp ?? null}, server_ip),
        server_password = COALESCE(${input.serverPassword ?? null}, server_password)
      WHERE id = ${matchId};
    `;

    // Also update order 1 in match_maps for consistency
    await sql`
      UPDATE cs_arena.match_maps
      SET score_a = ${newScoreA}, score_b = ${newScoreB}
      WHERE match_id = ${matchId} AND order_number = 1;
    `;

    return {
      success: true,
      matchId,
      scoreA: newScoreA,
      scoreB: newScoreB,
      phase: newPhase,
      status: newStatus,
    };
  }

  static async updateServerConfig(matchId: string, serverIp: string, serverPassword?: string) {
    await sql`
      UPDATE cs_arena.matches
      SET server_ip = ${serverIp.trim() || null}, server_password = ${serverPassword?.trim() || null}
      WHERE id = ${matchId};
    `;
    return { success: true, serverIp, serverPassword };
  }

  static async handleGSIPayload(matchId: string, payload: any) {
    const [match] = await sql`
      SELECT m.id, m.map_name, m.status, m.tournament_id, t.game_mode
      FROM cs_arena.matches m
      JOIN cs_arena.tournaments t ON m.tournament_id = t.id
      WHERE m.id = ${matchId};
    `;
    if (!match) throw new Error('Partida não encontrada para GSI.');

    let scoreA = 0;
    let scoreB = 0;
    let phase = 'live';
    let mapFromGSI: string | null = null;

    if (payload.map) {
      phase = payload.map.phase || 'live';
      mapFromGSI = payload.map.name || null;
      const ctScore = Number(payload.map.team_ct?.score ?? 0);
      const tScore = Number(payload.map.team_t?.score ?? 0);
      scoreA = ctScore;
      scoreB = tScore;
    } else if (payload.team1 !== undefined || payload.team2 !== undefined) {
      scoreA = Number(payload.team1?.score ?? payload.scoreA ?? 0);
      scoreB = Number(payload.team2?.score ?? payload.scoreB ?? 0);
      mapFromGSI = payload.map_name || null;
    } else if (payload.scoreA !== undefined) {
      scoreA = Number(payload.scoreA);
      scoreB = Number(payload.scoreB ?? 0);
    }

    if (mapFromGSI && !match.map_name) {
      await MatchService.updateMatchMap(matchId, mapFromGSI);
    }

    return await MatchService.updateLiveScore(matchId, {
      scoreA,
      scoreB,
      phase,
    });
  }

  static generateGSIConfig(matchId: string, origin: string) {
    return `"CS Arena GSI v1.0"
{
 "uri" "${origin}/api/matches/${matchId}/gsi"
 "timeout" "5.0"
 "buffer"  "0.1"
 "throttle" "0.5"
 "heartbeat" "15.0"
 "data"
 {
   "provider"            "1"
   "map"                 "1"
   "round"               "1"
   "player_id"           "1"
   "allplayers_id"       "1"
   "allplayers_match_stats" "1"
 }
}`;
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
