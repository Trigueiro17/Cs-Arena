// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { router } from '../server/index';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)('CS Arena — Acceptance Criteria Demo Real (43 Jogadores)', () => {
  let adminToken: string;
  let playerToken: string;
  let tournamentId: string;

  it('Setup: Efetua login real via API e busca torneio de 43 jogadores no Neon', async () => {
    // 1. Login Real de Admin
    const adminLoginReq = new Request('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@csarena.com', password: 'admin123' }),
    });
    const adminLoginRes = await router(adminLoginReq);
    expect(adminLoginRes.status).toBe(200);
    const adminData = await adminLoginRes.json();
    expect(adminData.token).toBeTruthy();
    expect(adminData.user.role.toUpperCase()).toBe('ADMIN');
    adminToken = adminData.token;

    // 2. Login Real de Jogador Comum
    let playerLoginReq = new Request('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'player@csarena.com', password: 'player123' }),
    });
    let playerLoginRes = await router(playerLoginReq);
    if (playerLoginRes.status === 401) {
      await router(
        new Request('http://localhost:5173/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Jogador Teste Demo',
            nickname: 'player_demo_43',
            email: 'player@csarena.com',
            password: 'player123',
          }),
        })
      );
      playerLoginReq = new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'player@csarena.com', password: 'player123' }),
      });
      playerLoginRes = await router(playerLoginReq);
    }
    expect(playerLoginRes.status).toBe(200);
    const playerData = await playerLoginRes.json();
    playerToken = playerData.token;

    // 3. Buscar torneio oficial de 43 jogadores
    const req = new Request('http://localhost:5173/api/tournaments', { method: 'GET' });
    const res = await router(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    const t43 = data.tournaments.find((t: any) => t.slug === 'cs2-major-arena-43');
    expect(t43).toBeDefined();
    expect(t43.registrations_count).toBe(43);
    tournamentId = t43.id;
  });

  it('Passo 1: Jogador comum não pode realizar sorteio (deve retornar HTTP 403 Forbidden)', async () => {
    const req = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/draw-teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`,
      },
      body: JSON.stringify({ algorithm: 'random' }),
    });
    const res = await router(req);
    expect(res.status).toBe(403);
  });

  it('Passo 2: Admin executa sorteio das equipes — gera exatamente 8 equipes completas e 3 reservas', async () => {
    const req = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/draw-teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ algorithm: 'random', forceReset: true }),
    });
    const res = await router(req);
    const data = await res.json();
    if (res.status !== 200) {
      console.error('DRAW-TEAMS ERROR:', data);
    }
    expect(res.status).toBe(200);

    expect(data.teamsCount).toBe(8);
    expect(data.reservesCount).toBe(3);
    expect(data.animationSteps.length).toBe(40); // 8 equipes x 5 jogadores = 40 passos
  }, 15000);

  it('Passo 3: Garante que nenhum jogador foi duplicado em equipes ou reservas', async () => {
    const req = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/teams`, { method: 'GET' });
    const res = await router(req);
    const data = await res.json();

    expect(data.teams.length).toBe(8);
    expect(data.reserves.length).toBe(3);

    const playerIds = new Set<string>();
    for (const team of data.teams) {
      expect(team.members.length).toBe(5);
      for (const m of team.members) {
        expect(playerIds.has(m.player_id)).toBe(false);
        playerIds.add(m.player_id);
      }
    }

    for (const r of data.reserves) {
      expect(playerIds.has(r.player_id)).toBe(false);
      playerIds.add(r.player_id);
    }

    expect(playerIds.size).toBe(43);
  });

  it('Passo 4: Gera chaveamento mata-mata (Quartas, Semifinais e Final)', async () => {
    const req = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/draw-bracket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const res = await router(req);
    expect(res.status).toBe(200);

    const bReq = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/bracket`, { method: 'GET' });
    const bRes = await router(bReq);
    const bracket = await bRes.json();

    expect(bracket.rounds.length).toBe(3);
    expect(bracket.rounds[0].name).toBe('Quartas de Final');
    expect(bracket.rounds[1].name).toBe('Semifinais');
    expect(bracket.rounds[2].name).toBe('Grande Final');

    // 8 equipes = 4 partidas nas quartas, 2 nas semis, 1 na final = 7 partidas
    expect(bracket.matches.length).toBe(7);
  });

  it('Passo 5: Simula e avança Quartas de Final (4 vencedores)', async () => {
    const bReq = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/bracket`, { method: 'GET' });
    const bRes = await router(bReq);
    const bracket = await bRes.json();

    const qfMatches = bracket.matches.filter((m: any) => m.round_id === bracket.rounds[0].id);
    expect(qfMatches.length).toBe(4);

    for (const m of qfMatches) {
      expect(m.team_a_id).toBeTruthy();
      expect(m.team_b_id).toBeTruthy();

      const resultReq = new Request(`http://localhost:5173/api/matches/${m.id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          maps: [
            { orderNumber: 1, mapName: 'Mirage', scoreA: 13, scoreB: 9 },
          ],
        }),
      });
      const res = await router(resultReq);
      expect(res.status).toBe(200);
      const resData = await res.json();
      expect(resData.series.isCompleted).toBe(true);
      expect(resData.series.seriesWinnerId).toBe(m.team_a_id);
    }
  });

  it('Passo 6: Simula e avança Semifinais (2 vencedores)', async () => {
    const bReq = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/bracket`, { method: 'GET' });
    const bRes = await router(bReq);
    const bracket = await bRes.json();

    const semiMatches = bracket.matches.filter((m: any) => m.round_id === bracket.rounds[1].id);
    expect(semiMatches.length).toBe(2);

    for (const m of semiMatches) {
      expect(m.team_a_id).toBeTruthy();
      expect(m.team_b_id).toBeTruthy();

      const resultReq = new Request(`http://localhost:5173/api/matches/${m.id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          maps: [
            { orderNumber: 1, mapName: 'Inferno', scoreA: 13, scoreB: 8 },
          ],
        }),
      });
      const res = await router(resultReq);
      expect(res.status).toBe(200);
      const resData = await res.json();
      expect(resData.series.isCompleted).toBe(true);
      expect(resData.series.seriesWinnerId).toBe(m.team_a_id);
    }
  });

  it('Passo 7: Simula Grande Final, coroa Campeão e conclui torneio', async () => {
    const bReq = new Request(`http://localhost:5173/api/tournaments/${tournamentId}/bracket`, { method: 'GET' });
    const bRes = await router(bReq);
    const bracket = await bRes.json();

    const finalMatch = bracket.matches.find((m: any) => m.round_id === bracket.rounds[2].id);
    expect(finalMatch.team_a_id).toBeTruthy();
    expect(finalMatch.team_b_id).toBeTruthy();

    const resultReq = new Request(`http://localhost:5173/api/matches/${finalMatch.id}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        maps: [
          { orderNumber: 1, mapName: 'Nuke', scoreA: 16, scoreB: 14 },
        ],
      }),
    });
    const res = await router(resultReq);
    expect(res.status).toBe(200);

    // Verificar torneio finalizado no banco
    const tReq = new Request(`http://localhost:5173/api/tournaments/${tournamentId}`, { method: 'GET' });
    const tRes = await router(tReq);
    const tData = await tRes.json();
    expect(tData.tournament.status).toBe('completed');

    // Recarregar chaveamento e verificar persistência do campeão no Neon
    const finalBracketRes = await router(bReq);
    const finalBracket = await finalBracketRes.json();
    const resolvedFinal = finalBracket.matches.find((m: any) => m.round_id === bracket.rounds[2].id);
    expect(resolvedFinal.winner_id).toBe(finalMatch.team_a_id);
    expect(resolvedFinal.winner_name).toBeTruthy();
  });
});
