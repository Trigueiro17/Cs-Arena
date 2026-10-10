import { z } from 'zod';
import { sql } from '../db';
import { hashPassword, verifyPassword, generateOpaqueToken, hashToken } from '../lib/crypto';
import { issueTokens, requireAuth, jsonResponse } from '../utils';
import { rotateRefreshToken, revokeSession, revokeAllUserSessions, getUserSessions, SessionError } from '../lib/session';
import { serializeRefreshTokenCookie, clearRefreshTokenCookie, extractRefreshTokenFromRequest } from '../lib/cookies';
import { checkRateLimit } from '../lib/rate-limit';
import { validateCsrf } from '../lib/csrf';
import { logAuthAudit } from '../lib/audit';
import { SteamService } from '../services/steam.service';

// Validation Schemas (Zod)
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  nickname: z
    .string()
    .trim()
    .min(2, 'Nickname deve ter no mínimo 2 caracteres')
    .max(32, 'Nickname deve ter no máximo 32 caracteres')
    .regex(/^[a-zA-Z0-9_\-.]+$/, 'Nickname deve conter apenas letras, números, pontos, hífens ou underlines')
    .optional(),
  email: z.string().trim().email('E-mail em formato inválido').max(255),
  password: z
    .string()
    .min(6, 'A senha deve conter no mínimo 6 caracteres')
    .max(128, 'Senha muito longa'),
});

const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const resetRequestSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
});

const resetConfirmSchema = z.object({
  token: z.string().min(1, 'Token de recuperação é obrigatório'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'Unknown';
}

export async function handleAuth(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/auth\/?/, '').replace(/\/+$/, '').split('?')[0];
  const method = req.method;
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // CSRF validation on mutation endpoints
  if (!validateCsrf(req)) {
    return jsonResponse({ error: 'Falha na validação CSRF. Origem não autorizada.' }, 403);
  }

  // 1. POST /api/auth/register — Cadastro público exclusivo como PLAYER
  if (method === 'POST' && path === 'register') {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    if (!isTest) {
      // Rate limit registration: max 5 requests per 5 minutes per IP
      const rateCheck = await checkRateLimit(`reg:${ip}`, 5, 300);
      if (!rateCheck.allowed) {
        return jsonResponse(
          { error: 'Muitas tentativas de cadastro a partir deste endereço. Tente novamente mais tarde.' },
          429
        );
      }
    }

    try {
      const body = await req.json();
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: parsed.error.issues[0]?.message || 'Dados de cadastro inválidos.' },
          400
        );
      }

      const { name, nickname, email, password } = parsed.data;

      // Ensure a valid nickname
      let finalNick = nickname?.trim();
      if (!finalNick) {
        const base = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
        finalNick = base ? `${base}_${Math.floor(100 + Math.random() * 900)}` : `player_${Date.now().toString().slice(-6)}`;
      }

      // Check unique email
      const existingEmail = await sql`
        SELECT id FROM cs_arena.users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;
      `;
      if (existingEmail.length > 0) {
        return jsonResponse({ error: 'Este e-mail já está cadastrado no sistema.' }, 409);
      }

      // Check unique nickname
      const existingNick = await sql`
        SELECT id FROM cs_arena.players WHERE LOWER(nickname) = LOWER(${finalNick}) LIMIT 1;
      `;
      if (existingNick.length > 0) {
        return jsonResponse({ error: 'Este nickname já está em uso por outro jogador.' }, 409);
      }

      // Argon2id password hash
      const passwordHash = await hashPassword(password);

      // Create User — Public registration is strictly forced to PLAYER role!
      const [newUser] = await sql`
        INSERT INTO cs_arena.users (name, nickname, email, password_hash, role, status)
        VALUES (${name}, ${finalNick}, ${email.toLowerCase()}, ${passwordHash}, 'PLAYER', 'ACTIVE')
        RETURNING id, name, nickname, email, role, status;
      `;

      // Create linked Player profile
      await sql`
        INSERT INTO cs_arena.players (nickname, preferred_role, skill_rating)
        VALUES (${nickname}, 'Flex', 1000)
        ON CONFLICT (nickname) DO NOTHING;
      `;

      // Issue Access Token & Refresh Session
      const { accessToken, expiresIn, cookieHeader, user } = await issueTokens({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        nickname: newUser.nickname,
        role: newUser.role,
        status: newUser.status,
      });

      await logAuthAudit('REGISTER_SUCCESS', newUser.id, ip, ua);

      return jsonResponse(
        {
          success: true,
          accessToken,
          token: accessToken,
          expiresIn,
          user,
        },
        201,
        { 'Set-Cookie': cookieHeader }
      );
    } catch (err: any) {
      console.error('[AUTH REGISTER ERROR]', err);
      return jsonResponse({ error: err.message || 'Erro ao registrar usuário' }, 500);
    }
  }

  // 2. POST /api/auth/login — Login seguro com Argon2id e Rate Limiting
  if (method === 'POST' && path === 'login') {
    try {
      const body = await req.json();
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || 'Dados inválidos' }, 400);
      }

      const { email, password } = parsed.data;

      const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
      if (!isTest) {
        // Rate limit per IP (max 10 / min) and per Email (max 5 / min)
        const ipCheck = await checkRateLimit(`login_ip:${ip}`, 10, 60);
        const emailCheck = await checkRateLimit(`login_email:${email.toLowerCase()}`, 5, 60);

        if (!ipCheck.allowed || !emailCheck.allowed) {
          await logAuthAudit('LOGIN_RATE_LIMITED', null, ip, ua);
          return jsonResponse(
            { error: 'Muitas tentativas de login com falha. Aguarde 1 minuto e tente novamente.' },
            429
          );
        }
      }

      const users = await sql`
        SELECT id, name, nickname, email, password_hash, role, status
        FROM cs_arena.users
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1;
      `;

      // Generic error message prevents account enumeration
      if (users.length === 0) {
        await logAuthAudit('LOGIN_FAILED_NOT_FOUND', null, ip, ua);
        return jsonResponse({ error: 'Credenciais inválidas.' }, 401);
      }

      const user = users[0];

      // Verify Argon2id (with bcrypt fallback)
      const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
      if (!valid) {
        await logAuthAudit('LOGIN_FAILED_WRONG_PASSWORD', user.id, ip, ua);
        return jsonResponse({ error: 'Credenciais inválidas.' }, 401);
      }

      // Check account status
      if (user.status !== 'ACTIVE') {
        await logAuthAudit('LOGIN_BLOCKED_INACTIVE', user.id, ip, ua);
        return jsonResponse({ error: 'Sua conta está desativada ou suspensa. Contate o suporte.' }, 403);
      }

      // Auto-upgrade legacy bcrypt hash to Argon2id in background
      if (needsRehash) {
        const newHash = await hashPassword(password);
        await sql`UPDATE cs_arena.users SET password_hash = ${newHash} WHERE id = ${user.id};`;
      }

      // Issue tokens
      const { accessToken, expiresIn, cookieHeader, user: userPayload } = await issueTokens({
        userId: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
        status: user.status,
      });

      await logAuthAudit('LOGIN_SUCCESS', user.id, ip, ua);

      return jsonResponse(
        {
          success: true,
          accessToken,
          token: accessToken,
          expiresIn,
          user: userPayload,
        },
        200,
        { 'Set-Cookie': cookieHeader }
      );
    } catch (err: any) {
      console.error('[AUTH LOGIN ERROR]', err);
      return jsonResponse({ error: err.message || 'Erro durante o login' }, 500);
    }
  }

  // 3. POST /api/auth/refresh — Rotação atômica de refresh token com detecção de reuso
  if (method === 'POST' && path === 'refresh') {
    try {
      let rawRefreshToken = extractRefreshTokenFromRequest(req);

      // Support fallback from JSON body for direct test suites / CLI callers
      if (!rawRefreshToken) {
        try {
          const body = await req.json().catch(() => ({}));
          rawRefreshToken = body?.refreshToken || null;
        } catch {}
      }

      if (!rawRefreshToken) {
        return jsonResponse({ error: 'Token de renovação não fornecido.' }, 401);
      }

      // Atomic rotation with family reuse detection
      const { newRefreshToken, user } = await rotateRefreshToken(rawRefreshToken, ip, ua);

      // Issue new short-lived Access Token (15m)
      const { issueAccessToken } = await import('../lib/jwt');
      const { token: accessToken, expiresIn } = await issueAccessToken(user);

      const cookieHeader = serializeRefreshTokenCookie(newRefreshToken);

      return jsonResponse(
        {
          success: true,
          accessToken,
          token: accessToken,
          expiresIn,
          refreshToken: newRefreshToken, // also provided in JSON for programmatic clients
          user,
        },
        200,
        { 'Set-Cookie': cookieHeader }
      );
    } catch (err: any) {
      if (err instanceof SessionError) {
        const clearCookie = clearRefreshTokenCookie();
        const statusCode = err.code === 'REUSE_DETECTED' || err.code === 'INACTIVE_USER' ? 403 : 401;
        return jsonResponse({ error: err.message, code: err.code }, statusCode, {
          'Set-Cookie': clearCookie,
        });
      }
      return jsonResponse({ error: 'Erro ao renovar sessão.' }, 500);
    }
  }

  // 4. POST /api/auth/logout — Revogação de sessão individual
  if (method === 'POST' && path === 'logout') {
    const rawRefreshToken = extractRefreshTokenFromRequest(req);
    if (rawRefreshToken) {
      await revokeSession(rawRefreshToken, ip, ua);
    }
    const clearCookie = clearRefreshTokenCookie();
    return jsonResponse({ success: true, message: 'Sessão encerrada com sucesso.' }, 200, {
      'Set-Cookie': clearCookie,
    });
  }

  // 5. POST /api/auth/logout-all — Revogação de todas as sessões do usuário
  if (method === 'POST' && path === 'logout-all') {
    const authCheck = await requireAuth(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    await revokeAllUserSessions(authCheck.user.userId, ip, ua);
    const clearCookie = clearRefreshTokenCookie();
    return jsonResponse(
      { success: true, message: 'Todas as sessões ativas foram revogadas com sucesso.' },
      200,
      { 'Set-Cookie': clearCookie }
    );
  }

  // 6. GET /api/auth/me — Recuperação de dados do usuário autenticado
  if (method === 'GET' && path === 'me') {
    const authCheck = await requireAuth(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    return jsonResponse({ user: authCheck.user }, 200);
  }

  // 7. GET /api/auth/sessions — Listagem de sessões ativas do usuário
  if (method === 'GET' && path === 'sessions') {
    const authCheck = await requireAuth(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    const currentRefreshToken = extractRefreshTokenFromRequest(req) || undefined;
    const sessions = await getUserSessions(authCheck.user.userId, currentRefreshToken);

    return jsonResponse({ sessions }, 200);
  }

  // 8. POST /api/auth/forgot-password — Recuperação de senha com token de uso único
  if (method === 'POST' && path === 'forgot-password') {
    try {
      const body = await req.json();
      const parsed = resetRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: 'E-mail inválido.' }, 400);
      }

      const email = parsed.data.email.toLowerCase();
      const [user] = await sql`
        SELECT id FROM cs_arena.users WHERE LOWER(email) = LOWER(${email}) AND status = 'ACTIVE' LIMIT 1;
      `;

      let resetToken: string | undefined = undefined;

      if (user) {
        // Generate single-use token with 15 min expiry
        resetToken = generateOpaqueToken(32);
        const tokenHash = hashToken(resetToken);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await sql`
          INSERT INTO cs_arena.password_reset_tokens (user_id, token_hash, expires_at)
          VALUES (${user.id}, ${tokenHash}, ${expiresAt});
        `;

        await logAuthAudit('PASSWORD_RESET_REQUESTED', user.id, ip, ua);
      }

      // Generic response avoids email enumeration
      return jsonResponse({
        success: true,
        message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.',
        // Expose resetToken in non-production for automated testing / demonstration
        resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao processar solicitação' }, 500);
    }
  }

  // 9. POST /api/auth/reset-password — Conclusão de redefinição de senha
  if (method === 'POST' && path === 'reset-password') {
    try {
      const body = await req.json();
      const parsed = resetConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || 'Dados inválidos' }, 400);
      }

      const { token, newPassword } = parsed.data;
      const tokenHash = hashToken(token);

      const [resetRecord] = await sql`
        SELECT id, user_id, expires_at, used_at
        FROM cs_arena.password_reset_tokens
        WHERE token_hash = ${tokenHash}
        LIMIT 1;
      `;

      if (!resetRecord || resetRecord.used_at !== null || new Date(resetRecord.expires_at) < new Date()) {
        return jsonResponse(
          { error: 'Token de recuperação inválido, já utilizado ou expirado.' },
          400
        );
      }

      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await sql`
        UPDATE cs_arena.users
        SET password_hash = ${newPasswordHash}, updated_at = NOW()
        WHERE id = ${resetRecord.user_id};
      `;

      // Mark token as used
      await sql`
        UPDATE cs_arena.password_reset_tokens
        SET used_at = NOW()
        WHERE id = ${resetRecord.id};
      `;

      // Revoke all existing sessions for security
      await revokeAllUserSessions(resetRecord.user_id, ip, ua);
      await logAuthAudit('PASSWORD_RESET_SUCCESS', resetRecord.user_id, ip, ua);

      return jsonResponse({
        success: true,
        message: 'Senha redefinida com sucesso. Faça login com suas novas credenciais.',
      });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao redefinir senha' }, 500);
    }
  }

  // 10. GET /api/auth/steam — Redireciona para login OpenID da Steam
  if (method === 'GET' && path === 'steam') {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const origin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : (process.env.APP_URL || url.origin || 'http://localhost:5173');
    const redirectUrl = SteamService.buildLoginUrl(origin, '/api/auth/steam/return');

    if (url.searchParams.get('format') === 'json' || req.headers.get('accept')?.includes('application/json')) {
      return jsonResponse({ url: redirectUrl });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  }

  // 11. GET /api/auth/steam/return — Callback OpenID da Steam
  if (method === 'GET' && path === 'steam/return') {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const origin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : (process.env.APP_URL || url.origin || 'http://localhost:5173');
    const validation = await SteamService.validateOpenIdResponse(url.searchParams);

    if (!validation.valid || !validation.steamId64) {
      const errorMsg = encodeURIComponent(validation.error || 'Falha na autenticação com a Steam.');
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${origin}/login?error=${errorMsg}`,
        },
      });
    }

    try {
      const { user, player } = await SteamService.syncSteamUserAndPlayer(validation.steamId64);

      const { accessToken, cookieHeader } = await issueTokens({
        userId: user.id,
        email: user.email,
        name: user.name,
        nickname: player.nickname || user.nickname,
        role: user.role,
        status: user.status,
      });

      await logAuthAudit('STEAM_LOGIN_SUCCESS', user.id, ip, ua);

      const headers = new Headers();
      headers.set(
        'Location',
        `${origin}/auth/callback?token=${accessToken}&steamId=${player.steam_id || validation.steamId64}&skillRating=${player.skill_rating}&steamLevel=${player.steam_level || 0}`
      );
      if (cookieHeader) {
        headers.set('Set-Cookie', cookieHeader);
      }

      return new Response(null, {
        status: 302,
        headers,
      });
    } catch (err: any) {
      console.error('[STEAM AUTH RETURN ERROR]:', err);
      const errorMsg = encodeURIComponent(err.message || 'Erro ao sincronizar dados da Steam.');
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${origin}/login?error=${errorMsg}`,
        },
      });
    }
  }

  // 12. POST /api/auth/steam/sync — Re-sincronizar nível e estatísticas da Steam
  if (method === 'POST' && path === 'steam/sync') {
    const authCheck = await requireAuth(req);
    if ('errorResponse' in authCheck) return authCheck.errorResponse;

    try {
      const [user] = await sql`
        SELECT id, steam_id FROM cs_arena.users WHERE id = ${authCheck.user.userId} LIMIT 1;
      `;

      const steamId = user?.steam_id;
      if (!steamId) {
        return jsonResponse({ error: 'Nenhuma conta Steam vinculada a este usuário.' }, 400);
      }

      const { player } = await SteamService.syncSteamUserAndPlayer(steamId, user.id);
      return jsonResponse({ success: true, player });
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao sincronizar perfil Steam' }, 500);
    }
  }

  return jsonResponse({ error: `Rota de autenticação '/api/auth/${path}' não encontrada.` }, 404);
}
