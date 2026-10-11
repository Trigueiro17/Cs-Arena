import { sql } from '../db';
import { generateSingleEliminationBracket, GameMode } from '../../src/lib/tournament-engine';

export class BracketService {
  static async generateBracket(
    tournamentId: string,
    actor: { userId: string; name: string }
  ) {
    const [tournament] = await sql`
      SELECT id, name, team_size, game_mode, best_of
      FROM cs_arena.tournaments
      WHERE id = ${tournamentId};
    `;

    if (!tournament) throw new Error('Campeonato não encontrado.');

    const teamSize = Number(tournament.team_size) || 5;
    const gameMode: GameMode = (tournament.game_mode || '5v5') as GameMode;
    const is1v1 = teamSize === 1 || gameMode === '1v1';
    const bestOf = 1; // Strict rule: MD1

    // Fetch teams
    const teams = await sql`
      SELECT t.id, t.name, t.seed, t.captain_id
      FROM cs_arena.teams t
      WHERE t.tournament_id = ${tournamentId}
      ORDER BY t.seed ASC;
    `;

    if (teams.length < 2) {
      throw new Error(
        is1v1
          ? 'É necessário ter no mínimo 2 duelistas cadastrados para gerar a chave de confrontos 1x1.'
          : 'É necessário ter no mínimo 2 equipes para gerar a chave de confrontos.'
      );
    }

    // Clean existing bracket if re-drawing
    await sql`DELETE FROM cs_arena.bracket_rounds WHERE tournament_id = ${tournamentId};`;

    // Map participants: in 1v1 we use captain_id as player ID
    const participants = teams.map((t: any) => ({
      id: is1v1 && t.captain_id ? t.captain_id : t.id,
      seed: t.seed,
      name: t.name,
      teamId: t.id,
      playerId: t.captain_id,
    }));

    // Generate bracket with BYEs
    const generated = generateSingleEliminationBracket(participants, bestOf, is1v1);

    // Insert bracket rounds
    const roundIdMap = new Map<number, string>();
    for (const r of generated.rounds) {
      const [insertedRound] = await sql`
        INSERT INTO cs_arena.bracket_rounds (tournament_id, round_number, name)
        VALUES (${tournamentId}, ${r.roundNumber}, ${r.name})
        RETURNING id;
      `;
      roundIdMap.set(r.roundNumber, insertedRound.id);
    }

    // First pass: insert all matches
    const matchIdMap = new Map<number, string>();
    for (const m of generated.matches) {
      const roundDbId = roundIdMap.get(m.roundNumber)!;

      // Map participant ID to team / player
      let teamAId: string | null = null;
      let teamBId: string | null = null;
      let playerAId: string | null = null;
      let playerBId: string | null = null;
      let winnerId: string | null = null;
      let winnerPlayerId: string | null = null;

      if (is1v1) {
        playerAId = m.playerAId || null;
        playerBId = m.playerBId || null;
        winnerPlayerId = m.winnerPlayerId || null;

        // Also wire corresponding team rows
        const partA = participants.find((p: any) => p.id === playerAId);
        const partB = participants.find((p: any) => p.id === playerBId);
        const winPart = participants.find((p: any) => p.id === winnerPlayerId);

        teamAId = partA ? partA.teamId : null;
        teamBId = partB ? partB.teamId : null;
        winnerId = winPart ? winPart.teamId : null;
      } else {
        teamAId = m.teamAId || null;
        teamBId = m.teamBId || null;
        winnerId = m.winnerId || null;
      }

      // Automatically assign official map according to game mode
      const gameMode = tournament.game_mode || '5v5';
      let assignedMap: string;
      if (gameMode === '1v1') {
        const maps1v1 = ['aim_redline', 'aim_map', 'aim_aztec', 'awp_india', 'Mirage (Mid Duel)', 'Dust II (Long)'];
        assignedMap = maps1v1[m.bracketPosition % maps1v1.length];
      } else if (gameMode === '2v2') {
        const maps2v2 = ['Inferno (Wingman)', 'Vertigo (Wingman)', 'Nuke (Wingman)', 'Overpass (Wingman)', 'Cobblestone'];
        assignedMap = maps2v2[m.bracketPosition % maps2v2.length];
      } else {
        const maps5v5 = ['Mirage', 'Inferno', 'Dust II', 'Nuke', 'Ancient', 'Anubis', 'Vertigo'];
        assignedMap = maps5v5[m.bracketPosition % maps5v5.length];
      }

      const [insertedMatch] = await sql`
        INSERT INTO cs_arena.matches (
          tournament_id, round_id, bracket_position,
          team_a_id, team_b_id, player_a_id, player_b_id,
          winner_id, winner_player_id, is_bye, best_of, status, map_name
        )
        VALUES (
          ${tournamentId}, ${roundDbId}, ${m.bracketPosition},
          ${teamAId}, ${teamBId}, ${playerAId}, ${playerBId},
          ${winnerId}, ${winnerPlayerId}, ${m.isBye}, ${bestOf}, ${m.status}, ${assignedMap}
        )
        RETURNING id;
      `;
      matchIdMap.set(m.bracketPosition, insertedMatch.id);

      if (!m.isBye) {
        await sql`
          INSERT INTO cs_arena.match_maps (
            match_id, order_number, map_name, score_a, score_b
          )
          VALUES (
            ${insertedMatch.id}, 1, ${assignedMap}, 0, 0
          );
        `;
      }
    }

    // Second pass: link next_match_id and next_match_slot and advance BYEs
    for (const m of generated.matches) {
      if (m.nextRoundMatchIndex !== undefined) {
        const thisMatchDbId = matchIdMap.get(m.bracketPosition)!;
        const nextMatchDbId = matchIdMap.get(m.nextRoundMatchIndex)!;

        await sql`
          UPDATE cs_arena.matches
          SET next_match_id = ${nextMatchDbId}, next_match_slot = ${m.nextMatchSlot || null}
          WHERE id = ${thisMatchDbId};
        `;

        // If this match was a BYE, advance the winner into next match
        if (m.isBye) {
          if (is1v1 && m.winnerPlayerId) {
            const winPart = participants.find((p: any) => p.id === m.winnerPlayerId);
            const teamId = winPart ? winPart.teamId : null;

            if (m.nextMatchSlot === 'team_a') {
              await sql`
                UPDATE cs_arena.matches
                SET player_a_id = ${m.winnerPlayerId}, team_a_id = ${teamId}
                WHERE id = ${nextMatchDbId};
              `;
            } else if (m.nextMatchSlot === 'team_b') {
              await sql`
                UPDATE cs_arena.matches
                SET player_b_id = ${m.winnerPlayerId}, team_b_id = ${teamId}
                WHERE id = ${nextMatchDbId};
              `;
            }
          } else if (!is1v1 && m.winnerId) {
            if (m.nextMatchSlot === 'team_a') {
              await sql`
                UPDATE cs_arena.matches
                SET team_a_id = ${m.winnerId}
                WHERE id = ${nextMatchDbId};
              `;
            } else if (m.nextMatchSlot === 'team_b') {
              await sql`
                UPDATE cs_arena.matches
                SET team_b_id = ${m.winnerId}
                WHERE id = ${nextMatchDbId};
              `;
            }
          }
        }
      }
    }

    // Update tournament status to in_progress
    await sql`
      UPDATE cs_arena.tournaments
      SET status = 'in_progress', updated_at = NOW()
      WHERE id = ${tournamentId};
    `;

    // Audit Log
    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (
        ${actor.userId}, ${actor.name}, 'DRAW_BRACKET', 'tournaments', ${tournamentId},
        ${JSON.stringify({ matchesCount: generated.matches.length, roundsCount: generated.rounds.length, is1v1, gameMode })}
      );
    `;

    return {
      success: true,
      roundsCount: generated.rounds.length,
      matchesCount: generated.matches.length,
    };
  }

  static async getBracket(tournamentId: string) {
    const rounds = await sql`
      SELECT id, round_number, name
      FROM cs_arena.bracket_rounds
      WHERE tournament_id = ${tournamentId}
      ORDER BY round_number ASC;
    `;

    const matchesList = await sql`
      SELECT 
        m.id, m.round_id, br.round_number, br.name as round_name, m.bracket_position, m.is_bye, m.best_of, m.status,
        m.next_match_id, m.next_match_slot, m.winner_id, m.winner_player_id,
        m.map_name, m.evidence_url, m.scheduled_at, m.completed_at,
        t1.id as team_a_id, t1.name as team_a_name, t1.seed as team_a_seed,
        t2.id as team_b_id, t2.name as team_b_name, t2.seed as team_b_seed,
        w.name as winner_name,
        pa.id as player_a_id, pa.nickname as player_a_name, pa.avatar_url as player_a_avatar,
        pb.id as player_b_id, pb.nickname as player_b_name, pb.avatar_url as player_b_avatar,
        pw.id as winner_player_id_real, pw.nickname as winner_player_name, pw.avatar_url as winner_player_avatar
      FROM cs_arena.matches m
      JOIN cs_arena.bracket_rounds br ON m.round_id = br.id
      LEFT JOIN cs_arena.teams t1 ON m.team_a_id = t1.id
      LEFT JOIN cs_arena.teams t2 ON m.team_b_id = t2.id
      LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
      LEFT JOIN cs_arena.players pa ON m.player_a_id = pa.id
      LEFT JOIN cs_arena.players pb ON m.player_b_id = pb.id
      LEFT JOIN cs_arena.players pw ON m.winner_player_id = pw.id
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

    const mapsByMatch = new Map();
    for (const mapItem of mapsList) {
      if (!mapsByMatch.has(mapItem.match_id)) {
        mapsByMatch.set(mapItem.match_id, []);
      }
      mapsByMatch.get(mapItem.match_id).push(mapItem);
    }

    const matchesWithMaps = matchesList.map((m: any) => ({
      ...m,
      maps: mapsByMatch.get(m.id) || [],
    }));

    return {
      rounds,
      matches: matchesWithMaps,
    };
  }
}
