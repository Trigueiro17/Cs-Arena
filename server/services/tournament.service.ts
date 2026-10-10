import { sql } from '../db';
import { GameMode, getTeamSize, getDefaultTournamentRules } from '../../src/lib/tournament-engine';

export interface CreateTournamentInput {
  name: string;
  slug: string;
  description?: string | null;
  gameMode?: GameMode;
  teamSize?: number;
  bestOf?: number;
  thirdPlaceEnabled?: boolean;
  mapSelection?: string;
  rules?: string | null;
  maxPlayers?: number | null;
}

export class TournamentService {
  static async listTournaments(filters?: { gameMode?: string; status?: string }) {
    let query = sql`
      SELECT 
        t.id, t.name, t.slug, t.description, t.game_mode, t.team_size, t.best_of,
        t.third_place_enabled, t.map_selection, t.status, t.created_at,
        COUNT(r.id)::int as registrations_count
      FROM cs_arena.tournaments t
      LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id AND r.status != 'withdrawn'
      WHERE 1=1
    `;

    if (filters?.gameMode && ['1v1', '2v2', '3v3', '4v4', '5v5'].includes(filters.gameMode)) {
      query = sql`
        SELECT 
          t.id, t.name, t.slug, t.description, t.game_mode, t.team_size, t.best_of,
          t.third_place_enabled, t.map_selection, t.status, t.created_at,
          COUNT(r.id)::int as registrations_count
        FROM cs_arena.tournaments t
        LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id AND r.status != 'withdrawn'
        WHERE t.game_mode = ${filters.gameMode}
        GROUP BY t.id
        ORDER BY t.created_at DESC;
      `;
    } else {
      query = sql`
        SELECT 
          t.id, t.name, t.slug, t.description, t.game_mode, t.team_size, t.best_of,
          t.third_place_enabled, t.map_selection, t.status, t.created_at,
          COUNT(r.id)::int as registrations_count
        FROM cs_arena.tournaments t
        LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id AND r.status != 'withdrawn'
        GROUP BY t.id
        ORDER BY t.created_at DESC;
      `;
    }

    const list = await query;
    return list;
  }

  static async getTournament(idOrSlug: string) {
    const [t] = await sql`
      SELECT 
        t.*,
        COUNT(DISTINCT CASE WHEN r.status != 'withdrawn' THEN r.id END)::int as registrations_count,
        COUNT(DISTINCT tm.id)::int as teams_count
      FROM cs_arena.tournaments t
      LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id
      LEFT JOIN cs_arena.teams tm ON t.id = tm.tournament_id
      WHERE t.id = ${idOrSlug} OR t.slug = ${idOrSlug}
      GROUP BY t.id;
    `;

    return t || null;
  }

  static async createTournament(
    input: CreateTournamentInput,
    actor: { userId: string; name: string }
  ) {
    const { name, slug, description } = input;
    if (!name || !name.trim()) throw new Error('Nome do campeonato é obrigatório.');
    if (!slug || !slug.trim()) throw new Error('Slug da URL é obrigatório.');

    const rawGameMode = input.gameMode || (input as any).game_mode;
    const gameMode: GameMode = (['1v1', '2v2', '3v3', '4v4', '5v5'].includes(rawGameMode as any)
      ? rawGameMode
      : '5v5') as GameMode;

    const teamSize = (input.teamSize || (input as any).team_size) ?? getTeamSize(gameMode);
    const bestOf = 1; // Strict rule: MD1
    const thirdPlaceEnabled = false; // Strict rule: false
    const mapSelection = input.mapSelection || (input as any).map_selection || 'admin';
    const rules = input.rules || getDefaultTournamentRules(gameMode);

    const [created] = await sql`
      INSERT INTO cs_arena.tournaments (
        name, slug, description, game_mode, team_size, best_of,
        third_place_enabled, map_selection, rules, status, created_by
      )
      VALUES (
        ${name.trim()}, ${slug.trim()}, ${description || null}, ${gameMode}, ${teamSize}, ${bestOf},
        ${thirdPlaceEnabled}, ${mapSelection}, ${rules}, 'registration_open', ${actor.userId}
      )
      RETURNING *;
    `;

    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (${actor.userId}, ${actor.name}, 'CREATE_TOURNAMENT', 'tournaments', ${created.id}, ${JSON.stringify(created)});
    `;

    return created;
  }

  static async updateTournament(
    id: string,
    data: { name?: string; description?: string; rules?: string; status?: string },
    actor: { userId: string; name: string }
  ) {
    const { name, description, rules, status } = data;

    const [updated] = await sql`
      UPDATE cs_arena.tournaments
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        rules = COALESCE(${rules}, rules),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!updated) throw new Error('Campeonato não encontrado.');

    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (${actor.userId}, ${actor.name}, 'UPDATE_TOURNAMENT', 'tournaments', ${id}, ${JSON.stringify(updated)});
    `;

    return updated;
  }

  static async closeRegistration(id: string, actor: { userId: string; name: string }) {
    const [updated] = await sql`
      UPDATE cs_arena.tournaments
      SET status = 'registration_closed', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!updated) throw new Error('Campeonato não encontrado.');

    await sql`
      INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
      VALUES (${actor.userId}, ${actor.name}, 'CLOSE_REGISTRATION', 'tournaments', ${id}, ${JSON.stringify(updated)});
    `;

    return updated;
  }
}
