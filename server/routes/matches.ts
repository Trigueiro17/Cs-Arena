import { jsonResponse, requireAdmin } from '../utils';
import { MatchService } from '../services';

export async function handleMatches(req: Request, segments: string[]): Promise<Response> {
  const method = req.method;
  const matchId = segments[0] || null;
  const subAction = segments[1] || null;

  if (!matchId) {
    return jsonResponse({ error: 'ID da partida é obrigatório.' }, 400);
  }

  // 1. GET /api/matches/:id
  if (!subAction && method === 'GET') {
    try {
      const data = await MatchService.getMatch(matchId);
      if (!data) return jsonResponse({ error: 'Partida não encontrada.' }, 404);
      return jsonResponse(data);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao buscar dados da partida' }, 500);
    }
  }

  // 2. POST /api/matches/:id/results (or /result) — Update map scores & calculate series
  if ((subAction === 'results' || subAction === 'result') && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const maps =
        Array.isArray(body.maps) && body.maps.length > 0
          ? body.maps
          : [
              {
                orderNumber: 1,
                mapName: body.mapName || 'de_dust2',
                scoreA: Number(body.scoreA ?? 0),
                scoreB: Number(body.scoreB ?? 0),
              },
            ];

      const result = await MatchService.submitMatchResult(
        matchId,
        {
          maps,
          evidenceUrl: body.evidenceUrl,
        },
        {
          userId: authCheck.user.userId,
          name: authCheck.user.name,
        }
      );

      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao registrar resultado da partida' }, 400);
    }
  }

  return jsonResponse({ error: 'Ação não reconhecida.' }, 404);
}
