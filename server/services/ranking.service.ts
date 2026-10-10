import { sql } from '../db';

export class RankingService {
  static async getTournamentRanking(tournamentId: string) {
    const [tournament] = await sql`
      SELECT id, name, game_mode, team_size, status
      FROM cs_arena.tournaments
      WHERE id = ${tournamentId};
    `;

    if (!tournament) return null;

    const is1v1 = tournament.team_size === 1 || tournament.game_mode === '1v1';

    // Fetch teams and their status
    const teams = await sql`
      SELECT 
        t.id, t.name, t.seed, t.status, t.captain_id,
        p.nickname as captain_nickname, p.avatar_url as captain_avatar
      FROM cs_arena.teams t
      LEFT JOIN cs_arena.players p ON t.captain_id = p.id
      WHERE t.tournament_id = ${tournamentId}
      ORDER BY 
        CASE 
          WHEN t.status = 'champion' THEN 1
          WHEN t.status = 'runner_up' THEN 2
          ELSE 3
        END,
        t.seed ASC;
    `;

    // Fetch final match if completed
    const finalMatches = await sql`
      SELECT 
        m.*,
        w.name as winner_name,
        pw.nickname as winner_player_name
      FROM cs_arena.matches m
      LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
      LEFT JOIN cs_arena.players pw ON m.winner_player_id = pw.id
      WHERE m.tournament_id = ${tournamentId} AND m.next_match_id IS NULL AND m.status = 'completed';
    `;

    const finalMatch = finalMatches[0] || null;

    const rankings = teams.map((t: any, index: number) => ({
      ...t,
      rank: t.status === 'champion' ? 1 : t.status === 'runner_up' ? 2 : index + 1,
    }));

    return {
      tournament,
      is1v1,
      champion: teams.find((t: any) => t.status === 'champion') || null,
      runnerUp: teams.find((t: any) => t.status === 'runner_up') || null,
      finalMatch,
      teams,
      rankings,
    };
  }
}
