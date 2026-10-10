import { neon } from '@neondatabase/serverless';
import { jsonResponse, requireAdmin } from '../utils';
import { formTeams, generateSingleEliminationBracket, PlayerData } from '../../src/lib/tournament-engine';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL || '');

export async function handleDraws(req: Request, tournamentId: string, action: string): Promise<Response> {
  const method = req.method;

  // 1. Sorteio de Equipes (com roleta)
  if (action === 'draw-teams' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json().catch(() => ({}));
      const algorithm: 'random' | 'balanced' | 'captains' = body.algorithm || 'random';
      const idempotencyKey = body.idempotencyKey || `draw-teams-${tournamentId}-${Date.now()}`;

      // Check for existing draw with idempotency key
      const existingDraw = await sql`
        SELECT id FROM cs_arena.draws WHERE idempotency_key = ${idempotencyKey} LIMIT 1;
      `;
      if (existingDraw.length > 0) {
        return jsonResponse({
          message: 'Sorteio já executado com esta chave de idempotência.',
          drawId: existingDraw[0].id,
        });
      }

      // Check if tournament already has teams generated
      const existingTeams = await sql`
        SELECT COUNT(id)::int as count FROM cs_arena.teams WHERE tournament_id = ${tournamentId};
      `;
      if (existingTeams[0]?.count > 0 && !body.forceReset) {
        return jsonResponse(
          { error: 'As equipes deste torneio já foram sorteadas. Para sortear novamente, forneça confirmação explícita com justificativa.' },
          409
        );
      }

      // If forceReset is requested, clear prior teams and members
      if (body.forceReset) {
        await sql`DELETE FROM cs_arena.teams WHERE tournament_id = ${tournamentId};`;
        await sql`
          UPDATE cs_arena.registrations 
          SET status = 'confirmed' 
          WHERE tournament_id = ${tournamentId};
        `;
      }

      // Fetch registered players
      const registrants = await sql`
        SELECT p.id, p.nickname, p.steam_id, p.avatar_url, p.preferred_role, p.skill_rating
        FROM cs_arena.registrations r
        JOIN cs_arena.players p ON r.player_id = p.id
        WHERE r.tournament_id = ${tournamentId}
        ORDER BY r.registered_at ASC;
      `;

      if (registrants.length < 10) {
        return jsonResponse(
          { error: `Inscritos insuficientes: são necessários pelo menos 10 jogadores (2 equipes) para iniciar o campeonato 5x5. Atualmente há ${registrants.length} inscritos.` },
          400
        );
      }

      const playersData: PlayerData[] = registrants.map(r => ({
        id: r.id,
        nickname: r.nickname,
        steamId: r.steam_id,
        avatarUrl: r.avatar_url,
        preferredRole: r.preferred_role as any,
        skillRating: r.skill_rating,
      }));

      // Execute official team formation (Server-decided with crypto random)
      const draft = formTeams(playersData, algorithm);

      // Save Draw record
      const auditHash = crypto.createHash('sha256').update(JSON.stringify(draft)).digest('hex');
      const [drawRecord] = await sql`
        INSERT INTO cs_arena.draws (
          tournament_id, type, status, algorithm, options, performed_by, idempotency_key, audit_hash, metadata
        )
        VALUES (
          ${tournamentId}, 'teams', 'completed', ${algorithm}, 
          ${JSON.stringify({ N: registrants.length, teamsCount: draft.teams.length, reservesCount: draft.reserves.length })},
          ${authCheck.user.userId}, ${idempotencyKey}, ${auditHash},
          ${JSON.stringify({ draftSummary: `${draft.teams.length} equipes e ${draft.reserves.length} reservas geradas.` })}
        )
        RETURNING *;
      `;

      // Save Teams and Team Members
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

          // Record step in draw_results for roulette playback
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

      // Update tournament status to drawing
      await sql`
        UPDATE cs_arena.tournaments
        SET status = 'drawing', updated_at = NOW()
        WHERE id = ${tournamentId};
      `;

      // Audit Log
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (
          ${authCheck.user.userId}, ${authCheck.user.name}, 'DRAW_TEAMS', 'tournaments', ${tournamentId},
          ${JSON.stringify({ drawId: drawRecord.id, algorithm, teams: draft.teams.length, reserves: draft.reserves.length })}
        );
      `;

      return jsonResponse({
        success: true,
        drawId: drawRecord.id,
        algorithm,
        teamsCount: draft.teams.length,
        reservesCount: draft.reserves.length,
        animationSteps,
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao executar sorteio das equipes' }, 500);
    }
  }

  // 2. Sorteio de Chaveamento e Confrontos (Mata-mata com BYEs)
  if (action === 'draw-bracket' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json().catch(() => ({}));

      // Fetch teams
      const teams = await sql`
        SELECT id, name, seed
        FROM cs_arena.teams
        WHERE tournament_id = ${tournamentId}
        ORDER BY seed ASC;
      `;

      if (teams.length < 2) {
        return jsonResponse({ error: 'É necessário ter no mínimo 2 equipes para gerar a chave de confrontos.' }, 400);
      }

      const [tournament] = await sql`
        SELECT best_of FROM cs_arena.tournaments WHERE id = ${tournamentId};
      `;
      const bestOf = tournament?.best_of || 1;

      // Clean existing bracket if re-drawing
      await sql`DELETE FROM cs_arena.bracket_rounds WHERE tournament_id = ${tournamentId};`;

      // Generate Single Elimination Bracket with proper BYE math
      const generated = generateSingleEliminationBracket(
        teams.map(t => ({ id: t.id, seed: t.seed, name: t.name })),
        bestOf
      );

      // Insert rounds
      const roundIdMap = new Map<number, string>();
      for (const r of generated.rounds) {
        const [insertedRound] = await sql`
          INSERT INTO cs_arena.bracket_rounds (tournament_id, round_number, name)
          VALUES (${tournamentId}, ${r.roundNumber}, ${r.name})
          RETURNING id;
        `;
        roundIdMap.set(r.roundNumber, insertedRound.id);
      }

      // First pass: insert all matches so we have their generated IDs
      const matchIdMap = new Map<number, string>();
      for (const m of generated.matches) {
        const roundDbId = roundIdMap.get(m.roundNumber)!;
        const [insertedMatch] = await sql`
          INSERT INTO cs_arena.matches (
            tournament_id, round_id, bracket_position, team_a_id, team_b_id, is_bye, best_of, status, winner_id
          )
          VALUES (
            ${tournamentId}, ${roundDbId}, ${m.bracketPosition}, ${m.teamAId || null}, ${m.teamBId || null},
            ${m.isBye}, ${bestOf}, ${m.status}, ${m.winnerId || null}
          )
          RETURNING id;
        `;
        matchIdMap.set(m.bracketPosition, insertedMatch.id);
      }

      // Second pass: link next_match_id and next_match_slot
      for (const m of generated.matches) {
        if (m.nextRoundMatchIndex !== undefined) {
          const thisMatchDbId = matchIdMap.get(m.bracketPosition)!;
          const nextMatchDbId = matchIdMap.get(m.nextRoundMatchIndex)!;

          await sql`
            UPDATE cs_arena.matches
            SET next_match_id = ${nextMatchDbId}, next_match_slot = ${m.nextMatchSlot || null}
            WHERE id = ${thisMatchDbId};
          `;

          // If this match was a BYE, ensure the winner is advanced into the next match
          if (m.isBye && m.winnerId) {
            if (m.nextMatchSlot === 'team_a') {
              await sql`UPDATE cs_arena.matches SET team_a_id = ${m.winnerId} WHERE id = ${nextMatchDbId};`;
            } else if (m.nextMatchSlot === 'team_b') {
              await sql`UPDATE cs_arena.matches SET team_b_id = ${m.winnerId} WHERE id = ${nextMatchDbId};`;
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

      // Emitting audit log
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (
          ${authCheck.user.userId}, ${authCheck.user.name}, 'DRAW_BRACKET', 'tournaments', ${tournamentId},
          ${JSON.stringify({ matchesCount: generated.matches.length, roundsCount: generated.rounds.length })}
        );
      `;

      return jsonResponse({
        success: true,
        roundsCount: generated.rounds.length,
        matchesCount: generated.matches.length,
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao gerar chaveamento' }, 500);
    }
  }

  return jsonResponse({ error: 'Ação de sorteio desconhecida.' }, 404);
}
