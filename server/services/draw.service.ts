import { sql } from '../db';
import crypto from 'crypto';
import { PlayerData, GameMode } from '../../src/lib/tournament-engine';
import { TeamFormationService } from './team-formation.service';

export interface DrawOptions {
  algorithm?: 'random' | 'balanced' | 'captains';
  idempotencyKey?: string;
  forceReset?: boolean;
}

export class DrawService {
  static async executeDraw(
    tournamentId: string,
    options: DrawOptions,
    actor: { userId: string; name: string }
  ) {
    const algorithm = options.algorithm || 'random';
    const idempotencyKey = options.idempotencyKey || `draw-${tournamentId}-${Date.now()}`;

    // 1. Idempotency Check
    const [existingDraw] = await sql`
      SELECT id FROM cs_arena.draws WHERE idempotency_key = ${idempotencyKey} LIMIT 1;
    `;
    if (existingDraw) {
      return {
        message: 'Sorteio já executado com esta chave de idempotência.',
        drawId: existingDraw.id,
      };
    }

    // 2. Fetch tournament configuration
    const [tournament] = await sql`
      SELECT id, name, team_size, game_mode, status
      FROM cs_arena.tournaments
      WHERE id = ${tournamentId};
    `;

    if (!tournament) throw new Error('Campeonato não encontrado.');

    const teamSize = Number(tournament.team_size) || 5;
    const gameMode: GameMode = (tournament.game_mode || '5v5') as GameMode;
    const is1v1 = teamSize === 1 || gameMode === '1v1';

    // 3. Check if already drawn and forceReset is not provided
    const [existingTeams] = await sql`
      SELECT COUNT(id)::int as count FROM cs_arena.teams WHERE tournament_id = ${tournamentId};
    `;
    const [existingDraws] = await sql`
      SELECT COUNT(id)::int as count FROM cs_arena.draws WHERE tournament_id = ${tournamentId};
    `;

    if ((existingTeams?.count > 0 || existingDraws?.count > 0) && !options.forceReset) {
      throw new Error(
        'O sorteio deste torneio já foi executado. Para refazer, forneça confirmação explícita de reinicialização (forceReset).'
      );
    }

    // 4. Force Reset if requested
    if (options.forceReset) {
      await sql`DELETE FROM cs_arena.teams WHERE tournament_id = ${tournamentId};`;
      await sql`DELETE FROM cs_arena.bracket_rounds WHERE tournament_id = ${tournamentId};`;
      await sql`DELETE FROM cs_arena.draws WHERE tournament_id = ${tournamentId};`;
      await sql`
        UPDATE cs_arena.registrations 
        SET status = 'confirmed' 
        WHERE tournament_id = ${tournamentId} AND status != 'withdrawn';
      `;
    }

    // 5. Fetch confirmed registrants
    const registrants = await sql`
      SELECT p.id, p.nickname, p.steam_id, p.avatar_url, p.preferred_role, p.skill_rating
      FROM cs_arena.registrations r
      JOIN cs_arena.players p ON r.player_id = p.id
      WHERE r.tournament_id = ${tournamentId} AND r.status != 'withdrawn'
      ORDER BY r.registered_at ASC;
    `;

    const minRequired = is1v1 ? 2 : teamSize * 2;
    if (registrants.length < minRequired) {
      const errorMsg = is1v1
        ? `Inscritos insuficientes: são necessários no mínimo 2 duelistas para iniciar o campeonato 1x1. Atualmente há ${registrants.length} inscritos.`
        : `Inscritos insuficientes: são necessários no mínimo ${minRequired} jogadores (2 equipes completas de ${teamSize}) para iniciar o campeonato ${teamSize}x${teamSize}. Atualmente há ${registrants.length} inscritos.`;
      throw new Error(errorMsg);
    }

    const playersData: PlayerData[] = registrants.map((r: any) => ({
      id: r.id,
      nickname: r.nickname,
      steamId: r.steam_id,
      avatarUrl: r.avatar_url,
      preferredRole: r.preferred_role as any,
      skillRating: r.skill_rating,
    }));

    // 6. Execute official team/duelists formation (Server-decided with crypto random)
    const draft = TeamFormationService.form(playersData, algorithm, teamSize, gameMode);

    // 7. Save Draw Record
    const auditHash = crypto.createHash('sha256').update(JSON.stringify(draft)).digest('hex');
    const [drawRecord] = await sql`
      INSERT INTO cs_arena.draws (
        tournament_id, type, status, algorithm, options, performed_by, idempotency_key, audit_hash, metadata
      )
      VALUES (
        ${tournamentId}, ${is1v1 ? 'duelists' : 'teams'}, 'completed', ${algorithm}, 
        ${JSON.stringify({ N: registrants.length, teamsCount: draft.teams.length, reservesCount: draft.reserves.length, teamSize, gameMode })},
        ${actor.userId}, ${idempotencyKey}, ${auditHash},
        ${JSON.stringify({ draftSummary: `${draft.teams.length} ${is1v1 ? 'duelistas' : 'equipes'} e ${draft.reserves.length} reservas.` })}
      )
      RETURNING *;
    `;

    // 8. Save Teams, Members, and Draw Results
    let selectionOrder = 1;
    const animationSteps: {
      order: number;
      playerId: string;
      playerNickname: string;
      avatarUrl?: string | null;
      teamName: string;
      teamSeed: number;
      isCaptain: boolean;
    }[] = [];

    if (is1v1) {
      // In 1v1, each participant is a duelist. We also create a 1-player team representation for unified UI queries if needed,
      // but primarily record draw_results for the roulette playback.
      for (const t of draft.teams) {
        const playerObj = playersData.find(p => p.id === t.captainId)!;

        const [teamRow] = await sql`
          INSERT INTO cs_arena.teams (tournament_id, name, captain_id, seed, status)
          VALUES (${tournamentId}, ${playerObj.nickname}, ${playerObj.id}, ${t.seed}, 'active')
          RETURNING id, name, seed;
        `;

        await sql`
          INSERT INTO cs_arena.team_members (team_id, player_id, tournament_id, is_captain)
          VALUES (${teamRow.id}, ${playerObj.id}, ${tournamentId}, true)
          ON CONFLICT (tournament_id, player_id) DO NOTHING;
        `;

        await sql`
          INSERT INTO cs_arena.draw_results (draw_id, player_id, team_id, selection_order, metadata)
          VALUES (${drawRecord.id}, ${playerObj.id}, ${teamRow.id}, ${selectionOrder}, ${JSON.stringify({ is1v1: true, seed: t.seed })});
        `;

        animationSteps.push({
          order: selectionOrder++,
          playerId: playerObj.id,
          playerNickname: playerObj.nickname,
          avatarUrl: playerObj.avatarUrl,
          teamName: playerObj.nickname,
          teamSeed: t.seed,
          isCaptain: true,
        });
      }
    } else {
      // 2v2 to 5v5 Mode
      for (const t of draft.teams) {
        const [teamRow] = await sql`
          INSERT INTO cs_arena.teams (tournament_id, name, captain_id, seed, status)
          VALUES (${tournamentId}, ${t.name}, ${t.captainId || null}, ${t.seed}, 'active')
          RETURNING id, name, seed;
        `;

        for (const m of t.members) {
          const playerObj = playersData.find(p => p.id === m.playerId)!;

          await sql`
            INSERT INTO cs_arena.team_members (team_id, player_id, tournament_id, is_captain)
            VALUES (${teamRow.id}, ${m.playerId}, ${tournamentId}, ${m.isCaptain})
            ON CONFLICT (tournament_id, player_id) DO NOTHING;
          `;

          await sql`
            INSERT INTO cs_arena.draw_results (draw_id, player_id, team_id, selection_order, metadata)
            VALUES (${drawRecord.id}, ${m.playerId}, ${teamRow.id}, ${selectionOrder}, ${JSON.stringify({ isCaptain: m.isCaptain, teamName: t.name })});
          `;

          animationSteps.push({
            order: selectionOrder++,
            playerId: m.playerId,
            playerNickname: playerObj.nickname,
            avatarUrl: playerObj.avatarUrl,
            teamName: t.name,
            teamSeed: t.seed,
            isCaptain: m.isCaptain,
          });
        }
      }

      // Mark reserves in registrations table
      for (const r of draft.reserves) {
        await sql`
          UPDATE cs_arena.registrations
          SET status = 'reserve'
          WHERE tournament_id = ${tournamentId} AND player_id = ${r.playerId};
        `;

        await sql`
          INSERT INTO cs_arena.draw_results (draw_id, player_id, selection_order, metadata)
          VALUES (${drawRecord.id}, ${r.playerId}, ${selectionOrder++}, ${JSON.stringify({ isReserve: true })});
        `;
      }
    }

    // 9. Update tournament status to drawing
    await sql`
      UPDATE cs_arena.tournaments
      SET status = 'drawing', updated_at = NOW()
      WHERE id = ${tournamentId};
    `;

    // 10. Audit Log
    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (
        ${actor.userId}, ${actor.name}, 'DRAW_TEAMS', 'tournaments', ${tournamentId},
        ${JSON.stringify({ drawId: drawRecord.id, algorithm, gameMode, teamSize, teams: draft.teams.length, reserves: draft.reserves.length })}
      );
    `;

    return {
      success: true,
      drawId: drawRecord.id,
      algorithm,
      gameMode,
      teamSize,
      teams: draft.teams,
      reserves: draft.reserves,
      teamsCount: draft.teams.length,
      reservesCount: draft.reserves.length,
      animationSteps,
    };
  }
}
