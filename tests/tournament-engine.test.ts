import { describe, it, expect } from 'vitest';
import {
  formTeams,
  generateSingleEliminationBracket,
  checkSeriesWinner,
  PlayerData,
  nextPowerOfTwo,
} from '../src/lib/tournament-engine';

function createMockPlayers(count: number): PlayerData[] {
  const roles: ('AWP' | 'Entry' | 'Support' | 'IGL' | 'Flex')[] = ['AWP', 'Entry', 'Support', 'IGL', 'Flex'];
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    nickname: `Player_${i + 1}`,
    preferredRole: roles[i % 5],
    skillRating: 1000 + (i * 25),
  }));
}

describe('CS Arena — Tournament Engine & Single Elimination Rules', () => {
  // Caso 1: 4 inscritos -> 0 equipes, 4 reservas, não inicia torneio 5x5
  it('Caso 1: 4 inscritos deve lançar erro e não iniciar torneio 5x5', () => {
    const players = createMockPlayers(4);
    expect(() => formTeams(players, 'random')).toThrowError(/Inscritos insuficientes/);
  });

  // Caso 2: 10 inscritos -> 2 equipes, final direta
  it('Caso 2: 10 inscritos deve formar 2 equipes completas e gerar final direta', () => {
    const players = createMockPlayers(10);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(2);
    expect(draft.reserves.length).toBe(0);

    const teams = draft.teams.map((t, idx) => ({ id: `team-${idx + 1}`, seed: t.seed, name: t.name }));
    const bracket = generateSingleEliminationBracket(teams, 1);

    expect(bracket.rounds.length).toBe(1);
    expect(bracket.rounds[0].name).toBe('Grande Final');
    expect(bracket.matches.length).toBe(1);
    expect(bracket.matches[0].isBye).toBe(false);
  });

  // Caso 3: 15 inscritos -> 3 equipes; chave de 4 posições com 1 BYE
  it('Caso 3: 15 inscritos deve formar 3 equipes e chave de 4 com 1 BYE', () => {
    const players = createMockPlayers(15);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(3);
    expect(draft.reserves.length).toBe(0);

    const teams = draft.teams.map((t, idx) => ({ id: `team-${idx + 1}`, seed: t.seed, name: t.name }));
    const bracket = generateSingleEliminationBracket(teams, 1);

    expect(bracket.rounds.length).toBe(2);
    expect(bracket.rounds[0].name).toBe('Semifinais');
    expect(bracket.rounds[1].name).toBe('Grande Final');
    // Chave de 4 posições = 2 semifinais + 1 final = 3 matches
    expect(bracket.matches.length).toBe(3);

    const byes = bracket.matches.filter(m => m.isBye);
    expect(byes.length).toBe(1);
    expect(byes[0].status).toBe('completed');
  });

  // Caso 4: 20 inscritos -> 4 equipes; semifinais e final
  it('Caso 4: 20 inscritos deve formar 4 equipes, 0 BYEs, semifinais e final', () => {
    const players = createMockPlayers(20);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(4);
    expect(draft.reserves.length).toBe(0);

    const teams = draft.teams.map((t, idx) => ({ id: `team-${idx + 1}`, seed: t.seed, name: t.name }));
    const bracket = generateSingleEliminationBracket(teams, 1);

    expect(bracket.rounds.length).toBe(2);
    expect(bracket.rounds[0].name).toBe('Semifinais');
    expect(bracket.rounds[1].name).toBe('Grande Final');
    expect(bracket.matches.filter(m => m.isBye).length).toBe(0);
  });

  // Caso 5: 30 inscritos -> 6 equipes; chave de 8 posições com 2 BYEs
  it('Caso 5: 30 inscritos deve formar 6 equipes e chave de 8 com 2 BYEs', () => {
    const players = createMockPlayers(30);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(6);
    expect(draft.reserves.length).toBe(0);

    const teams = draft.teams.map((t, idx) => ({ id: `team-${idx + 1}`, seed: t.seed, name: t.name }));
    const bracket = generateSingleEliminationBracket(teams, 1);

    expect(bracket.rounds.length).toBe(3);
    expect(bracket.rounds[0].name).toBe('Quartas de Final');
    expect(bracket.rounds[1].name).toBe('Semifinais');
    expect(bracket.rounds[2].name).toBe('Grande Final');

    const byes = bracket.matches.filter(m => m.isBye);
    expect(byes.length).toBe(2);
  });

  // Caso 6: 40 inscritos -> 8 equipes; quartas, semifinais e final (0 BYEs)
  it('Caso 6: 40 inscritos deve formar 8 equipes, quartas, semis e final', () => {
    const players = createMockPlayers(40);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(8);
    expect(draft.reserves.length).toBe(0);

    const teams = draft.teams.map((t, idx) => ({ id: `team-${idx + 1}`, seed: t.seed, name: t.name }));
    const bracket = generateSingleEliminationBracket(teams, 1);

    expect(bracket.rounds.length).toBe(3);
    expect(bracket.matches.filter(m => m.isBye).length).toBe(0);
  });

  // Caso 7: 43 inscritos -> 8 equipes e 3 reservas
  it('Caso 7: 43 inscritos deve formar exatamente 8 equipes completas e 3 reservas', () => {
    const players = createMockPlayers(43);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(8);
    expect(draft.reserves.length).toBe(3);

    // Cada equipe deve ter exatamente 5 membros
    draft.teams.forEach(t => {
      expect(t.members.length).toBe(5);
    });

    // Nenhum jogador deve estar duplicado entre equipes ou reservas
    const allAssignedIds = new Set<string>();
    draft.teams.forEach(t => {
      t.members.forEach(m => {
        expect(allAssignedIds.has(m.playerId)).toBe(false);
        allAssignedIds.add(m.playerId);
      });
    });
    draft.reserves.forEach(r => {
      expect(allAssignedIds.has(r.playerId)).toBe(false);
      allAssignedIds.add(r.playerId);
    });
    expect(allAssignedIds.size).toBe(43);
  });

  // Caso 8: 75 inscritos -> 15 equipes; chave de 16 posições com 1 BYE
  it('Caso 8: 75 inscritos deve formar 15 equipes e chave de 16 com 1 BYE', () => {
    const players = createMockPlayers(75);
    const draft = formTeams(players, 'random');
    expect(draft.teams.length).toBe(15);
    expect(draft.reserves.length).toBe(0);

    const teams = draft.teams.map((t, idx) => ({ id: `team-${idx + 1}`, seed: t.seed, name: t.name }));
    const bracket = generateSingleEliminationBracket(teams, 1);

    expect(nextPowerOfTwo(15)).toBe(16);
    expect(bracket.rounds.length).toBe(4);
    expect(bracket.rounds[0].name).toBe('Oitavas de Final');

    const byes = bracket.matches.filter(m => m.isBye);
    expect(byes.length).toBe(1);
  });

  // Caso 10: Bloqueio de repetição de jogador em times diferentes
  it('Caso 10: Valida garantia de unicidade estrita de jogadores', () => {
    const players = createMockPlayers(20);
    const draft = formTeams(players, 'balanced');
    const playerIds = new Set<string>();

    for (const team of draft.teams) {
      for (const m of team.members) {
        expect(playerIds.has(m.playerId)).toBe(false);
        playerIds.add(m.playerId);
      }
    }
  });

  // Caso 12: Resultado inválido em MD3 com só 1 mapa vencido
  it('Caso 12: Série MD3 com apenas 1 mapa não deve dar vitória nem avançar', () => {
    const maps = [
      { scoreA: 13, scoreB: 11, winnerId: 'team-a' },
    ];
    const result = checkSeriesWinner(maps, 'team-a', 'team-b', 3);
    expect(result.isCompleted).toBe(false);
    expect(result.seriesWinnerId).toBeNull();
  });

  it('Caso 12b: Série MD3 com 2 mapas vencidos deve declarar vencedor', () => {
    const maps = [
      { scoreA: 13, scoreB: 11, winnerId: 'team-a' },
      { scoreA: 13, scoreB: 8, winnerId: 'team-a' },
    ];
    const result = checkSeriesWinner(maps, 'team-a', 'team-b', 3);
    expect(result.isCompleted).toBe(true);
    expect(result.seriesWinnerId).toBe('team-a');
  });

  it('Caso 12c: Empate em mapa de CS2 deve retornar erro', () => {
    const maps = [
      { scoreA: 12, scoreB: 12, winnerId: null },
    ];
    const result = checkSeriesWinner(maps, 'team-a', 'team-b', 1);
    expect(result.isCompleted).toBe(false);
    expect(result.error).toContain('empatados');
  });
});
