import crypto from 'crypto';

export interface PlayerData {
  id: string;
  nickname: string;
  steamId?: string | null;
  avatarUrl?: string | null;
  preferredRole: 'AWP' | 'Entry' | 'Support' | 'IGL' | 'Flex';
  skillRating: number;
}

export interface TeamDraftResult {
  teams: {
    name: string;
    seed: number;
    captainId?: string;
    members: { playerId: string; isCaptain: boolean }[];
  }[];
  reserves: { playerId: string }[];
  algorithm: 'random' | 'balanced' | 'captains';
}

/**
 * Secure cryptographic shuffle using Fisher-Yates and crypto.randomInt
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // Generate cryptographically secure random index in [0, i]
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Returns next power of 2 >= n
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Validates eligibility and forms 5-player teams + reserves
 */
export function formTeams(
  players: PlayerData[],
  algorithm: 'random' | 'balanced' | 'captains' = 'random'
): TeamDraftResult {
  const N = players.length;
  const teamSize = 5;
  const teamCount = Math.floor(N / teamSize);
  const reserveCount = N % teamSize;

  if (teamCount < 2) {
    throw new Error(
      `Inscritos insuficientes: são necessários no mínimo 10 jogadores (2 equipes completas de 5) para iniciar o campeonato 5x5. Atualmente há ${N} jogador(es).`
    );
  }

  let selectedPlayers: PlayerData[];
  let reservePlayers: PlayerData[];

  if (algorithm === 'random') {
    const shuffled = secureShuffle(players);
    const activeTotal = teamCount * teamSize;
    selectedPlayers = shuffled.slice(0, activeTotal);
    reservePlayers = shuffled.slice(activeTotal);
  } else if (algorithm === 'balanced') {
    // Sort players by skill rating descending
    const sorted = [...players].sort((a, b) => b.skillRating - a.skillRating);
    const activeTotal = teamCount * teamSize;
    // Take the lowest rated as reserves (or transparent audited cutoff)
    selectedPlayers = sorted.slice(0, activeTotal);
    reservePlayers = sorted.slice(activeTotal);
  } else {
    // Captains mode: top teamCount players become captains
    const sorted = [...players].sort((a, b) => b.skillRating - a.skillRating);
    const activeTotal = teamCount * teamSize;
    selectedPlayers = sorted.slice(0, activeTotal);
    reservePlayers = sorted.slice(activeTotal);
  }

  // Team names inspired by CS esports
  const defaultNames = [
    'Alpha Strike', 'Shadow Ninjas', 'Cyber Immortals', 'Viper Squad',
    'Phantom Titans', 'Echo Fury', 'Apex Predators', 'Ghost Legion',
    'Vortex Esports', 'Iron Valkyries', 'Solaris CS', 'Nebula Gaming',
    'Quantum Force', 'Rogue Vanguard', 'Overdrive Gaming', 'Valiant Force'
  ];

  const teams: TeamDraftResult['teams'] = [];
  for (let t = 0; t < teamCount; t++) {
    teams.push({
      name: defaultNames[t] || `Time ${t + 1}`,
      seed: t + 1,
      members: [],
    });
  }

  if (algorithm === 'random') {
    // Distribute 5 players per team sequentially from shuffled list
    for (let t = 0; t < teamCount; t++) {
      const slice = selectedPlayers.slice(t * 5, (t + 1) * 5);
      // Pick first as captain
      teams[t].captainId = slice[0]?.id;
      teams[t].members = slice.map((p, idx) => ({
        playerId: p.id,
        isCaptain: idx === 0,
      }));
    }
  } else if (algorithm === 'balanced') {
    // Snake draft to balance total skill rating:
    // Round 0: 0, 1, ..., T-1
    // Round 1: T-1, ..., 1, 0
    // Round 2: 0, 1, ..., T-1
    // etc.
    let playerIndex = 0;
    for (let round = 0; round < 5; round++) {
      const isReverse = round % 2 === 1;
      const order = isReverse
        ? Array.from({ length: teamCount }, (_, i) => teamCount - 1 - i)
        : Array.from({ length: teamCount }, (_, i) => i);

      for (const t of order) {
        const player = selectedPlayers[playerIndex++];
        const isCaptain = round === 0;
        if (isCaptain) {
          teams[t].captainId = player.id;
        }
        teams[t].members.push({
          playerId: player.id,
          isCaptain,
        });
      }
    }
  } else {
    // Captains mode: first teamCount players are captains
    for (let t = 0; t < teamCount; t++) {
      const captain = selectedPlayers[t];
      teams[t].captainId = captain.id;
      teams[t].members.push({ playerId: captain.id, isCaptain: true });
    }
    // Snake draft remaining players
    const pool = selectedPlayers.slice(teamCount);
    let poolIndex = 0;
    for (let round = 1; round < 5; round++) {
      const isReverse = round % 2 === 1;
      const order = isReverse
        ? Array.from({ length: teamCount }, (_, i) => teamCount - 1 - i)
        : Array.from({ length: teamCount }, (_, i) => i);

      for (const t of order) {
        const player = pool[poolIndex++];
        teams[t].members.push({ playerId: player.id, isCaptain: false });
      }
    }
  }

  return {
    teams,
    reserves: reservePlayers.map(p => ({ playerId: p.id })),
    algorithm,
  };
}

export interface GeneratedMatch {
  roundNumber: number;
  roundName: string;
  bracketPosition: number;
  teamASeed?: number | null;
  teamBSeed?: number | null;
  teamAId?: string | null;
  teamBId?: string | null;
  winnerId?: string | null;
  isBye: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  nextRoundMatchIndex?: number;
  nextMatchSlot?: 'team_a' | 'team_b';
}

/**
 * Standard tournament round names in Portuguese
 */
export function getRoundName(totalRounds: number, currentRound: number): string {
  const roundsFromFinal = totalRounds - currentRound;
  switch (roundsFromFinal) {
    case 0:
      return 'Grande Final';
    case 1:
      return 'Semifinais';
    case 2:
      return 'Quartas de Final';
    case 3:
      return 'Oitavas de Final';
    default:
      return `Rodada ${currentRound}`;
  }
}

/**
 * Generates single-elimination bracket with standard seed placement and BYEs
 */
export function generateSingleEliminationBracket(
  teams: { id: string; seed: number; name: string }[],
  bestOf: number = 1
): {
  rounds: { roundNumber: number; name: string }[];
  matches: GeneratedMatch[];
} {
  const T = teams.length;
  if (T < 2) {
    throw new Error('É necessário ter no mínimo 2 equipes para gerar o chaveamento.');
  }

  const P = nextPowerOfTwo(T);
  const totalRounds = Math.log2(P);
  const byeCount = P - T;

  const rounds: { roundNumber: number; name: string }[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      roundNumber: r,
      name: getRoundName(totalRounds, r),
    });
  }

  // Generate standard tournament seed pairings for size P
  // e.g. for P=4: [1, 4], [2, 3]
  // e.g. for P=8: [1, 8], [4, 5], [2, 7], [3, 6]
  function getSeedPairings(size: number): number[] {
    let pairings = [1, 2];
    while (pairings.length < size) {
      const next: number[] = [];
      const currentSum = pairings.length * 2 + 1;
      for (const s of pairings) {
        next.push(s);
        next.push(currentSum - s);
      }
      pairings = next;
    }
    return pairings;
  }

  const seedOrder = getSeedPairings(P);
  const teamBySeed = new Map(teams.map(t => [t.seed, t]));

  // Create match nodes across all rounds
  const allMatches: GeneratedMatch[] = [];
  const matchesByRound: GeneratedMatch[][] = [];

  let matchCounter = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const matchCountInRound = P / Math.pow(2, r);
    const roundList: GeneratedMatch[] = [];
    for (let pos = 0; pos < matchCountInRound; pos++) {
      roundList.push({
        roundNumber: r,
        roundName: rounds[r - 1].name,
        bracketPosition: matchCounter++,
        teamAId: null,
        teamBId: null,
        isBye: false,
        status: 'pending',
      });
    }
    matchesByRound.push(roundList);
  }

  // Connect rounds (each 2 matches in round r feed 1 match in round r+1)
  for (let r = 0; r < totalRounds - 1; r++) {
    const currentRound = matchesByRound[r];
    const nextRound = matchesByRound[r + 1];
    for (let i = 0; i < currentRound.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const slot: 'team_a' | 'team_b' = i % 2 === 0 ? 'team_a' : 'team_b';
      currentRound[i].nextRoundMatchIndex = nextRound[nextMatchIndex].bracketPosition;
      currentRound[i].nextMatchSlot = slot;
    }
  }

  // Populate Round 1 with teams and BYEs
  const round1 = matchesByRound[0];
  for (let i = 0; i < round1.length; i++) {
    const seedA = seedOrder[i * 2];
    const seedB = seedOrder[i * 2 + 1];

    const teamA = teamBySeed.get(seedA) || null;
    const teamB = teamBySeed.get(seedB) || null;

    round1[i].teamASeed = seedA <= T ? seedA : null;
    round1[i].teamBSeed = seedB <= T ? seedB : null;
    round1[i].teamAId = teamA?.id || null;
    round1[i].teamBId = teamB?.id || null;

    // Check if this match has a BYE
    if (teamA && !teamB) {
      // Team A automatically advances via BYE
      round1[i].isBye = true;
      round1[i].status = 'completed';
      round1[i].winnerId = teamA.id;
      // Advance to next round immediately
      if (totalRounds > 1) {
        const nextMatchPos = round1[i].nextRoundMatchIndex!;
        const nextMatch = matchesByRound.flat().find(m => m.bracketPosition === nextMatchPos);
        if (nextMatch) {
          if (round1[i].nextMatchSlot === 'team_a') {
            nextMatch.teamAId = teamA.id;
          } else {
            nextMatch.teamBId = teamA.id;
          }
        }
      }
    } else if (!teamA && teamB) {
      // Team B automatically advances via BYE
      round1[i].isBye = true;
      round1[i].status = 'completed';
      round1[i].winnerId = teamB.id;
      if (totalRounds > 1) {
        const nextMatchPos = round1[i].nextRoundMatchIndex!;
        const nextMatch = matchesByRound.flat().find(m => m.bracketPosition === nextMatchPos);
        if (nextMatch) {
          if (round1[i].nextMatchSlot === 'team_a') {
            nextMatch.teamAId = teamB.id;
          } else {
            nextMatch.teamBId = teamB.id;
          }
        }
      }
    }
  }

  return {
    rounds,
    matches: matchesByRound.flat(),
  };
}

/**
 * Validates match map scores and determines series winner
 */
export function checkSeriesWinner(
  maps: { scoreA: number; scoreB: number; winnerId?: string | null }[],
  teamAId: string,
  teamBId: string,
  bestOf: number
): {
  isCompleted: boolean;
  winsA: number;
  winsB: number;
  seriesWinnerId: string | null;
  error?: string;
} {
  const winsRequired = Math.ceil(bestOf / 2);
  let winsA = 0;
  let winsB = 0;

  for (const m of maps) {
    if (m.scoreA === m.scoreB) {
      return {
        isCompleted: false,
        winsA,
        winsB,
        seriesWinnerId: null,
        error: 'Mapas de Counter-Strike não podem terminar empatados.',
      };
    }
    if (m.scoreA > m.scoreB) {
      winsA++;
    } else {
      winsB++;
    }
  }

  if (winsA >= winsRequired) {
    return {
      isCompleted: true,
      winsA,
      winsB,
      seriesWinnerId: teamAId,
    };
  }

  if (winsB >= winsRequired) {
    return {
      isCompleted: true,
      winsA,
      winsB,
      seriesWinnerId: teamBId,
    };
  }

  return {
    isCompleted: false,
    winsA,
    winsB,
    seriesWinnerId: null,
  };
}
