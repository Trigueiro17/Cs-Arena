import { sql } from '../db';

export interface RegisterPlayerInput {
  playerId?: string;
  nickname?: string;
  steamId?: string | null;
  preferredRole?: string;
  avatarUrl?: string | null;
}

export class RegistrationService {
  static async registerPlayer(tournamentId: string, input: RegisterPlayerInput) {
    const { playerId: directPlayerId, nickname, steamId, preferredRole = 'Flex', avatarUrl } = input;

    // Check tournament status
    const [tournament] = await sql`
      SELECT id, status, team_size, game_mode, max_players
      FROM cs_arena.tournaments
      WHERE id = ${tournamentId};
    `;

    if (!tournament) {
      throw new Error('Campeonato não encontrado.');
    }

    if (tournament.status !== 'registration_open') {
      throw new Error('As inscrições para este campeonato não estão abertas.');
    }

    // Find or create player
    let player: any = null;
    if (directPlayerId) {
      [player] = await sql`
        SELECT id, nickname, steam_id, avatar_url, preferred_role, skill_rating
        FROM cs_arena.players
        WHERE id = ${directPlayerId}
        LIMIT 1;
      `;
      if (!player) throw new Error('Jogador não encontrado.');
    } else {
      if (!nickname || !nickname.trim()) {
        throw new Error('Nickname é obrigatório.');
      }

      [player] = await sql`
        SELECT id, nickname, steam_id, avatar_url, preferred_role, skill_rating
        FROM cs_arena.players
        WHERE LOWER(nickname) = LOWER(${nickname.trim()})
        LIMIT 1;
      `;

      if (!player) {
        const avatar =
          avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname.trim())}`;

        [player] = await sql`
          INSERT INTO cs_arena.players (nickname, steam_id, avatar_url, preferred_role)
          VALUES (${nickname.trim()}, ${steamId || null}, ${avatar}, ${preferredRole})
          RETURNING id, nickname, steam_id, avatar_url, preferred_role, skill_rating;
        `;
      }
    }

    // Check existing registration
    const [existing] = await sql`
      SELECT id, status
      FROM cs_arena.registrations
      WHERE tournament_id = ${tournamentId} AND player_id = ${player.id};
    `;

    let reg;
    if (existing) {
      if (existing.status !== 'withdrawn') {
        throw new Error('Este jogador já está inscrito neste campeonato.');
      }
      // Re-activate previously withdrawn registration
      [reg] = await sql`
        UPDATE cs_arena.registrations
        SET status = 'confirmed', registered_at = NOW()
        WHERE id = ${existing.id}
        RETURNING *;
      `;
    } else {
      [reg] = await sql`
        INSERT INTO cs_arena.registrations (tournament_id, player_id, status)
        VALUES (${tournamentId}, ${player.id}, 'confirmed')
        RETURNING *;
      `;
    }

    await sql`
      INSERT INTO cs_arena.audit_logs (action, entity_type, entity_id, after_state)
      VALUES (
        'PLAYER_REGISTERED',
        'registrations',
        ${reg.id},
        ${JSON.stringify({ tournamentId, playerId: player.id, nickname: player.nickname })}
      );
    `;

    return { registration: reg, player };
  }

  static async cancelRegistration(
    tournamentId: string,
    playerId: string,
    actor?: { userId?: string; name?: string }
  ) {
    const [tournament] = await sql`
      SELECT id, status FROM cs_arena.tournaments WHERE id = ${tournamentId};
    `;

    if (!tournament) throw new Error('Campeonato não encontrado.');
    if (tournament.status !== 'registration_open' && tournament.status !== 'registration_closed') {
      throw new Error('Não é possível cancelar inscrição após o início dos sorteios ou partidas.');
    }

    const [updated] = await sql`
      UPDATE cs_arena.registrations
      SET status = 'withdrawn'
      WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
      RETURNING *;
    `;

    if (!updated) {
      throw new Error('Inscrição não encontrada.');
    }

    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (
        ${actor?.userId || null},
        ${actor?.name || 'Sistema/Jogador'},
        'CANCEL_REGISTRATION',
        'registrations',
        ${updated.id},
        ${JSON.stringify({ tournamentId, playerId, status: 'withdrawn' })}
      );
    `;

    return { success: true, registration: updated };
  }

  static async getRegistrations(tournamentId: string) {
    const [tournament] = await sql`
      SELECT id, team_size, game_mode FROM cs_arena.tournaments WHERE id = ${tournamentId};
    `;

    const list = await sql`
      SELECT 
        r.id as registration_id, r.status, r.registered_at,
        p.id as player_id, p.nickname, p.steam_id, p.avatar_url, p.preferred_role, p.skill_rating
      FROM cs_arena.registrations r
      JOIN cs_arena.players p ON r.player_id = p.id
      WHERE r.tournament_id = ${tournamentId}
      ORDER BY r.registered_at ASC;
    `;

    const activeList = list.filter((r: any) => r.status !== 'withdrawn');
    const teamSize = tournament?.team_size || 5;
    const is1v1 = teamSize === 1;

    const totalActive = activeList.length;
    const completeTeams = is1v1 ? totalActive : Math.floor(totalActive / teamSize);
    const reservesCount = is1v1 ? 0 : totalActive % teamSize;
    const minRequired = is1v1 ? 2 : teamSize * 2;
    const canStart = totalActive >= minRequired;

    return {
      registrations: list,
      totalConfirmed: totalActive,
      possibleTeams: completeTeams,
      reservesCount,
      canStart,
      summary: {
        total: list.length,
        active: totalActive,
        teamSize,
        completeTeams,
        possibleTeams: completeTeams,
        reservesCount,
        minRequired,
        canStart,
      },
    };
  }
}
