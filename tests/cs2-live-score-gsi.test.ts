// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { sql } from '../server/db';
import { MatchService } from '../server/services/match.service';
import { router } from '../server/index';
import { issueAccessToken } from '../server/lib/jwt';

describe('CS2 Live Score, Steam Connect & GSI Integration', () => {
  let testTournamentId: string;
  let testRoundId: string;
  let testMatchId: string;
  let adminToken: string;

  beforeAll(async () => {
    // Authenticate or find admin
    const [admin] = await sql`
      SELECT id, email, name, role FROM cs_arena.users WHERE role ILIKE 'admin' LIMIT 1;
    `;
    expect(admin).toBeDefined();

    const { token } = await issueAccessToken({
      userId: admin.id,
      email: admin.email,
      name: admin.name || 'Admin Master',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminToken = token;

    // Create temporary 1v1 tournament and match for live tests
    const testSlug = `teste-gsi-${Date.now()}`;
    const [t] = await sql`
      INSERT INTO cs_arena.tournaments (
        name, slug, game_mode, team_size, best_of, status
      ) VALUES (
        'Torneio Teste Live GSI CS2', ${testSlug}, '1v1', 1, 1, 'in_progress'
      ) RETURNING id;
    `;
    testTournamentId = t.id;

    const [r] = await sql`
      INSERT INTO cs_arena.bracket_rounds (
        tournament_id, round_number, name
      ) VALUES (
        ${testTournamentId}, 1, 'Final de Teste'
      ) RETURNING id;
    `;
    testRoundId = r.id;

    const [m] = await sql`
      INSERT INTO cs_arena.matches (
        tournament_id, round_id, bracket_position, best_of, status, map_name
      ) VALUES (
        ${testTournamentId}, ${testRoundId}, 1, 1, 'scheduled', 'aim_redline'
      ) RETURNING id;
    `;
    testMatchId = m.id;
  });

  it('1. Deve atualizar o mapa oficial da partida e criar entrada em match_maps', async () => {
    const res = await MatchService.updateMatchMap(testMatchId, 'aim_map');
    expect(res.success).toBe(true);
    expect(res.mapName).toBe('aim_map');

    const [match] = await sql`
      SELECT map_name FROM cs_arena.matches WHERE id = ${testMatchId};
    `;
    expect(match.map_name).toBe('aim_map');
  });

  it('2. Deve configurar IP e senha do servidor dedicado de CS2', async () => {
    const res = await MatchService.updateServerConfig(testMatchId, '127.0.0.1:27015', 'csarena123');
    expect(res.success).toBe(true);

    const [match] = await sql`
      SELECT server_ip, server_password FROM cs_arena.matches WHERE id = ${testMatchId};
    `;
    expect(match.server_ip).toBe('127.0.0.1:27015');
    expect(match.server_password).toBe('csarena123');
  });

  it('3. Deve atualizar o placar ao vivo (live score) e transicionar status para in_progress', async () => {
    const res = await MatchService.updateLiveScore(testMatchId, {
      scoreA: 8,
      scoreB: 5,
      phase: 'live',
    });
    expect(res.success).toBe(true);
    expect(res.scoreA).toBe(8);
    expect(res.scoreB).toBe(5);
    expect(res.status).toBe('in_progress');

    const [match] = await sql`
      SELECT live_score_a, live_score_b, live_phase, status FROM cs_arena.matches WHERE id = ${testMatchId};
    `;
    expect(match.live_score_a).toBe(8);
    expect(match.live_score_b).toBe(5);
    expect(match.live_phase).toBe('live');
    expect(match.status).toBe('in_progress');
  });

  it('4. Deve processar payload Valve CS2 GSI automaticamente', async () => {
    const valveGSIPayload = {
      provider: { name: 'Counter-Strike 2', appid: 730 },
      map: {
        name: 'aim_redline',
        phase: 'live',
        round: 18,
        team_ct: { score: 10, name: 'CT' },
        team_t: { score: 8, name: 'TERRORIST' },
      },
    };

    const res = await MatchService.handleGSIPayload(testMatchId, valveGSIPayload);
    expect(res.success).toBe(true);
    expect(res.scoreA).toBe(10);
    expect(res.scoreB).toBe(8);

    const [match] = await sql`
      SELECT live_score_a, live_score_b FROM cs_arena.matches WHERE id = ${testMatchId};
    `;
    expect(match.live_score_a).toBe(10);
    expect(match.live_score_b).toBe(8);
  });

  it('5. Deve gerar o arquivo de configuração gamestate_integration_csarena.cfg', async () => {
    const cfg = MatchService.generateGSIConfig(testMatchId, 'http://localhost:5173');
    expect(cfg).toContain('"CS Arena GSI v1.0"');
    expect(cfg).toContain(`http://localhost:5173/api/matches/${testMatchId}/gsi`);
    expect(cfg).toContain('"allplayers_id"');
  });

  it('6. Deve responder via rota HTTP /api/matches/:id/live', async () => {
    const req = new Request(`http://localhost:5173/api/matches/${testMatchId}/live`, {
      method: 'GET',
    });
    const res = await router(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.liveScoreA).toBe(10);
    expect(data.liveScoreB).toBe(8);
    expect(data.serverIp).toBe('127.0.0.1:27015');
  });

  it('7. Deve processar webhook GSI via rota HTTP POST /api/matches/:id/gsi', async () => {
    const matchZyPayload = {
      event: 'round_end',
      team1: { score: 12 },
      team2: { score: 9 },
    };

    const req = new Request(`http://localhost:5173/api/matches/${testMatchId}/gsi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchZyPayload),
    });
    const res = await router(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.scoreA).toBe(12);
    expect(data.scoreB).toBe(9);
  });

  it('8. Deve fornecer download de CFG via rota /api/matches/:id/gsi/cfg', async () => {
    const req = new Request(`http://localhost:5173/api/matches/${testMatchId}/gsi/cfg`, {
      method: 'GET',
    });
    const res = await router(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');

    const text = await res.text();
    expect(text).toContain('"CS Arena GSI v1.0"');
    expect(res.headers.get('content-disposition')).toContain('gamestate_integration');
  });

  it('9. Deve atualizar placar ao vivo autenticado via /api/matches/:id/live-score', async () => {
    const req = new Request(`http://localhost:5173/api/matches/${testMatchId}/live-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ scoreA: 13, scoreB: 10, phase: 'live' }),
    });
    const res = await router(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.scoreA).toBe(13);
    expect(data.scoreB).toBe(10);
  });
});
