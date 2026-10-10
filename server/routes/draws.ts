import { jsonResponse, requireAdmin } from '../utils';
import { DrawService, BracketService } from '../services';

export async function handleDraws(req: Request, tournamentId: string, action: string): Promise<Response> {
  const method = req.method;

  // 1. Sorteio de Equipes ou Duelistas (com roleta)
  if (action === 'draw-teams' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const body = await req.json().catch(() => ({}));
      const result = await DrawService.executeDraw(
        tournamentId,
        {
          algorithm: body.algorithm || 'random',
          idempotencyKey: body.idempotencyKey,
          forceReset: body.forceReset,
        },
        {
          userId: authCheck.user.userId,
          name: authCheck.user.name,
        }
      );

      return jsonResponse(result);
    } catch (err: any) {
      const status = err.message?.includes('já foi executado') ? 409 : 400;
      return jsonResponse({ error: err.message || 'Erro ao executar sorteio das equipes' }, status);
    }
  }

  // 2. Sorteio de Chaveamento e Confrontos (Mata-mata com BYEs)
  if (action === 'draw-bracket' && method === 'POST') {
    const authCheck = await requireAdmin(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const result = await BracketService.generateBracket(tournamentId, {
        userId: authCheck.user.userId,
        name: authCheck.user.name,
      });

      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao gerar chaveamento' }, 400);
    }
  }

  return jsonResponse({ error: 'Ação de sorteio desconhecida.' }, 404);
}
