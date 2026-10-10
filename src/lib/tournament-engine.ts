import crypto from 'crypto';

export type GameMode = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';

export interface PlayerData {
  id: string;
  nickname: string;
  steamId?: string | null;
  avatarUrl?: string | null;
  preferredRole?: 'AWP' | 'Entry' | 'Support' | 'IGL' | 'Flex';
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
  teamSize: number;
  gameMode: GameMode;
}

/**
 * Returns the exact team size (number of players per team) for a given game mode
 */
export function getTeamSize(gameMode: GameMode): number {
  switch (gameMode) {
    case '1v1':
      return 1;
    case '2v2':
      return 2;
    case '3v3':
      return 3;
    case '4v4':
      return 4;
    case '5v5':
    default:
      return 5;
  }
}

/**
 * Returns human-readable label for the game mode
 */
export function getGameModeLabel(gameMode: GameMode): string {
  switch (gameMode) {
    case '1v1':
      return '1x1 — Duelo Individual';
    case '2v2':
      return '2x2 — Duplas';
    case '3v3':
      return '3x3 — Trios';
    case '4v4':
      return '4x4 — Quartetos';
    case '5v5':
    default:
      return '5x5 — Equipes Tradicionais';
  }
}

/**
 * Returns recommended Counter-Strike 2 maps for each tournament mode
 */
export function getRecommendedMaps(gameMode: GameMode): string[] {
  switch (gameMode) {
    case '1v1':
      return [
        'aim_redline',
        'aim_map',
        'aim_aztec',
        'aim_pistol_cs2',
        'awp_india',
        'Mirage (Mid Duel)',
        'Dust II (Long)',
      ];
    case '2v2':
      return [
        'Inferno (Wingman)',
        'Vertigo (Wingman)',
        'Nuke (Wingman)',
        'Overpass (Wingman)',
        'Cobblestone',
        'Shoots',
        'Baggage',
      ];
    case '3v3':
    case '4v4':
    case '5v5':
    default:
      return ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust II', 'Vertigo'];
  }
}

/**
 * Returns default tournament rules tailored for each modalidade
 */
export function getDefaultTournamentRules(gameMode: GameMode): string {
  switch (gameMode) {
    case '1v1':
      return 'Formato oficial CS2: Duelo individual 1x1 em eliminação simples (mata-mata). Confrontos MD1 em mapa único de duelo selecionado pela arbitragem. Empates não são permitidos em partidas competitivas.';
    case '2v2':
      return 'Formato oficial CS2: Duplas 2x2 em eliminação simples (mata-mata). Inscrição individual com sorteio oficial de duplas na roleta. Confrontos MD1 (Wingman). Empates não são permitidos.';
    case '3v3':
      return 'Formato oficial CS2: Trios 3x3 em eliminação simples (mata-mata). Inscrição individual com sorteio oficial de trios na roleta. Confrontos MD1 táticos. Empates não são permitidos.';
    case '4v4':
      return 'Formato oficial CS2: Quartetos 4x4 em eliminação simples (mata-mata). Inscrição individual com sorteio oficial de quartetos na roleta. Confrontos MD1 competitivos. Empates não são permitidos.';
    case '5v5':
    default:
      return 'Formato oficial CS2: Equipes tradicionais 5x5 em eliminação simples (mata-mata). Inscrição individual com sorteio oficial de quintetos na roleta. Confrontos MD1 competitivos. Empates não são permitidos.';
  }
}

/**
 * Secure cryptographic shuffle using Fisher-Yates and crypto.randomInt
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
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
 * Helper to generate thematic team names per mode
 */
function getTeamNamesPool(gameMode: GameMode, count: number): string[] {
  const duoNames = [
    'Dupla Alpha', 'Dupla Bravo', 'Dupla Charlie', 'Dupla Delta',
    'Dupla Echo', 'Dupla Foxtrot', 'Dupla Golf', 'Dupla Hotel',
    'Dupla India', 'Dupla Juliet', 'Dupla Kilo', 'Dupla Lima',
    'Dupla Mike', 'Dupla November', 'Dupla Oscar', 'Dupla Papa'
  ];

  const trioNames = [
    'Trio Alpha', 'Trio Shadow', 'Trio Viper', 'Trio Phoenix',
    'Trio Vortex', 'Trio Titan', 'Trio Specter', 'Trio Apex',
    'Trio Ghost', 'Trio Valkyrie', 'Trio Nebula', 'Trio Nova',
    'Trio Pulse', 'Trio Rogue', 'Trio Eclipse', 'Trio Zen'
  ];

  const squadNames = [
    'Quarteto Alpha', 'Quarteto Apex', 'Quarteto Storm', 'Quarteto Vanguard',
    'Quarteto Fury', 'Quarteto Strike', 'Quarteto Phantom', 'Quarteto Cyber',
    'Quarteto Iron', 'Quarteto Solaris', 'Quarteto Venom', 'Quarteto Titan',
    'Quarteto Cobalt', 'Quarteto Talon', 'Quarteto Echo', 'Quarteto Zenith'
  ];

  const esportsNames = [
    'Alpha Strike', 'Shadow Ninjas', 'Cyber Immortals', 'Viper Squad',
    'Phantom Titans', 'Echo Fury', 'Apex Predators', 'Ghost Legion',
    'Vortex Esports', 'Iron Valkyries', 'Solaris CS', 'Nebula Gaming',
    'Quantum Force', 'Rogue Vanguard', 'Overdrive Gaming', 'Valiant Force'
  ];

  let pool: string[];
  if (gameMode === '2v2') pool = duoNames;
  else if (gameMode === '3v3') pool = trioNames;
  else if (gameMode === '4v4') pool = squadNames;
  else pool = esportsNames;

  return Array.from({ length: count }, (_, i) => pool[i] || `Time ${i + 1}`);
}

/**
 * Validates eligibility and forms teams + reserves parameterized by teamSize (1 to 5)
 */
export function formTeams(
  players: PlayerData[],
  algorithm: 'random' | 'balanced' | 'captains' = 'random',
  teamSizeInput: number = 5,
  gameModeInput?: GameMode
): TeamDraftResult {
  const N = players.length;
  const teamSize = Math.max(1, Math.min(5, Math.floor(teamSizeInput)));
  const gameMode: GameMode = gameModeInput || (`${teamSize}v${teamSize}` as GameMode);

  // 1v1 Mode: Individual duelists
  if (teamSize === 1 || gameMode === '1v1') {
    if (N < 2) {
      throw new Error(
        `Inscritos insuficientes: são necessários no mínimo 2 duelistas para iniciar o campeonato 1x1. Atualmente há ${N} jogador(es).`
      );
    }

    let orderedPlayers: PlayerData[];
    if (algorithm === 'random') {
      orderedPlayers = secureShuffle(players);
    } else {
      orderedPlayers = [...players].sort((a, b) => b.skillRating - a.skillRating);
    }

    const teams = orderedPlayers.map((p, idx) => ({
      name: p.nickname,
      seed: idx + 1,
      captainId: p.id,
      members: [{ playerId: p.id, isCaptain: true }],
    }));

    return {
      teams,
      reserves: [],
      algorithm,
      teamSize: 1,
      gameMode: '1v1',
    };
  }

  // 2v2 to 5v5 Mode
  const teamCount = Math.floor(N / teamSize);
  const reserveCount = N % teamSize;
  const minRequired = teamSize * 2;

  if (teamCount < 2) {
    throw new Error(
      `Inscritos insuficientes: são necessários no mínimo ${minRequired} jogadores (2 equipes completas de ${teamSize}) para iniciar o campeonato ${teamSize}x${teamSize}. Atualmente há ${N} jogador(es).`
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
    selectedPlayers = sorted.slice(0, activeTotal);
    reservePlayers = sorted.slice(activeTotal);
  } else {
    // Captains mode: top teamCount players become captains
    const sorted = [...players].sort((a, b) => b.skillRating - a.skillRating);
    const activeTotal = teamCount * teamSize;
    selectedPlayers = sorted.slice(0, activeTotal);
    reservePlayers = sorted.slice(activeTotal);
  }

  const teamNames = getTeamNamesPool(gameMode, teamCount);
  const teams: TeamDraftResult['teams'] = [];
  for (let t = 0; t < teamCount; t++) {
    teams.push({
      name: teamNames[t],
      seed: t + 1,
      members: [],
    });
  }

  if (algorithm === 'random') {
    // Distribute exactly teamSize players per team sequentially from shuffled list
    for (let t = 0; t < teamCount; t++) {
      const slice = selectedPlayers.slice(t * teamSize, (t + 1) * teamSize);
      teams[t].captainId = slice[0]?.id;
      teams[t].members = slice.map((p, idx) => ({
        playerId: p.id,
        isCaptain: idx === 0,
      }));
    }
  } else if (algorithm === 'balanced') {
    // Snake draft to balance total skill rating across teamSize rounds
    let playerIndex = 0;
    for (let round = 0; round < teamSize; round++) {
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
    for (let round = 1; round < teamSize; round++) {
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
    teamSize,
    gameMode,
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
  playerAId?: string | null;
  playerBId?: string | null;
  winnerId?: string | null;
  winnerPlayerId?: string | null;
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
    case 4:
      return 'Dezesseis-avos de Final';
    default:
      return `Rodada ${currentRound}`;
  }
}

/**
 * Generates single-elimination bracket with standard seed placement and BYEs.
 * Supports both teams (2v2..5v5) and individual players (1v1).
 */
export function generateSingleEliminationBracket(
  participants: { id: string; seed: number; name: string }[],
  bestOf: number = 1,
  is1v1: boolean = false
): {
  rounds: { roundNumber: number; name: string }[];
  matches: GeneratedMatch[];
} {
  const T = participants.length;
  if (T < 2) {
    throw new Error(
      is1v1
        ? 'É necessário ter no mínimo 2 duelistas para gerar a chave de confrontos 1x1.'
        : 'É necessário ter no mínimo 2 equipes para gerar a chave de confrontos.'
    );
  }

  const P = nextPowerOfTwo(T);
  const totalRounds = Math.log2(P);

  const rounds: { roundNumber: number; name: string }[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      roundNumber: r,
      name: getRoundName(totalRounds, r),
    });
  }

  // Generate standard tournament seed pairings for size P
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
  const participantBySeed = new Map(participants.map(p => [p.seed, p]));

  // Create match nodes across all rounds
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
        playerAId: null,
        playerBId: null,
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

  // Populate Round 1 with participants and BYEs
  const round1 = matchesByRound[0];
  for (let i = 0; i < round1.length; i++) {
    const seedA = seedOrder[i * 2];
    const seedB = seedOrder[i * 2 + 1];

    const partA = participantBySeed.get(seedA) || null;
    const partB = participantBySeed.get(seedB) || null;

    round1[i].teamASeed = seedA <= T ? seedA : null;
    round1[i].teamBSeed = seedB <= T ? seedB : null;

    if (is1v1) {
      round1[i].playerAId = partA?.id || null;
      round1[i].playerBId = partB?.id || null;
    } else {
      round1[i].teamAId = partA?.id || null;
      round1[i].teamBId = partB?.id || null;
    }

    // Check if this match has a BYE
    if (partA && !partB) {
      // Participant A automatically advances via BYE
      round1[i].isBye = true;
      round1[i].status = 'completed';
      if (is1v1) {
        round1[i].winnerPlayerId = partA.id;
      } else {
        round1[i].winnerId = partA.id;
      }

      // Advance to next round immediately
      if (totalRounds > 1) {
        const nextMatchPos = round1[i].nextRoundMatchIndex!;
        const nextMatch = matchesByRound.flat().find(m => m.bracketPosition === nextMatchPos);
        if (nextMatch) {
          if (round1[i].nextMatchSlot === 'team_a') {
            if (is1v1) nextMatch.playerAId = partA.id;
            else nextMatch.teamAId = partA.id;
          } else {
            if (is1v1) nextMatch.playerBId = partA.id;
            else nextMatch.teamBId = partA.id;
          }
        }
      }
    } else if (!partA && partB) {
      // Participant B automatically advances via BYE
      round1[i].isBye = true;
      round1[i].status = 'completed';
      if (is1v1) {
        round1[i].winnerPlayerId = partB.id;
      } else {
        round1[i].winnerId = partB.id;
      }

      if (totalRounds > 1) {
        const nextMatchPos = round1[i].nextRoundMatchIndex!;
        const nextMatch = matchesByRound.flat().find(m => m.bracketPosition === nextMatchPos);
        if (nextMatch) {
          if (round1[i].nextMatchSlot === 'team_a') {
            if (is1v1) nextMatch.playerAId = partB.id;
            else nextMatch.teamAId = partB.id;
          } else {
            if (is1v1) nextMatch.playerBId = partB.id;
            else nextMatch.teamBId = partB.id;
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
 * Validates match map scores and determines series winner.
 * In CS2, maps cannot end in a draw.
 */
export function checkSeriesWinner(
  maps: { scoreA: number; scoreB: number; winnerId?: string | null }[],
  teamAId: string,
  teamBId: string,
  bestOf: number = 1
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
