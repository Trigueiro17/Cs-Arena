import {
  formTeams,
  PlayerData,
  TeamDraftResult,
  GameMode,
  getTeamSize,
} from '../../src/lib/tournament-engine';

export class TeamFormationService {
  static form(
    players: PlayerData[],
    algorithm: 'random' | 'balanced' | 'captains' = 'random',
    teamSize: number = 5,
    gameMode?: GameMode
  ): TeamDraftResult {
    const effectiveTeamSize = teamSize || (gameMode ? getTeamSize(gameMode) : 5);
    return formTeams(players, algorithm, effectiveTeamSize, gameMode);
  }
}
