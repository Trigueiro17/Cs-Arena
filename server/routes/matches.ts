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

  // 3. POST or PATCH /api/matches/:id/map — Update assigned official map
  if (subAction === 'map' && (method === 'POST' || method === 'PATCH')) {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const result = await MatchService.updateMatchMap(matchId, body.mapName);
      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao atualizar mapa da partida' }, 400);
    }
  }

  // 4. GET /api/matches/:id/live — Get live score & state
  if (subAction === 'live' && method === 'GET') {
    try {
      const data = await MatchService.getMatch(matchId);
      if (!data) return jsonResponse({ error: 'Partida não encontrada.' }, 404);
      return jsonResponse({
        matchId,
        status: data.match.status,
        mapName: data.match.map_name,
        liveScoreA: data.match.live_score_a ?? 0,
        liveScoreB: data.match.live_score_b ?? 0,
        livePhase: data.match.live_phase ?? 'scheduled',
        serverIp: data.match.server_ip,
        serverPassword: data.match.server_password,
        playerAName: data.match.player_a_name || data.match.team_a_name,
        playerBName: data.match.player_b_name || data.match.team_b_name,
        playerAAvatar: data.match.player_a_avatar,
        playerBAvatar: data.match.player_b_avatar,
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao buscar dados ao vivo' }, 500);
    }
  }

  // 5. POST /api/matches/:id/live-score — Update live score manually by referee/admin
  if (subAction === 'live-score' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const result = await MatchService.updateLiveScore(matchId, {
        scoreA: body.scoreA,
        scoreB: body.scoreB,
        phase: body.phase,
        serverIp: body.serverIp,
        serverPassword: body.serverPassword,
      });
      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao atualizar placar ao vivo' }, 400);
    }
  }

  // 6. POST /api/matches/:id/server — Update server configuration
  if (subAction === 'server' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json();
      const result = await MatchService.updateServerConfig(matchId, body.serverIp || '', body.serverPassword || '');
      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao configurar servidor' }, 400);
    }
  }

  // 7. GET /api/matches/:id/gsi/cfg or gsi-cfg — Get GSI configuration file
  if ((subAction === 'gsi' && segments[2] === 'cfg') || subAction === 'gsi-cfg') {
    const origin = new URL(req.url).origin;
    const cfg = MatchService.generateGSIConfig(matchId, origin);
    return new Response(cfg, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="gamestate_integration_csarena_${matchId.slice(0, 8)}.cfg"`,
      },
    });
  }

  // 8. POST /api/matches/:id/gsi — GSI / MatchZy webhook receiver
  if (subAction === 'gsi' && method === 'POST') {
    try {
      const body = await req.json();
      const result = await MatchService.handleGSIPayload(matchId, body);
      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao processar GSI' }, 400);
    }
  }

  return jsonResponse({ error: 'Ação não reconhecida.' }, 404);
}
