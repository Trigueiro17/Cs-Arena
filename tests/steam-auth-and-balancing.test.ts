// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SteamService } from '../server/services/steam.service';
import { formTeams, type PlayerData } from '../src/lib/tournament-engine';
import { sql } from '../server/db';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe('Steam OpenID 2.0 & Skill Balancing Integration', () => {
  describe('1. Steam OpenID URL Builder', () => {
    it('deve gerar URL de autenticação OpenID 2.0 com realm e return_to corretos', () => {
      const baseUrl = 'https://cs-arena.vercel.app';
      const loginUrl = SteamService.buildLoginUrl(baseUrl);
      const url = new URL(loginUrl);

      expect(url.origin).toBe('https://steamcommunity.com');
      expect(url.pathname).toBe('/openid/login');
      expect(url.searchParams.get('openid.ns')).toBe('http://specs.openid.net/auth/2.0');
      expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
      expect(url.searchParams.get('openid.return_to')).toBe('https://cs-arena.vercel.app/api/auth/steam/return');
      expect(url.searchParams.get('openid.realm')).toBe('https://cs-arena.vercel.app/');
      expect(url.searchParams.get('openid.identity')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
      expect(url.searchParams.get('openid.claimed_id')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
    });

    it('deve suportar caminho customizado de retorno', () => {
      const loginUrl = SteamService.buildLoginUrl('http://localhost:5173', '/custom/steam/callback');
      const url = new URL(loginUrl);
      expect(url.searchParams.get('openid.return_to')).toBe('http://localhost:5173/custom/steam/callback');
    });
  });

  describe('2. Validação OpenID 2.0 & Extração do SteamID64', () => {
    it('deve rejeitar requisição quando usuário cancela na Steam (openid.mode=cancel)', async () => {
      const res = await SteamService.validateOpenIdResponse({
        'openid.mode': 'cancel',
      });
      expect(res.valid).toBe(false);
      expect(res.steamId64).toBeNull();
      expect(res.error).toContain('cancelada');
    });

    it('deve rejeitar se claimed_id estiver ausente', async () => {
      const res = await SteamService.validateOpenIdResponse({
        'openid.mode': 'id_res',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('claimed_id');
    });

    it('deve rejeitar formato de claimed_id inválido', async () => {
      const res = await SteamService.validateOpenIdResponse({
        'openid.mode': 'id_res',
        'openid.claimed_id': 'https://google.com/malicious',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Formato de SteamID inválido');
    });

    it('deve extrair SteamID64 e validar com sucesso usando mock de teste', async () => {
      const testSteamId = '76561198012345678';
      const res = await SteamService.validateOpenIdResponse({
        'openid.mode': 'id_res',
        'openid.claimed_id': `https://steamcommunity.com/openid/id/${testSteamId}`,
        'openid.sig': 'mock_sig',
      });
      expect(res.valid).toBe(true);
      expect(res.steamId64).toBe(testSteamId);
    });
  });

  describe('3. Cálculo de Nível e Rating de Habilidade (Skill Rating)', () => {
    it('deve calcular rating base para novo jogador com 0 horas e nível 1', () => {
      const rating = SteamService.calculateSkillRating(0, 1);
      // 1000 base + 0 horas + 12 nível = 1012
      expect(rating).toBe(1012);
    });

    it('deve premiar horas jogadas, nível Steam e K/D positivo', () => {
      // 500 horas * 0.75 = 375 pts
      // Nível 20 * 12 = 240 pts
      // K/D 1.4: (1.4 - 1.0) * 300 = 120 pts
      // 1000 + 375 + 240 + 120 = 1735
      const rating = SteamService.calculateSkillRating(500, 20, 1400, 1000, 1.4);
      expect(rating).toBe(1735);
    });

    it('deve respeitar os limites de cap (800 mínimo e 3200 máximo)', () => {
      const proRating = SteamService.calculateSkillRating(10000, 200, 50000, 20000, 2.5);
      expect(proRating).toBe(3200);

      const penaltyRating = SteamService.calculateSkillRating(0, 1, 10, 100, 0.1);
      expect(penaltyRating).toBeGreaterThanOrEqual(800);
      expect(penaltyRating).toBeLessThanOrEqual(3200);
    });
  });

  describe('4. Sorteio Balanceado (Snake Draft) por Nível Steam', () => {
    const mockPlayers: PlayerData[] = [
      { id: 'p1', nickname: 'Fallen_Veteran', skillRating: 2800 }, // Nível alto / muitas horas
      { id: 'p2', nickname: 'Cold_Star', skillRating: 2600 },
      { id: 'p3', nickname: 'Fer_Beast', skillRating: 2400 },
      { id: 'p4', nickname: 'Taco_Support', skillRating: 2100 },
      { id: 'p5', nickname: 'Fnx_Clutch', skillRating: 1900 },
      { id: 'p6', nickname: 'Medium_Player1', skillRating: 1600 },
      { id: 'p7', nickname: 'Medium_Player2', skillRating: 1500 },
      { id: 'p8', nickname: 'Junior_Player', skillRating: 1200 },
      { id: 'p9', nickname: 'Casual_Player', skillRating: 1100 },
      { id: 'p10', nickname: 'Beginner_Newbie', skillRating: 1000 },
    ];
    const playerMap = new Map(mockPlayers.map(p => [p.id, p]));

    it('deve equilibrar 2 equipes de 5v5 com média de rating quase idêntica', () => {
      const { teams } = formTeams(mockPlayers, 'balanced', 5, '5v5');
      expect(teams).toHaveLength(2);
      expect(teams[0].members).toHaveLength(5);
      expect(teams[1].members).toHaveLength(5);

      const avgTeam1 = teams[0].members.reduce((acc, m) => acc + (playerMap.get(m.playerId)?.skillRating || 1000), 0) / 5;
      const avgTeam2 = teams[1].members.reduce((acc, m) => acc + (playerMap.get(m.playerId)?.skillRating || 1000), 0) / 5;

      const difference = Math.abs(avgTeam1 - avgTeam2);
      // Snake draft guarantees rating delta is very small (< 100 pts)
      expect(difference).toBeLessThan(150);

      // Verify snake order: Team 1 has p1 (2800) as captain, Team 2 has p2 (2600) as captain
      expect(teams[0].captainId).toBe('p1');
      expect(teams[1].captainId).toBe('p2');
    });

    it('deve equilibrar 5 equipes de 2v2 a partir dos 10 jogadores', () => {
      const { teams } = formTeams(mockPlayers, 'balanced', 2, '2v2');
      expect(teams).toHaveLength(5);
      for (const t of teams) {
        expect(t.members).toHaveLength(2);
      }

      // Check that top player is paired with lowest player in snake drafting
      const teamOfTop1 = teams.find(t => t.captainId === 'p1');
      expect(teamOfTop1).toBeDefined();
      expect(teamOfTop1?.members.some(m => m.playerId === 'p10')).toBe(true);
    });
  });

  describe.skipIf(!hasDatabaseUrl)('5. Integração com Banco Neon PostgreSQL', () => {
    it('deve criar ou sincronizar usuário e jogador com SteamID', async () => {
      const testSteamId = `test_steam_${Date.now()}`;
      const { user, player } = await SteamService.syncSteamUserAndPlayer(testSteamId);

      expect(user).toBeDefined();
      expect(user.steam_id).toBe(testSteamId);
      expect(player).toBeDefined();
      expect(player.steam_id).toBe(testSteamId);
      expect(player.skill_rating).toBeGreaterThanOrEqual(800);
      expect(player.steam_level).toBeGreaterThanOrEqual(1);

      // Cleanup test user and player
      await sql`DELETE FROM cs_arena.players WHERE steam_id = ${testSteamId};`;
      await sql`DELETE FROM cs_arena.users WHERE steam_id = ${testSteamId};`;
    });
  });
});
