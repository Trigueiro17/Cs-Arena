// Typed API Client for CS Arena
import { getAccessToken } from './token-store';
import { GameMode } from './tournament-engine';

function getHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Tournaments
  async getTournaments(params?: { gameMode?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.gameMode) query.set('gameMode', params.gameMode);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`/api/tournaments${qs}`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao buscar campeonatos');
    }
    return res.json();
  },

  async getTournament(id: string) {
    const res = await fetch(`/api/tournaments/${id}`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao buscar campeonato');
    }
    return res.json();
  },

  async createTournament(data: {
    name: string;
    slug: string;
    description?: string;
    gameMode?: GameMode;
    teamSize?: number;
    bestOf?: number;
    thirdPlaceEnabled?: boolean;
    mapSelection?: string;
    rules?: string;
  }) {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao criar campeonato');
    return result;
  },

  async updateTournament(
    id: string,
    data: { name?: string; description?: string; rules?: string; status?: string }
  ) {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao atualizar campeonato');
    return result;
  },

  // Registrations
  async registerPlayer(
    tournamentId: string,
    data: { nickname: string; steamId?: string; preferredRole?: string; avatarUrl?: string }
  ) {
    const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha na inscrição');
    return result;
  },

  async cancelRegistration(tournamentId: string, playerId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/cancel-registration`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ playerId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao cancelar inscrição');
    return result;
  },

  async getRegistrations(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/registrations`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar inscrições');
    return res.json();
  },

  async closeRegistration(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/close-registration`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao encerrar inscrições');
    return result;
  },

  // Teams & Draws
  async getTeams(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/teams`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar equipes');
    return res.json();
  },

  async drawTeams(
    tournamentId: string,
    options?: { algorithm?: 'random' | 'balanced' | 'captains'; idempotencyKey?: string; forceReset?: boolean }
  ) {
    const res = await fetch(`/api/tournaments/${tournamentId}/draw-teams`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(options || {}),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha no sorteio de equipes');
    return result;
  },

  async drawBracket(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/draw-bracket`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao gerar chaveamento');
    return result;
  },

  // Bracket & Matches
  async getBracket(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar chaveamento');
    return res.json();
  },

  async getMatch(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar detalhes da partida');
    return res.json();
  },

  async submitMatchResult(
    matchId: string,
    maps: { orderNumber: number; mapName: string; scoreA: number; scoreB: number }[],
    evidenceUrl?: string
  ) {
    const res = await fetch(`/api/matches/${matchId}/results`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ maps, evidenceUrl }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao registrar placar');
    return result;
  },

  async updateMatchMap(matchId: string, mapName: string) {
    const res = await fetch(`/api/matches/${matchId}/map`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ mapName }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao atualizar mapa da partida');
    return result;
  },

  async getLiveMatch(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}/live`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao obter status ao vivo da partida');
    return res.json();
  },

  async updateLiveScore(
    matchId: string,
    payload: {
      scoreA?: number;
      scoreB?: number;
      phase?: string;
      serverIp?: string;
      serverPassword?: string;
    }
  ) {
    const res = await fetch(`/api/matches/${matchId}/live-score`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao atualizar placar ao vivo');
    return result;
  },

  async updateMatchServer(matchId: string, serverIp: string, serverPassword?: string) {
    const res = await fetch(`/api/matches/${matchId}/server`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ serverIp, serverPassword }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao salvar servidor da partida');
    return result;
  },

  async getRanking(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/ranking`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar classificação do torneio');
    return res.json();
  },

  // Audit
  async getAuditLogs(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/audit`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar auditoria');
    return res.json();
  },

  // Steam Auth & Stats
  async getSteamLoginUrl(): Promise<{ url: string }> {
    const res = await fetch('/api/auth/steam?format=json');
    if (!res.ok) throw new Error('Falha ao obter URL de login da Steam');
    return res.json();
  },

  async syncSteamProfile(): Promise<{ success: boolean; player: any }> {
    const res = await fetch('/api/auth/steam/sync', {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao sincronizar perfil Steam');
    return result;
  },
};
