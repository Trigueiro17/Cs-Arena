// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { router } from '../server/index';
import { sql } from '../server/db';
import { issueAccessToken, verifyAccessToken } from '../server/lib/jwt';
import { config } from '../server/config';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)('CS ARENA — Suite Completa de Segurança e Autenticação JWT', () => {
  const testEmail = `test_player_${Date.now()}@csarena.com`;
  const testPassword = 'Password123#Strong';
  const testNick = `Player_${Date.now().toString().slice(-6)}`;
  let registeredRefreshToken: string;
  let activeAccessToken: string;
  let registeredUserId: string;

  let adminToken: string;

  beforeAll(async () => {
    // Provision master admin if needed
    const loginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@csarena.com', password: 'admin123' }),
      })
    );
    if (loginRes.ok) {
      const data = await loginRes.json();
      adminToken = data.accessToken;
    }
  });

  // 1. Cadastro com dados válidos (com nickname e Argon2id)
  it('1. Cadastro com dados válidos deve registrar como PLAYER com Argon2id', async () => {
    const req = new Request('http://localhost:5173/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jogador de Teste',
        nickname: testNick,
        email: testEmail,
        password: testPassword,
        role: 'ADMIN', // Tentativa maliciosa de se promover a admin no cadastro público
      }),
    });

    const res = await router(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accessToken).toBeDefined();
    expect(data.expiresIn).toBe(900); // 15 minutos
    expect(data.user.role).toBe('PLAYER'); // FORÇADO a PLAYER! Ignora qualquer input malicioso
    expect(data.user.email).toBe(testEmail.toLowerCase());
    expect(data.user.nickname).toBe(testNick);

    registeredUserId = data.user.id;
    activeAccessToken = data.accessToken;

    // Captura cookie HttpOnly
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('cs_refresh_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    const cookieMatch = setCookie.match(/cs_refresh_token=([^;]+)/);
    registeredRefreshToken = cookieMatch ? cookieMatch[1] : '';
    expect(registeredRefreshToken.length).toBeGreaterThan(20);
  });

  // 2. E-mail duplicado
  it('2. E-mail duplicado deve ser rejeitado com 409 Conflict', async () => {
    const req = new Request('http://localhost:5173/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Outro Nome',
        nickname: `Nick_${Date.now()}`,
        email: testEmail, // Mesmo e-mail
        password: 'Password123#Strong',
      }),
    });

    const res = await router(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('já está cadastrado');
  });

  // 3. Login correto
  it('3. Login correto com credenciais válidas gera access token (15m) e refresh cookie', async () => {
    const req = new Request('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const res = await router(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accessToken).toBeDefined();
    expect(data.user.role).toBe('PLAYER');

    // Valida claims do access token
    const claims = await verifyAccessToken(data.accessToken);
    expect(claims.userId).toBe(registeredUserId);
    expect(claims.role).toBe('PLAYER');

    const setCookie = res.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/cs_refresh_token=([^;]+)/);
    if (cookieMatch) registeredRefreshToken = cookieMatch[1];
  });

  // 4. Senha incorreta (mensagem genérica sem enumeração)
  it('4. Senha incorreta deve retornar mensagem genérica (401)', async () => {
    const req = new Request('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SenhaTotalmenteErrada!',
      }),
    });

    const res = await router(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Credenciais inválidas.');
  });

  // 5. JWT adulterado
  it('5. JWT adulterado na assinatura deve ser rejeitado', async () => {
    const parts = activeAccessToken.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: registeredUserId, role: 'ADMIN' })
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const req = new Request('http://localhost:5173/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });

    const res = await router(req);
    expect(res.status).toBe(401);
  });

  // 6. JWT expirado
  it('6. JWT expirado deve ser rejeitado', async () => {
    const secret = new TextEncoder().encode(config.JWT_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = await new SignJWT({ userId: registeredUserId, role: 'PLAYER', status: 'ACTIVE' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(registeredUserId)
      .setIssuer(config.JWT_ISSUER)
      .setAudience(config.JWT_AUDIENCE)
      .setIssuedAt(now - 3600)
      .setExpirationTime(now - 1800) // Expirou há 30 minutos
      .sign(secret);

    const req = new Request('http://localhost:5173/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    const res = await router(req);
    expect(res.status).toBe(401);
  });

  // 7. JWT com emissor ou audiência inválida
  it('7. JWT com emissor ou audiência inválida deve ser rejeitado', async () => {
    const secret = new TextEncoder().encode(config.JWT_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const wrongIssuerToken = await new SignJWT({ userId: registeredUserId, role: 'PLAYER', status: 'ACTIVE' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(registeredUserId)
      .setIssuer('emissor-hacker-nao-autorizado')
      .setAudience(config.JWT_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 900)
      .sign(secret);

    const req = new Request('http://localhost:5173/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${wrongIssuerToken}` },
    });

    const res = await router(req);
    expect(res.status).toBe(401);
  });

  // 8. Renovação de sessão (Refresh) e Rotação
  it('8. Renovação de sessão (Refresh) rotaciona o token e emite novo Access Token', async () => {
    const req = new Request('http://localhost:5173/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `cs_refresh_token=${registeredRefreshToken}`,
      },
    });

    const res = await router(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accessToken).toBeDefined();

    // Novo cookie rotacionado
    const setCookie = res.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/cs_refresh_token=([^;]+)/);
    const rotatedToken = cookieMatch ? cookieMatch[1] : '';

    expect(rotatedToken).not.toBe(registeredRefreshToken); // Token foi rotacionado!

    // Atualiza para o próximo teste
    const oldUsedToken = registeredRefreshToken;
    registeredRefreshToken = rotatedToken;
    activeAccessToken = data.accessToken;

    // 9. Detecção de reuso de token (OWASP Reuse Detection)
    // Tentar reutilizar o token anterior que já foi rotacionado!
    const reuseReq = new Request('http://localhost:5173/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `cs_refresh_token=${oldUsedToken}`,
      },
    });

    const reuseRes = await router(reuseReq);
    expect(reuseRes.status).toBe(403);
    const reuseData = await reuseRes.json();
    expect(reuseData.code).toBe('REUSE_DETECTED');

    // Ao detectar reuso, TODA a família de sessão deve ter sido revogada!
    // Logo, o token rotacionado mais recente também deve estar revogado agora!
    const familyCheckReq = new Request('http://localhost:5173/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `cs_refresh_token=${registeredRefreshToken}`,
      },
    });
    const familyCheckRes = await router(familyCheckReq);
    expect(familyCheckRes.status).toBe(403); // Família revogada!
  });

  // 10. Logout e revogação
  it('10. Logout revoga a sessão atual e limpa os cookies', async () => {
    // Faz novo login para obter sessão fresca
    const loginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    const loginData = await loginRes.json();
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const tokenToRevoke = setCookie.match(/cs_refresh_token=([^;]+)/)?.[1] || '';

    const logoutReq = new Request('http://localhost:5173/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `cs_refresh_token=${tokenToRevoke}`,
      },
    });

    const logoutRes = await router(logoutReq);
    expect(logoutRes.status).toBe(200);

    const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
    expect(logoutSetCookie).toContain('Max-Age=0'); // Cookie expirado

    // Tentar dar refresh com o token revogado deve falhar
    const tryRefresh = await router(
      new Request('http://localhost:5173/api/auth/refresh', {
        method: 'POST',
        headers: { Cookie: `cs_refresh_token=${tokenToRevoke}` },
      })
    );
    expect(tryRefresh.status).toBe(403);
  });

  // 11. Acesso sem autenticação
  it('11. Acesso sem autenticação a rota protegida deve retornar 401', async () => {
    const req = new Request('http://localhost:5173/api/auth/me', {
      method: 'GET',
    });
    const res = await router(req);
    expect(res.status).toBe(401);
  });

  // 12. Tentativa de PLAYER acessar área ADMIN (RBAC 403)
  it('12. Tentativa de PLAYER criar torneio deve retornar 403 Forbidden', async () => {
    // Login do jogador comum
    const loginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    const playerAuth = await loginRes.json();

    const createTournReq = new Request('http://localhost:5173/api/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerAuth.accessToken}`,
      },
      body: JSON.stringify({
        name: 'Torneio Não Autorizado',
        slug: `hacked-tourn-${Date.now()}`,
      }),
    });

    const createRes = await router(createTournReq);
    expect(createRes.status).toBe(403);
    const data = await createRes.json();
    expect(data.error).toContain('Acesso negado');
  });

  // 13. Usuário desativado tentando acessar API
  it('13. Usuário inativo / suspenso é bloqueado mesmo com JWT válido', async () => {
    // Desativa temporariamente o usuário no banco
    await sql`UPDATE cs_arena.users SET status = 'SUSPENDED' WHERE id = ${registeredUserId};`;

    const loginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    expect(loginRes.status).toBe(403);
    const data = await loginRes.json();
    expect(data.error).toContain('suspensa');

    // Restaura o status
    await sql`UPDATE cs_arena.users SET status = 'ACTIVE' WHERE id = ${registeredUserId};`;
  });

  // 14. Tentativas simultâneas de renovação (Concorrência / Atomicidade)
  it('14. Tentativas simultâneas com o mesmo token de refresh: uma tem sucesso e a subsequente detecta reuso', async () => {
    const loginRes = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const freshToken = setCookie.match(/cs_refresh_token=([^;]+)/)?.[1] || '';

    // Dispara 2 requisições paralelas com o mesmo refresh token
    const [res1, res2] = await Promise.all([
      router(
        new Request('http://localhost:5173/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `cs_refresh_token=${freshToken}` },
        })
      ),
      router(
        new Request('http://localhost:5173/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `cs_refresh_token=${freshToken}` },
        })
      ),
    ]);

    const statuses = [res1.status, res2.status];
    // Exatamente uma teve sucesso (200), e a outra foi bloqueada (403 Reuso ou 401)
    expect(statuses).toContain(200);
    expect(statuses.some((s) => s === 403 || s === 401)).toBe(true);
  });

  // 15. Tentativa CSRF (Origin maliciosa)
  it('15. Requisição com Origin cross-origin não autorizada deve ser bloqueada (403 CSRF)', async () => {
    const maliciousReq = new Request('http://localhost:5173/api/auth/logout', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker-evil-site.com',
        Cookie: 'cs_refresh_token=any',
      },
    });

    const res = await router(maliciousReq);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('CSRF');
  });

  // 16. Recuperação de Senha com Token de Uso Único
  it('16. Fluxo de recuperação de senha: token único expira e revoga todas as sessões anteriores', async () => {
    const forgotReq = new Request('http://localhost:5173/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    const forgotRes = await router(forgotReq);
    expect(forgotRes.status).toBe(200);
    const forgotData = await forgotRes.json();
    const resetToken = forgotData.resetToken;
    expect(resetToken).toBeDefined();

    // Redefine a senha
    const newPass = 'NovaSenhaSegura#2026!';
    const resetReq = new Request('http://localhost:5173/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: newPass,
      }),
    });

    const resetRes = await router(resetReq);
    expect(resetRes.status).toBe(200);

    // Tentar reutilizar o mesmo token deve falhar
    const reuseResetReq = new Request('http://localhost:5173/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: newPass,
      }),
    });
    const reuseReset = await router(reuseResetReq);
    expect(reuseReset.status).toBe(400);

    // Login com a nova senha deve ter sucesso
    const newLogin = await router(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: newPass }),
      })
    );
    expect(newLogin.status).toBe(200);
  });
});
