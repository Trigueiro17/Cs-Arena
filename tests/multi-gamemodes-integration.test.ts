// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { router } from '../server/index';
import { sql } from '../server/db';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)('CS Arena — Multi-Modalities Integration Suite (1v1 a 5v5)', () => {
  let adminToken: string = '';
  let playerToken: string = '';
  let playerUserId: string = '';
  const createdTournamentIds: string[] = [];
  const testPlayerIds: string[] = [];

  beforeAll(async () => {
    // 1. Login Admin
    const adminLoginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@csarena.com', password: 'admin123' }),
      })
    );
    expect(adminLoginRes.status).toBe(200);
    const adminData = await adminLoginRes.json();
    adminToken = adminData.token;

    // 2. Login or Register test player
    let playerLoginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'player@csarena.com', password: 'player123' }),
      })
    );
    if (playerLoginRes.status === 401) {
      await router(
        new Request('http://localhost:5173/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Jogador Teste',
            nickname: 'player_integration_test',
            email: 'player@csarena.com',
            password: 'player123',
          }),
        })
      );
      playerLoginRes = await router(
        new Request('http://localhost:5173/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'player@csarena.com', password: 'player123' }),
        })
      );
    }
    const playerData = await playerLoginRes.json();
    playerToken = playerData.token;
    playerUserId = playerData.user.id;

    // 3. Ensure we have at least 12 test players in cs_arena.players
    for (let i = 1; i <= 12; i++) {
      const nick = `integration_tester_${i}`;
      const [existing] = await sql`
        SELECT id FROM cs_arena.players WHERE nickname = ${nick} LIMIT 1;
      `;
      if (existing) {
        testPlayerIds.push(existing.id);
      } else {
        const [created] = await sql`
          INSERT INTO cs_arena.players (nickname, skill_rating, preferred_role)
          VALUES (${nick}, ${1000 + i * 20}, 'Flex')
          RETURNING id;
        `;
        testPlayerIds.push(created.id);
      }
    }
  });

  afterAll(async () => {
    // Clean up created test tournaments
    if (createdTournamentIds.length > 0) {
      for (const tId of createdTournamentIds) {
        try {
          await sql`DELETE FROM cs_arena.tournaments WHERE id = ${tId};`;
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });

  // ==========================================
  // MODALIDADE 1v1: DUELO INDIVIDUAL
  // ==========================================
  describe('Modalidade 1v1 — Duelo Individual', () => {
    let t1v1Id: string;

    it('1. Admin cria torneio 1v1 com parametrização correta', async () => {
      const req = new Request('http://localhost:5173/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Duelo 1x1 — Integração Vitest',
          slug: `duelo-1v1-test-${Date.now()}`,
          description: 'Torneio teste 1v1 automatizado',
          game_mode: '1v1',
          team_size: 1,
          format: 'single_elimination',
          best_of: 1,
          third_place_enabled: false,
          map_selection: 'admin',
          rules: 'MD1 aim_map sem empate',
        }),
      });

      const res = await router(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.tournament).toBeDefined();
      expect(data.tournament.game_mode).toBe('1v1');
      expect(data.tournament.team_size).toBe(1);
      expect(data.tournament.best_of).toBe(1);
      expect(data.tournament.third_place_enabled).toBe(false);
      expect(data.tournament.map_selection).toBe('admin');

      t1v1Id = data.tournament.id;
      createdTournamentIds.push(t1v1Id);
    });

    it('2. Inscreve 3 duelistas, testa cancelamento de inscrição e projeção de reservas', async () => {
      // Inscrição dos 3 duelistas
      for (let i = 0; i < 3; i++) {
        const regRes = await router(
          new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ playerId: testPlayerIds[i] }),
          })
        );
        expect(regRes.status).toBe(201);
      }

      // Projeção para 3 duelistas (em 1v1: 3 participantes = 3 duelistas, 0 reservas)
      const projRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/registrations/projection`)
      );
      expect(projRes.status).toBe(200);
      const projData = await projRes.json();
      expect(projData.totalConfirmed).toBe(3);
      expect(projData.possibleTeams).toBe(3);
      expect(projData.reservesCount).toBe(0);
      expect(projData.canStart).toBe(true);

      // Cancelamento de inscrição do terceiro duelista
      const cancelRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/register?playerId=${testPlayerIds[2]}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })
      );
      expect(cancelRes.status).toBe(200);

      // Projeção pós cancelamento: 2 duelistas
      const proj2Res = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/registrations/projection`)
      );
      const proj2Data = await proj2Res.json();
      expect(proj2Data.totalConfirmed).toBe(2);
      expect(proj2Data.possibleTeams).toBe(2);

      // Re-inscreve para ter 3 duelistas (testando chave com 1 BYE)
      const reRegRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ playerId: testPlayerIds[2] }),
        })
      );
      expect(reRegRes.status).toBe(201);
    });

    it('3. Executa sorteio criptográfico 1v1 com auditoria e idempotência', async () => {
      const drawRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/draw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ algorithm: 'random' }),
        })
      );
      expect(drawRes.status).toBe(200);
      const drawData = await drawRes.json();
      expect(drawData.success).toBe(true);
      expect(drawData.teams.length).toBe(3);
      expect(drawData.reserves.length).toBe(0);
      // Cada equipe 1v1 tem exatamente 1 jogador
      drawData.teams.forEach((t: any) => {
        expect(t.members.length).toBe(1);
      });

      // Idempotência: segundo sorteio sem force deve retornar 409
      const drawDupRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/draw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ algorithm: 'random' }),
        })
      );
      expect(drawDupRes.status).toBe(409);
    });

    it('4. Gera chave mata-mata 1v1 com BYE e avanço automático', async () => {
      const bracketGenRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/bracket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        })
      );
      expect(bracketGenRes.status).toBe(200);

      // Consulta a chave gerada
      const bracketRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/bracket`)
      );
      expect(bracketRes.status).toBe(200);
      const bracketData = await bracketRes.json();
      expect(bracketData.rounds.length).toBe(2); // Semifinais (r=1) e Grande Final (r=2)

      // Chave de 4 posições com 3 duelistas deve ter exatamente 1 BYE
      const r1Matches = bracketData.matches.filter((m: any) => m.round_number === 1);
      const byeMatch = r1Matches.find((m: any) => m.is_bye);
      expect(byeMatch).toBeDefined();
      expect(byeMatch.status).toBe('completed');
      expect(byeMatch.winner_player_id).toBeTruthy();

      // Final já deve conter o duelista do BYE
      const finalMatch = bracketData.matches.find((m: any) => m.round_number === 2);
      expect(finalMatch).toBeDefined();
      expect(finalMatch.player_a_id || finalMatch.player_b_id).toBe(byeMatch.winner_player_id);
    });

    it('5. Registra resultado MD1 na semifinal com validação de empate e avanço automático', async () => {
      const bracketRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/bracket`)
      );
      const bracketData = await bracketRes.json();
      const semiMatch = bracketData.matches.find((m: any) => m.round_number === 1 && !m.is_bye);
      expect(semiMatch).toBeDefined();

      // Teste de validação: empate não permitido
      const tieRes = await router(
        new Request(`http://localhost:5173/api/matches/${semiMatch.id}/result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mapName: 'aim_map',
            scoreA: 12,
            scoreB: 12,
            winnerId: semiMatch.player_a_id,
          }),
        })
      );
      expect(tieRes.status).toBe(400);

      // Resultado válido na semifinal
      const validRes = await router(
        new Request(`http://localhost:5173/api/matches/${semiMatch.id}/result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mapName: 'aim_map',
            scoreA: 13,
            scoreB: 9,
            winnerId: semiMatch.player_a_id,
            evidenceUrl: 'https://cs-arena.vercel.app/evidences/semi1.png',
          }),
        })
      );
      expect(validRes.status).toBe(200);

      // Verifica que a Grande Final agora possui os dois duelistas definidos
      const bracketRes2 = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/bracket`)
      );
      const bracketData2 = await bracketRes2.json();
      const finalMatch = bracketData2.matches.find((m: any) => m.round_number === 2);
      expect(finalMatch.player_a_id).toBeTruthy();
      expect(finalMatch.player_b_id).toBeTruthy();
      expect(finalMatch.status).toBe('pending');
    });

    it('6. Conclui Grande Final 1v1, coroa campeão e valida ranking final', async () => {
      const bracketRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/bracket`)
      );
      const bracketData = await bracketRes.json();
      const finalMatch = bracketData.matches.find((m: any) => m.round_number === 2);

      const finishRes = await router(
        new Request(`http://localhost:5173/api/matches/${finalMatch.id}/result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mapName: 'aim_map',
            scoreA: 13,
            scoreB: 11,
            winnerId: finalMatch.player_a_id,
          }),
        })
      );
      expect(finishRes.status).toBe(200);
      const finishData = await finishRes.json();
      expect(finishData.tournamentCompleted).toBe(true);

      // Ranking final: Campeão (1º lugar) e Vice-campeão (2º lugar)
      const rankRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t1v1Id}/ranking`)
      );
      expect(rankRes.status).toBe(200);
      const rankData = await rankRes.json();
      expect(rankData.rankings.length).toBeGreaterThanOrEqual(2);
      expect(rankData.rankings[0].rank).toBe(1);
      expect(rankData.rankings[1].rank).toBe(2);
    });
  });

  // ==========================================
  // MODALIDADE 2v2: DUPLAS
  // ==========================================
  describe('Modalidade 2v2 — Duplas', () => {
    let t2v2Id: string;

    it('Cria torneio 2v2, inscreve 5 jogadores e valida formação de 2 equipes e 1 reserva', async () => {
      const createRes = await router(
        new Request('http://localhost:5173/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: 'Wingman 2x2 — Integração Vitest',
            slug: `wingman-2v2-test-${Date.now()}`,
            game_mode: '2v2',
            team_size: 2,
            format: 'single_elimination',
            best_of: 1,
            map_selection: 'admin',
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const tData = await createRes.json();
      t2v2Id = tData.tournament.id;
      createdTournamentIds.push(t2v2Id);

      // Inscreve 5 jogadores (gera 2 duplas + 1 reserva)
      for (let i = 0; i < 5; i++) {
        await router(
          new Request(`http://localhost:5173/api/tournaments/${t2v2Id}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ playerId: testPlayerIds[i] }),
          })
        );
      }

      // Projeção
      const projRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t2v2Id}/registrations/projection`)
      );
      const projData = await projRes.json();
      expect(projData.possibleTeams).toBe(2);
      expect(projData.reservesCount).toBe(1);

      // Sorteio
      const drawRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t2v2Id}/draw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ algorithm: 'random' }),
        })
      );
      expect(drawRes.status).toBe(200);
      const drawData = await drawRes.json();
      expect(drawData.teams.length).toBe(2);
      expect(drawData.reserves.length).toBe(1);
      drawData.teams.forEach((team: any) => {
        expect(team.members.length).toBe(2);
      });
    });
  });

  // ==========================================
  // MODALIDADE 3v3: TRIOS
  // ==========================================
  describe('Modalidade 3v3 — Trios', () => {
    let t3v3Id: string;

    it('Cria torneio 3v3, inscreve 6 jogadores e gera 2 trios completos sem reservas', async () => {
      const createRes = await router(
        new Request('http://localhost:5173/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: 'Trios 3x3 — Integração Vitest',
            slug: `trios-3v3-test-${Date.now()}`,
            game_mode: '3v3',
            team_size: 3,
            format: 'single_elimination',
            best_of: 1,
            map_selection: 'admin',
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const tData = await createRes.json();
      t3v3Id = tData.tournament.id;
      createdTournamentIds.push(t3v3Id);

      // Inscreve 6 jogadores
      for (let i = 0; i < 6; i++) {
        await router(
          new Request(`http://localhost:5173/api/tournaments/${t3v3Id}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ playerId: testPlayerIds[i] }),
          })
        );
      }

      // Sorteio
      const drawRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t3v3Id}/draw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ algorithm: 'random' }),
        })
      );
      expect(drawRes.status).toBe(200);
      const drawData = await drawRes.json();
      expect(drawData.teams.length).toBe(2);
      expect(drawData.reserves.length).toBe(0);
      drawData.teams.forEach((team: any) => {
        expect(team.members.length).toBe(3);
      });
    });
  });

  // ==========================================
  // MODALIDADE 4v4: QUARTETOS
  // ==========================================
  describe('Modalidade 4v4 — Quartetos', () => {
    let t4v4Id: string;

    it('Cria torneio 4v4, inscreve 8 jogadores e gera 2 quartetos completos', async () => {
      const createRes = await router(
        new Request('http://localhost:5173/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: 'Quartetos 4x4 — Integração Vitest',
            slug: `quartetos-4v4-test-${Date.now()}`,
            game_mode: '4v4',
            team_size: 4,
            format: 'single_elimination',
            best_of: 1,
            map_selection: 'admin',
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const tData = await createRes.json();
      t4v4Id = tData.tournament.id;
      createdTournamentIds.push(t4v4Id);

      // Inscreve 8 jogadores
      for (let i = 0; i < 8; i++) {
        await router(
          new Request(`http://localhost:5173/api/tournaments/${t4v4Id}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ playerId: testPlayerIds[i] }),
          })
        );
      }

      // Sorteio
      const drawRes = await router(
        new Request(`http://localhost:5173/api/tournaments/${t4v4Id}/draw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ algorithm: 'random' }),
        })
      );
      expect(drawRes.status).toBe(200);
      const drawData = await drawRes.json();
      expect(drawData.teams.length).toBe(2);
      expect(drawData.reserves.length).toBe(0);
      drawData.teams.forEach((team: any) => {
        expect(team.members.length).toBe(4);
      });
    });
  });

  // ==========================================
  // FILTRAGEM POR MODALIDADE NO ENDPOINT DE LISTAGEM
  // ==========================================
  describe('Filtros da API por Modalidade (gameMode query parameter)', () => {
    it('GET /api/tournaments?gameMode=1v1 deve retornar apenas torneios 1v1', async () => {
      const res = await router(new Request('http://localhost:5173/api/tournaments?gameMode=1v1'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tournaments.length).toBeGreaterThanOrEqual(1);
      data.tournaments.forEach((t: any) => {
        expect(t.game_mode).toBe('1v1');
      });
    });

    it('GET /api/tournaments?gameMode=2v2 deve retornar apenas torneios 2v2', async () => {
      const res = await router(new Request('http://localhost:5173/api/tournaments?gameMode=2v2'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tournaments.length).toBeGreaterThanOrEqual(1);
      data.tournaments.forEach((t: any) => {
        expect(t.game_mode).toBe('2v2');
      });
    });
  });
});
