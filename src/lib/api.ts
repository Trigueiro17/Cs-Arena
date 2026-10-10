// Typed API Client for CS Arena

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('cs_token');
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
  async getTournaments() {
    const res = await fetch('/api/tournaments', { headers: getHeaders() });
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

  async createTournament(data: { name: string; slug: string; description?: string; bestOf?: number; rules?: string }) {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao criar campeonato');
    return result;
  },

  async updateTournament(id: string, data: { name?: string; description?: string; rules?: string; status?: string }) {
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
    maps: { orderNumber: number; mapName: string; scoreA: number; scoreB: number }[]
  ) {
    const res = await fetch(`/api/matches/${matchId}/results`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ maps }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao registrar placar');
    return result;
  },

  // Audit
  async getAuditLogs(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/audit`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Falha ao buscar auditoria');
    return res.json();
  },
};
