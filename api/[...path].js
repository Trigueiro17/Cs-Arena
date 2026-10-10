var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/config.ts
import { z } from "zod";
import * as dotenv from "dotenv";
function loadConfig() {
  const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  const raw = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: jwtSecret,
    JWT_ISSUER: process.env.JWT_ISSUER || "cs-arena",
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || "cs-arena-web",
    APP_URL: process.env.APP_URL || "http://localhost:5173",
    NODE_ENV: process.env.NODE_ENV || "development"
  };
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.warn(`[CONFIG WARNING] Vari\xE1veis de ambiente incompletas:
${errorDetails}`);
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Configura\xE7\xE3o inv\xE1lida:
${errorDetails}`);
    }
    return {
      DATABASE_URL: process.env.DATABASE_URL || "",
      JWT_SECRET: jwtSecret || "cs-arena-default-fallback-secret-at-least-32-chars-long!",
      JWT_ISSUER: "cs-arena",
      JWT_AUDIENCE: "cs-arena-web",
      APP_URL: process.env.APP_URL || "http://localhost:5173",
      NODE_ENV: process.env.NODE_ENV || "development"
    };
  }
  return parsed.data;
}
var envSchema, config2;
var init_config = __esm({
  "server/config.ts"() {
    "use strict";
    dotenv.config();
    envSchema = z.object({
      DATABASE_URL: z.string().min(1, "DATABASE_URL \xE9 obrigat\xF3ria"),
      JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no m\xEDnimo 32 caracteres (256 bits de entropia)"),
      JWT_ISSUER: z.string().default("cs-arena"),
      JWT_AUDIENCE: z.string().default("cs-arena-web"),
      APP_URL: z.string().default("http://localhost:5173"),
      NODE_ENV: z.enum(["development", "production", "test"]).default("development")
    });
    config2 = loadConfig();
  }
});

// server/lib/jwt.ts
var jwt_exports = {};
__export(jwt_exports, {
  issueAccessToken: () => issueAccessToken,
  verifyAccessToken: () => verifyAccessToken
});
import { SignJWT, jwtVerify } from "jose";
import crypto2 from "crypto";
function getSecretKey() {
  if (!cachedSecretKey) {
    cachedSecretKey = crypto2.createSecretKey(Buffer.from(config2.JWT_SECRET, "utf-8"));
  }
  return cachedSecretKey;
}
async function issueAccessToken(user) {
  const secret = getSecretKey();
  const jti = crypto2.randomUUID();
  const now = Math.floor(Date.now() / 1e3);
  const expiresIn = 15 * 60;
  const exp = now + expiresIn;
  const token = await new SignJWT({
    userId: user.userId,
    email: user.email,
    name: user.name,
    nickname: user.nickname || null,
    role: user.role,
    status: user.status
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(user.userId).setIssuer(config2.JWT_ISSUER).setAudience(config2.JWT_AUDIENCE).setIssuedAt(now).setNotBefore(now).setExpirationTime(exp).setJti(jti).sign(secret);
  return { token, expiresIn };
}
async function verifyAccessToken(token) {
  const secret = getSecretKey();
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: config2.JWT_ISSUER,
    audience: config2.JWT_AUDIENCE,
    clockTolerance: 10
    // 10 seconds tolerance for slight server clock skews
  });
  return {
    userId: payload.sub || payload.userId,
    email: payload.email,
    name: payload.name,
    nickname: payload.nickname,
    role: payload.role || "PLAYER",
    status: payload.status || "ACTIVE"
  };
}
var cachedSecretKey;
var init_jwt = __esm({
  "server/lib/jwt.ts"() {
    "use strict";
    init_config();
    cachedSecretKey = null;
  }
});

// server/routes/auth.ts
import { z as z2 } from "zod";

// server/db.ts
import { neon } from "@neondatabase/serverless";
var cachedClient = null;
var sql = (strings, ...values) => {
  const connString = process.env.DATABASE_URL;
  if (!connString) {
    throw new Error("DATABASE_URL is not set in environment.");
  }
  if (!cachedClient) {
    cachedClient = neon(connString);
  }
  return cachedClient(strings, ...values);
};

// server/lib/crypto.ts
import crypto from "crypto";
import * as argon2 from "@node-rs/argon2";
import bcrypt from "bcryptjs";
async function hashPassword(password) {
  return argon2.hash(password, {
    algorithm: 2,
    // 2 = Argon2id
    memoryCost: 19456,
    // 19 MiB
    timeCost: 2,
    parallelism: 1
  });
}
async function verifyPassword(password, hash2) {
  if (!hash2)
    return { valid: false, needsRehash: false };
  if (hash2.startsWith("$argon2id$") || hash2.startsWith("$argon2i$") || hash2.startsWith("$argon2d$")) {
    try {
      const valid = await argon2.verify(hash2, password);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  if (hash2.startsWith("$2")) {
    try {
      const valid = await bcrypt.compare(password, hash2);
      return { valid, needsRehash: valid };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  return { valid: false, needsRehash: false };
}
function generateOpaqueToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("hex");
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf-8").digest("hex");
}

// server/utils.ts
init_jwt();

// server/lib/session.ts
import crypto3 from "crypto";

// server/lib/audit.ts
async function logAuthAudit(action, userId, ipAddress, userAgent) {
  try {
    await sql`
      INSERT INTO cs_arena.auth_audit_logs (user_id, action, ip_address, user_agent)
      VALUES (${userId || null}, ${action}, ${ipAddress || null}, ${userAgent || null});
    `;
  } catch (err) {
    console.error(`[AUDIT ERROR] Falha ao registrar log de auditoria (${action}):`, err);
  }
}

// server/lib/session.ts
var REFRESH_TOKEN_TTL_DAYS = 7;
var SessionError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "SessionError";
  }
};
async function createSession(userId, familyId) {
  const refreshToken = generateOpaqueToken(32);
  const tokenHash = hashToken(refreshToken);
  const famId = familyId || crypto3.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1e3);
  const [session] = await sql`
    INSERT INTO cs_arena.auth_sessions (
      user_id, family_id, refresh_token_hash, expires_at
    )
    VALUES (
      ${userId}, ${famId}, ${tokenHash}, ${expiresAt}
    )
    RETURNING id, family_id, expires_at;
  `;
  return {
    refreshToken,
    sessionId: session.id,
    familyId: session.family_id,
    expiresAt: session.expires_at
  };
}
async function rotateRefreshToken(rawRefreshToken, ipAddress, userAgent) {
  const tokenHash = hashToken(rawRefreshToken);
  const sessions = await sql`
    SELECT s.id, s.user_id, s.family_id, s.expires_at, s.revoked_at, s.rotated_at,
           u.id as u_id, u.name, u.nickname, u.email, u.role, u.status
    FROM cs_arena.auth_sessions s
    JOIN cs_arena.users u ON s.user_id = u.id
    WHERE s.refresh_token_hash = ${tokenHash}
    LIMIT 1;
  `;
  if (sessions.length === 0) {
    throw new SessionError("Sess\xE3o n\xE3o encontrada.", "NOT_FOUND");
  }
  const session = sessions[0];
  if (session.revoked_at !== null || session.rotated_at !== null) {
    await sql`
      UPDATE cs_arena.auth_sessions
      SET revoked_at = NOW()
      WHERE family_id = ${session.family_id} AND revoked_at IS NULL;
    `;
    await logAuthAudit("SECURITY_REFRESH_TOKEN_REUSE_DETECTED", session.user_id, ipAddress, userAgent);
    throw new SessionError(
      "Tentativa de reutiliza\xE7\xE3o de sess\xE3o detectada. Por seguran\xE7a, todas as sess\xF5es foram revogadas.",
      "REUSE_DETECTED"
    );
  }
  const now = /* @__PURE__ */ new Date();
  if (new Date(session.expires_at) < now) {
    await sql`
      UPDATE cs_arena.auth_sessions
      SET revoked_at = NOW()
      WHERE id = ${session.id};
    `;
    throw new SessionError("Sess\xE3o expirada. Fa\xE7a login novamente.", "EXPIRED");
  }
  if (session.status !== "ACTIVE") {
    await sql`
      UPDATE cs_arena.auth_sessions
      SET revoked_at = NOW()
      WHERE user_id = ${session.user_id};
    `;
    throw new SessionError("Conta desativada ou suspensa.", "INACTIVE_USER");
  }
  const newRefreshToken = generateOpaqueToken(32);
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1e3);
  await sql`
    UPDATE cs_arena.auth_sessions
    SET rotated_at = NOW(), last_used_at = NOW()
    WHERE id = ${session.id};
  `;
  await sql`
    INSERT INTO cs_arena.auth_sessions (
      user_id, family_id, refresh_token_hash, expires_at
    )
    VALUES (
      ${session.user_id}, ${session.family_id}, ${newTokenHash}, ${newExpiresAt}
    );
  `;
  await logAuthAudit("SESSION_ROTATED", session.user_id, ipAddress, userAgent);
  return {
    newRefreshToken,
    user: {
      id: session.u_id,
      userId: session.u_id,
      email: session.email,
      name: session.name,
      nickname: session.nickname,
      role: session.role,
      status: session.status
    }
  };
}
async function revokeSession(rawRefreshToken, ipAddress, userAgent) {
  const tokenHash = hashToken(rawRefreshToken);
  const [session] = await sql`
    UPDATE cs_arena.auth_sessions
    SET revoked_at = NOW()
    WHERE refresh_token_hash = ${tokenHash} AND revoked_at IS NULL
    RETURNING user_id;
  `;
  if (session) {
    await logAuthAudit("LOGOUT_SUCCESS", session.user_id, ipAddress, userAgent);
  }
}
async function revokeAllUserSessions(userId, ipAddress, userAgent) {
  await sql`
    UPDATE cs_arena.auth_sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked_at IS NULL;
  `;
  await logAuthAudit("LOGOUT_ALL_DEVICES", userId, ipAddress, userAgent);
}
async function getUserSessions(userId, currentRefreshToken) {
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
  const rows = await sql`
    SELECT id, family_id, expires_at, created_at, last_used_at, refresh_token_hash
    FROM cs_arena.auth_sessions
    WHERE user_id = ${userId} AND revoked_at IS NULL AND rotated_at IS NULL AND expires_at > NOW()
    ORDER BY last_used_at DESC;
  `;
  return rows.map((r) => ({
    id: r.id,
    familyId: r.family_id,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    expiresAt: r.expires_at,
    isCurrent: currentHash ? r.refresh_token_hash === currentHash : false
  }));
}

// server/lib/cookies.ts
init_config();
var COOKIE_NAME = "cs_refresh_token";
function serializeRefreshTokenCookie(refreshToken) {
  const isProd = config2.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${7 * 24 * 60 * 60}`
  ];
  if (isProd) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
function clearRefreshTokenCookie() {
  const isProd = config2.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];
  if (isProd) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
function extractRefreshTokenFromRequest(req) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader)
    return null;
  const match = cookieHeader.match(/(?:^|;\s*)cs_refresh_token=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

// server/utils.ts
function jsonResponse(data, status = 200, additionalHeaders = {}) {
  const headers = new Headers(additionalHeaders);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}
async function issueTokens(user, familyId) {
  const { token: accessToken, expiresIn } = await issueAccessToken(user);
  const session = await createSession(user.userId, familyId);
  const cookieHeader = serializeRefreshTokenCookie(session.refreshToken);
  return {
    accessToken,
    expiresIn,
    refreshToken: session.refreshToken,
    familyId: session.familyId,
    cookieHeader,
    user: {
      ...user,
      id: user.userId
    }
  };
}
async function getAuthUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token)
    return null;
  try {
    const claims = await verifyAccessToken(token);
    const [dbUser] = await sql`
      SELECT id, role, status FROM cs_arena.users WHERE id = ${claims.userId} LIMIT 1;
    `;
    if (!dbUser || dbUser.status !== "ACTIVE") {
      return null;
    }
    return {
      ...claims,
      role: dbUser.role,
      status: dbUser.status
    };
  } catch (err) {
    return null;
  }
}
async function requireAuth(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      errorResponse: jsonResponse(
        { error: "N\xE3o autorizado. Fa\xE7a login para acessar este recurso." },
        401
      )
    };
  }
  return { user };
}
async function requireRole(req, allowedRoles) {
  const authCheck = await requireAuth(req);
  if ("errorResponse" in authCheck)
    return authCheck;
  const user = authCheck.user;
  const userRole = (user.role || "").toUpperCase();
  const isAllowed = allowedRoles.some((r) => r.toUpperCase() === userRole);
  if (!isAllowed) {
    return {
      errorResponse: jsonResponse(
        {
          error: `Acesso negado. A\xE7\xE3o restrita aos perfis: ${allowedRoles.join(", ")}.`,
          currentRole: userRole,
          requiredRoles: allowedRoles
        },
        403
      )
    };
  }
  return { user };
}
async function requireAdmin(req) {
  return requireRole(req, ["ADMIN"]);
}

// server/lib/rate-limit.ts
async function checkRateLimit(key, limit = 5, windowSeconds = 60) {
  try {
    const expiresAt = new Date(Date.now() + windowSeconds * 1e3);
    const [record] = await sql`
      INSERT INTO cs_arena.rate_limits (key, count, expires_at)
      VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT (key) DO UPDATE
      SET 
        count = CASE 
          WHEN cs_arena.rate_limits.expires_at < NOW() THEN 1 
          ELSE cs_arena.rate_limits.count + 1 
        END,
        expires_at = CASE 
          WHEN cs_arena.rate_limits.expires_at < NOW() THEN ${expiresAt} 
          ELSE cs_arena.rate_limits.expires_at 
        END
      RETURNING count, expires_at;
    `;
    const count = record.count;
    const remaining = Math.max(0, limit - count);
    const resetInSeconds = Math.max(0, Math.ceil((new Date(record.expires_at).getTime() - Date.now()) / 1e3));
    return {
      allowed: count <= limit,
      remaining,
      resetInSeconds
    };
  } catch (err) {
    console.error("[RATE LIMIT ERROR]", err);
    return {
      allowed: true,
      remaining: limit,
      resetInSeconds: windowSeconds
    };
  }
}

// server/lib/csrf.ts
init_config();
function validateCsrf(req) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return true;
  }
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!origin && !referer) {
    return true;
  }
  const targetUrl = origin || referer;
  if (!targetUrl)
    return true;
  try {
    const parsedTarget = new URL(targetUrl);
    if (host) {
      const cleanHost = host.split(":")[0];
      const parsedHost = parsedTarget.hostname;
      if (cleanHost === parsedHost)
        return true;
    }
    if (config2.APP_URL) {
      const appUrl = new URL(config2.APP_URL);
      if (parsedTarget.origin === appUrl.origin)
        return true;
    }
    if (config2.NODE_ENV !== "production") {
      if (parsedTarget.hostname === "localhost" || parsedTarget.hostname === "127.0.0.1") {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// server/routes/auth.ts
var registerSchema = z2.object({
  name: z2.string().trim().min(2, "Nome deve ter no m\xEDnimo 2 caracteres").max(100, "Nome muito longo"),
  nickname: z2.string().trim().min(2, "Nickname deve ter no m\xEDnimo 2 caracteres").max(32, "Nickname deve ter no m\xE1ximo 32 caracteres").regex(/^[a-zA-Z0-9_\-.]+$/, "Nickname deve conter apenas letras, n\xFAmeros, pontos, h\xEDfens ou underlines"),
  email: z2.string().trim().email("E-mail em formato inv\xE1lido").max(255),
  password: z2.string().min(8, "A senha deve conter no m\xEDnimo 8 caracteres").max(128, "Senha muito longa")
});
var loginSchema = z2.object({
  email: z2.string().trim().email("E-mail inv\xE1lido"),
  password: z2.string().min(1, "Senha \xE9 obrigat\xF3ria")
});
var resetRequestSchema = z2.object({
  email: z2.string().trim().email("E-mail inv\xE1lido")
});
var resetConfirmSchema = z2.object({
  token: z2.string().min(1, "Token de recupera\xE7\xE3o \xE9 obrigat\xF3rio"),
  newPassword: z2.string().min(8, "A nova senha deve ter no m\xEDnimo 8 caracteres")
});
function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded)
    return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp)
    return realIp.trim();
  return "127.0.0.1";
}
function getUserAgent(req) {
  return req.headers.get("user-agent") || "Unknown";
}
async function handleAuth(req) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/auth\/?/, "").replace(/\/+$/, "").split("?")[0];
  const method = req.method;
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  if (!validateCsrf(req)) {
    return jsonResponse({ error: "Falha na valida\xE7\xE3o CSRF. Origem n\xE3o autorizada." }, 403);
  }
  if (method === "POST" && path === "register") {
    const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
    if (!isTest) {
      const rateCheck = await checkRateLimit(`reg:${ip}`, 5, 300);
      if (!rateCheck.allowed) {
        return jsonResponse(
          { error: "Muitas tentativas de cadastro a partir deste endere\xE7o. Tente novamente mais tarde." },
          429
        );
      }
    }
    try {
      const body = await req.json();
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: parsed.error.issues[0]?.message || "Dados de cadastro inv\xE1lidos." },
          400
        );
      }
      const { name, nickname, email, password } = parsed.data;
      const existingEmail = await sql`
        SELECT id FROM cs_arena.users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;
      `;
      if (existingEmail.length > 0) {
        return jsonResponse({ error: "Este e-mail j\xE1 est\xE1 cadastrado no sistema." }, 409);
      }
      const existingNick = await sql`
        SELECT id FROM cs_arena.players WHERE LOWER(nickname) = LOWER(${nickname}) LIMIT 1;
      `;
      if (existingNick.length > 0) {
        return jsonResponse({ error: "Este nickname j\xE1 est\xE1 em uso por outro jogador." }, 409);
      }
      const passwordHash = await hashPassword(password);
      const [newUser] = await sql`
        INSERT INTO cs_arena.users (name, nickname, email, password_hash, role, status)
        VALUES (${name}, ${nickname}, ${email.toLowerCase()}, ${passwordHash}, 'PLAYER', 'ACTIVE')
        RETURNING id, name, nickname, email, role, status;
      `;
      await sql`
        INSERT INTO cs_arena.players (nickname, preferred_role, skill_rating)
        VALUES (${nickname}, 'Flex', 1000)
        ON CONFLICT (nickname) DO NOTHING;
      `;
      const { accessToken, expiresIn, cookieHeader, user } = await issueTokens({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        nickname: newUser.nickname,
        role: newUser.role,
        status: newUser.status
      });
      await logAuthAudit("REGISTER_SUCCESS", newUser.id, ip, ua);
      return jsonResponse(
        {
          success: true,
          accessToken,
          token: accessToken,
          expiresIn,
          user
        },
        201,
        { "Set-Cookie": cookieHeader }
      );
    } catch (err) {
      console.error("[AUTH REGISTER ERROR]", err);
      return jsonResponse({ error: err.message || "Erro ao registrar usu\xE1rio" }, 500);
    }
  }
  if (method === "POST" && path === "login") {
    try {
      const body = await req.json();
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || "Dados inv\xE1lidos" }, 400);
      }
      const { email, password } = parsed.data;
      const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
      if (!isTest) {
        const ipCheck = await checkRateLimit(`login_ip:${ip}`, 10, 60);
        const emailCheck = await checkRateLimit(`login_email:${email.toLowerCase()}`, 5, 60);
        if (!ipCheck.allowed || !emailCheck.allowed) {
          await logAuthAudit("LOGIN_RATE_LIMITED", null, ip, ua);
          return jsonResponse(
            { error: "Muitas tentativas de login com falha. Aguarde 1 minuto e tente novamente." },
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
      if (users.length === 0) {
        await logAuthAudit("LOGIN_FAILED_NOT_FOUND", null, ip, ua);
        return jsonResponse({ error: "Credenciais inv\xE1lidas." }, 401);
      }
      const user = users[0];
      const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
      if (!valid) {
        await logAuthAudit("LOGIN_FAILED_WRONG_PASSWORD", user.id, ip, ua);
        return jsonResponse({ error: "Credenciais inv\xE1lidas." }, 401);
      }
      if (user.status !== "ACTIVE") {
        await logAuthAudit("LOGIN_BLOCKED_INACTIVE", user.id, ip, ua);
        return jsonResponse({ error: "Sua conta est\xE1 desativada ou suspensa. Contate o suporte." }, 403);
      }
      if (needsRehash) {
        const newHash = await hashPassword(password);
        await sql`UPDATE cs_arena.users SET password_hash = ${newHash} WHERE id = ${user.id};`;
      }
      const { accessToken, expiresIn, cookieHeader, user: userPayload } = await issueTokens({
        userId: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
        status: user.status
      });
      await logAuthAudit("LOGIN_SUCCESS", user.id, ip, ua);
      return jsonResponse(
        {
          success: true,
          accessToken,
          token: accessToken,
          expiresIn,
          user: userPayload
        },
        200,
        { "Set-Cookie": cookieHeader }
      );
    } catch (err) {
      console.error("[AUTH LOGIN ERROR]", err);
      return jsonResponse({ error: err.message || "Erro durante o login" }, 500);
    }
  }
  if (method === "POST" && path === "refresh") {
    try {
      let rawRefreshToken = extractRefreshTokenFromRequest(req);
      if (!rawRefreshToken) {
        try {
          const body = await req.json().catch(() => ({}));
          rawRefreshToken = body?.refreshToken || null;
        } catch {
        }
      }
      if (!rawRefreshToken) {
        return jsonResponse({ error: "Token de renova\xE7\xE3o n\xE3o fornecido." }, 401);
      }
      const { newRefreshToken, user } = await rotateRefreshToken(rawRefreshToken, ip, ua);
      const { issueAccessToken: issueAccessToken2 } = await Promise.resolve().then(() => (init_jwt(), jwt_exports));
      const { token: accessToken, expiresIn } = await issueAccessToken2(user);
      const cookieHeader = serializeRefreshTokenCookie(newRefreshToken);
      return jsonResponse(
        {
          success: true,
          accessToken,
          token: accessToken,
          expiresIn,
          refreshToken: newRefreshToken,
          // also provided in JSON for programmatic clients
          user
        },
        200,
        { "Set-Cookie": cookieHeader }
      );
    } catch (err) {
      if (err instanceof SessionError) {
        const clearCookie = clearRefreshTokenCookie();
        const statusCode = err.code === "REUSE_DETECTED" || err.code === "INACTIVE_USER" ? 403 : 401;
        return jsonResponse({ error: err.message, code: err.code }, statusCode, {
          "Set-Cookie": clearCookie
        });
      }
      return jsonResponse({ error: "Erro ao renovar sess\xE3o." }, 500);
    }
  }
  if (method === "POST" && path === "logout") {
    const rawRefreshToken = extractRefreshTokenFromRequest(req);
    if (rawRefreshToken) {
      await revokeSession(rawRefreshToken, ip, ua);
    }
    const clearCookie = clearRefreshTokenCookie();
    return jsonResponse({ success: true, message: "Sess\xE3o encerrada com sucesso." }, 200, {
      "Set-Cookie": clearCookie
    });
  }
  if (method === "POST" && path === "logout-all") {
    const authCheck = await requireAuth(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    await revokeAllUserSessions(authCheck.user.userId, ip, ua);
    const clearCookie = clearRefreshTokenCookie();
    return jsonResponse(
      { success: true, message: "Todas as sess\xF5es ativas foram revogadas com sucesso." },
      200,
      { "Set-Cookie": clearCookie }
    );
  }
  if (method === "GET" && path === "me") {
    const authCheck = await requireAuth(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    return jsonResponse({ user: authCheck.user }, 200);
  }
  if (method === "GET" && path === "sessions") {
    const authCheck = await requireAuth(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    const currentRefreshToken = extractRefreshTokenFromRequest(req) || void 0;
    const sessions = await getUserSessions(authCheck.user.userId, currentRefreshToken);
    return jsonResponse({ sessions }, 200);
  }
  if (method === "POST" && path === "forgot-password") {
    try {
      const body = await req.json();
      const parsed = resetRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: "E-mail inv\xE1lido." }, 400);
      }
      const email = parsed.data.email.toLowerCase();
      const [user] = await sql`
        SELECT id FROM cs_arena.users WHERE LOWER(email) = LOWER(${email}) AND status = 'ACTIVE' LIMIT 1;
      `;
      let resetToken = void 0;
      if (user) {
        resetToken = generateOpaqueToken(32);
        const tokenHash = hashToken(resetToken);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
        await sql`
          INSERT INTO cs_arena.password_reset_tokens (user_id, token_hash, expires_at)
          VALUES (${user.id}, ${tokenHash}, ${expiresAt});
        `;
        await logAuthAudit("PASSWORD_RESET_REQUESTED", user.id, ip, ua);
      }
      return jsonResponse({
        success: true,
        message: "Se o e-mail estiver cadastrado, as instru\xE7\xF5es de recupera\xE7\xE3o foram enviadas.",
        // Expose resetToken in non-production for automated testing / demonstration
        resetToken: process.env.NODE_ENV !== "production" ? resetToken : void 0
      });
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao processar solicita\xE7\xE3o" }, 500);
    }
  }
  if (method === "POST" && path === "reset-password") {
    try {
      const body = await req.json();
      const parsed = resetConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || "Dados inv\xE1lidos" }, 400);
      }
      const { token, newPassword } = parsed.data;
      const tokenHash = hashToken(token);
      const [resetRecord] = await sql`
        SELECT id, user_id, expires_at, used_at
        FROM cs_arena.password_reset_tokens
        WHERE token_hash = ${tokenHash}
        LIMIT 1;
      `;
      if (!resetRecord || resetRecord.used_at !== null || new Date(resetRecord.expires_at) < /* @__PURE__ */ new Date()) {
        return jsonResponse(
          { error: "Token de recupera\xE7\xE3o inv\xE1lido, j\xE1 utilizado ou expirado." },
          400
        );
      }
      const newPasswordHash = await hashPassword(newPassword);
      await sql`
        UPDATE cs_arena.users
        SET password_hash = ${newPasswordHash}, updated_at = NOW()
        WHERE id = ${resetRecord.user_id};
      `;
      await sql`
        UPDATE cs_arena.password_reset_tokens
        SET used_at = NOW()
        WHERE id = ${resetRecord.id};
      `;
      await revokeAllUserSessions(resetRecord.user_id, ip, ua);
      await logAuthAudit("PASSWORD_RESET_SUCCESS", resetRecord.user_id, ip, ua);
      return jsonResponse({
        success: true,
        message: "Senha redefinida com sucesso. Fa\xE7a login com suas novas credenciais."
      });
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao redefinir senha" }, 500);
    }
  }
  return jsonResponse({ error: `Rota de autentica\xE7\xE3o '/api/auth/${path}' n\xE3o encontrada.` }, 404);
}

// server/routes/users.ts
import { z as z3 } from "zod";
var updateUserSchema = z3.object({
  name: z3.string().trim().min(2, "Nome deve ter no m\xEDnimo 2 caracteres").max(100).optional(),
  nickname: z3.string().trim().min(2, "Nickname deve ter no m\xEDnimo 2 caracteres").max(32).regex(/^[a-zA-Z0-9_\-.]+$/, "Nickname cont\xE9m caracteres inv\xE1lidos").optional()
});
async function handleUsers(req, segments) {
  const method = req.method;
  const subAction = segments[0] || "";
  if (subAction === "me" && method === "GET") {
    const authCheck = await requireAuth(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    const [user] = await sql`
      SELECT u.id, u.name, u.nickname, u.email, u.role, u.status, u.created_at,
             p.avatar_url, p.preferred_role, p.skill_rating, p.steam_id
      FROM cs_arena.users u
      LEFT JOIN cs_arena.players p ON LOWER(p.nickname) = LOWER(u.nickname)
      WHERE u.id = ${authCheck.user.userId}
      LIMIT 1;
    `;
    if (!user) {
      return jsonResponse({ error: "Usu\xE1rio n\xE3o encontrado." }, 404);
    }
    const userRegistrations = await sql`
      SELECT r.id, r.status, r.registered_at, t.id as tournament_id, t.name as tournament_name
      FROM cs_arena.registrations r
      JOIN cs_arena.tournaments t ON r.tournament_id = t.id
      JOIN cs_arena.players p ON r.player_id = p.id
      WHERE LOWER(p.nickname) = LOWER(${user.nickname})
      ORDER BY r.registered_at DESC;
    `;
    return jsonResponse({
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        preferredRole: user.preferred_role,
        skillRating: user.skill_rating,
        steamId: user.steam_id,
        createdAt: user.created_at
      },
      registrations: userRegistrations
    });
  }
  if (subAction === "me" && method === "PATCH") {
    const authCheck = await requireAuth(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    try {
      const body = await req.json();
      const parsed = updateUserSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || "Dados inv\xE1lidos" }, 400);
      }
      const { name, nickname } = parsed.data;
      if (!name && !nickname) {
        return jsonResponse({ error: "Nenhum campo fornecido para atualiza\xE7\xE3o." }, 400);
      }
      if (nickname) {
        const existingNick = await sql`
          SELECT id FROM cs_arena.users 
          WHERE LOWER(nickname) = LOWER(${nickname}) AND id != ${authCheck.user.userId} 
          LIMIT 1;
        `;
        if (existingNick.length > 0) {
          return jsonResponse({ error: "Este nickname j\xE1 est\xE1 em uso por outro usu\xE1rio." }, 409);
        }
      }
      const [updated] = await sql`
        UPDATE cs_arena.users
        SET 
          name = COALESCE(${name || null}, name),
          nickname = COALESCE(${nickname || null}, nickname),
          updated_at = NOW()
        WHERE id = ${authCheck.user.userId}
        RETURNING id, name, nickname, email, role, status;
      `;
      if (nickname) {
        await sql`
          UPDATE cs_arena.players
          SET nickname = ${nickname}
          WHERE LOWER(nickname) = LOWER(${authCheck.user.nickname || ""});
        `;
      }
      return jsonResponse({ user: updated });
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao atualizar dados" }, 500);
    }
  }
  return jsonResponse({ error: `Rota de usu\xE1rio '/api/users/${subAction}' n\xE3o encontrada.` }, 404);
}

// server/routes/tournaments.ts
async function handleTournaments(req, segments) {
  const method = req.method;
  const tournamentId = segments[0] || null;
  const subAction = segments[1] || null;
  if (!tournamentId && method === "GET") {
    const list = await sql`
      SELECT 
        t.id, t.name, t.slug, t.description, t.format, t.team_size, t.best_of, t.status, t.created_at,
        COUNT(r.id)::int as registrations_count
      FROM cs_arena.tournaments t
      LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id
      GROUP BY t.id
      ORDER BY t.created_at DESC;
    `;
    return jsonResponse({ tournaments: list });
  }
  if (!tournamentId && method === "POST") {
    const authCheck = await requireAdmin(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    try {
      const body = await req.json();
      const { name, slug, description, bestOf = 1, rules } = body;
      if (!name || !slug) {
        return jsonResponse({ error: "Nome e slug s\xE3o obrigat\xF3rios." }, 400);
      }
      const [created] = await sql`
        INSERT INTO cs_arena.tournaments (name, slug, description, best_of, rules, status, created_by)
        VALUES (${name}, ${slug}, ${description || null}, ${bestOf}, ${rules || null}, 'registration_open', ${authCheck.user.userId})
        RETURNING *;
      `;
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (${authCheck.user.userId}, ${authCheck.user.name}, 'CREATE_TOURNAMENT', 'tournaments', ${created.id}, ${JSON.stringify(created)});
      `;
      return jsonResponse({ tournament: created }, 201);
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao criar campeonato" }, 400);
    }
  }
  if (tournamentId) {
    if (!subAction && method === "GET") {
      const [t] = await sql`
        SELECT 
          t.*,
          COUNT(DISTINCT r.id)::int as registrations_count,
          COUNT(DISTINCT tm.id)::int as teams_count
        FROM cs_arena.tournaments t
        LEFT JOIN cs_arena.registrations r ON t.id = r.tournament_id
        LEFT JOIN cs_arena.teams tm ON t.id = tm.tournament_id
        WHERE t.id = ${tournamentId} OR t.slug = ${tournamentId}
        GROUP BY t.id;
      `;
      if (!t)
        return jsonResponse({ error: "Campeonato n\xE3o encontrado." }, 404);
      return jsonResponse({ tournament: t });
    }
    if (!subAction && method === "PATCH") {
      const authCheck = await requireAdmin(req);
      if ("errorResponse" in authCheck)
        return authCheck.errorResponse;
      const body = await req.json();
      const { name, description, rules, status } = body;
      const [updated] = await sql`
        UPDATE cs_arena.tournaments
        SET 
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          rules = COALESCE(${rules}, rules),
          status = COALESCE(${status}, status),
          updated_at = NOW()
        WHERE id = ${tournamentId}
        RETURNING *;
      `;
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (${authCheck.user.userId}, ${authCheck.user.name}, 'UPDATE_TOURNAMENT', 'tournaments', ${tournamentId}, ${JSON.stringify(updated)});
      `;
      return jsonResponse({ tournament: updated });
    }
    if (subAction === "register" && method === "POST") {
      try {
        const body = await req.json();
        const { nickname, steamId, preferredRole = "Flex", avatarUrl } = body;
        if (!nickname || !nickname.trim()) {
          return jsonResponse({ error: "Nickname \xE9 obrigat\xF3rio." }, 400);
        }
        let [player] = await sql`
          SELECT id, nickname FROM cs_arena.players WHERE LOWER(nickname) = LOWER(${nickname.trim()}) LIMIT 1;
        `;
        if (!player) {
          const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname.trim())}`;
          [player] = await sql`
            INSERT INTO cs_arena.players (nickname, steam_id, avatar_url, preferred_role)
            VALUES (${nickname.trim()}, ${steamId || null}, ${avatar}, ${preferredRole})
            RETURNING id, nickname;
          `;
        }
        const existing = await sql`
          SELECT id FROM cs_arena.registrations
          WHERE tournament_id = ${tournamentId} AND player_id = ${player.id};
        `;
        if (existing.length > 0) {
          return jsonResponse({ error: "Este jogador j\xE1 est\xE1 inscrito neste campeonato." }, 409);
        }
        const [reg] = await sql`
          INSERT INTO cs_arena.registrations (tournament_id, player_id, status)
          VALUES (${tournamentId}, ${player.id}, 'confirmed')
          RETURNING *;
        `;
        await sql`
          INSERT INTO cs_arena.audit_logs (action, entity_type, entity_id, after_state)
          VALUES ('PLAYER_REGISTERED', 'registrations', ${reg.id}, ${JSON.stringify({ tournamentId, playerId: player.id, nickname })});
        `;
        return jsonResponse({ success: true, registration: reg, player }, 201);
      } catch (err) {
        return jsonResponse({ error: err.message || "Erro na inscri\xE7\xE3o" }, 400);
      }
    }
    if (subAction === "registrations" && method === "GET") {
      const list = await sql`
        SELECT 
          r.id as registration_id, r.status, r.registered_at,
          p.id as player_id, p.nickname, p.steam_id, p.avatar_url, p.preferred_role, p.skill_rating
        FROM cs_arena.registrations r
        JOIN cs_arena.players p ON r.player_id = p.id
        WHERE r.tournament_id = ${tournamentId}
        ORDER BY r.registered_at ASC;
      `;
      return jsonResponse({ registrations: list });
    }
    if (subAction === "close-registration" && method === "POST") {
      const authCheck = await requireAdmin(req);
      if ("errorResponse" in authCheck)
        return authCheck.errorResponse;
      const [updated] = await sql`
        UPDATE cs_arena.tournaments
        SET status = 'registration_closed', updated_at = NOW()
        WHERE id = ${tournamentId}
        RETURNING *;
      `;
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (${authCheck.user.userId}, ${authCheck.user.name}, 'CLOSE_REGISTRATION', 'tournaments', ${tournamentId}, ${JSON.stringify(updated)});
      `;
      return jsonResponse({ tournament: updated });
    }
    if (subAction === "teams" && method === "GET") {
      const teamsList = await sql`
        SELECT 
          t.id, t.name, t.seed, t.status, t.captain_id,
          p.nickname as captain_nickname
        FROM cs_arena.teams t
        LEFT JOIN cs_arena.players p ON t.captain_id = p.id
        WHERE t.tournament_id = ${tournamentId}
        ORDER BY t.seed ASC, t.created_at ASC;
      `;
      const membersList = await sql`
        SELECT 
          tm.team_id, tm.is_captain,
          p.id as player_id, p.nickname, p.preferred_role, p.skill_rating, p.avatar_url
        FROM cs_arena.team_members tm
        JOIN cs_arena.players p ON tm.player_id = p.id
        WHERE tm.tournament_id = ${tournamentId}
        ORDER BY tm.is_captain DESC, p.nickname ASC;
      `;
      const teamMap = /* @__PURE__ */ new Map();
      for (const t of teamsList) {
        teamMap.set(t.id, { ...t, members: [] });
      }
      for (const m of membersList) {
        const team = teamMap.get(m.team_id);
        if (team) {
          team.members.push(m);
        }
      }
      const reserves = await sql`
        SELECT 
          r.id, p.id as player_id, p.nickname, p.preferred_role, p.skill_rating, p.avatar_url
        FROM cs_arena.registrations r
        JOIN cs_arena.players p ON r.player_id = p.id
        WHERE r.tournament_id = ${tournamentId} AND r.status = 'reserve'
        ORDER BY p.skill_rating DESC;
      `;
      return jsonResponse({
        teams: Array.from(teamMap.values()),
        reserves
      });
    }
    if (subAction === "bracket" && method === "GET") {
      const rounds = await sql`
        SELECT id, round_number, name
        FROM cs_arena.bracket_rounds
        WHERE tournament_id = ${tournamentId}
        ORDER BY round_number ASC;
      `;
      const matchesList = await sql`
        SELECT 
          m.id, m.round_id, m.bracket_position, m.is_bye, m.best_of, m.status,
          m.next_match_id, m.next_match_slot, m.winner_id,
          t1.id as team_a_id, t1.name as team_a_name, t1.seed as team_a_seed,
          t2.id as team_b_id, t2.name as team_b_name, t2.seed as team_b_seed,
          w.name as winner_name
        FROM cs_arena.matches m
        LEFT JOIN cs_arena.teams t1 ON m.team_a_id = t1.id
        LEFT JOIN cs_arena.teams t2 ON m.team_b_id = t2.id
        LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY m.bracket_position ASC;
      `;
      const mapsList = await sql`
        SELECT mm.*
        FROM cs_arena.match_maps mm
        JOIN cs_arena.matches m ON mm.match_id = m.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY mm.match_id, mm.order_number ASC;
      `;
      const mapsByMatch = /* @__PURE__ */ new Map();
      for (const mapItem of mapsList) {
        if (!mapsByMatch.has(mapItem.match_id)) {
          mapsByMatch.set(mapItem.match_id, []);
        }
        mapsByMatch.get(mapItem.match_id).push(mapItem);
      }
      const matchesWithMaps = matchesList.map((m) => ({
        ...m,
        maps: mapsByMatch.get(m.id) || []
      }));
      return jsonResponse({
        rounds,
        matches: matchesWithMaps
      });
    }
    if (subAction === "audit" && method === "GET") {
      const authCheck = await requireAdmin(req);
      if ("errorResponse" in authCheck)
        return authCheck.errorResponse;
      const logs = await sql`
        SELECT id, actor_id, actor_name, action, entity_type, entity_id, before_state, after_state, created_at
        FROM cs_arena.audit_logs
        WHERE entity_id = ${tournamentId} OR (after_state->>'tournamentId') = ${tournamentId}
        ORDER BY created_at DESC
        LIMIT 100;
      `;
      return jsonResponse({ auditLogs: logs });
    }
  }
  return jsonResponse({ error: "Endpoint n\xE3o encontrado." }, 404);
}

// src/lib/tournament-engine.ts
import crypto4 from "crypto";
function secureShuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto4.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function nextPowerOfTwo(n) {
  if (n <= 1)
    return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}
function formTeams(players, algorithm = "random") {
  const N = players.length;
  const teamSize = 5;
  const teamCount = Math.floor(N / teamSize);
  const reserveCount = N % teamSize;
  if (teamCount < 2) {
    throw new Error(
      `Inscritos insuficientes: s\xE3o necess\xE1rios no m\xEDnimo 10 jogadores (2 equipes completas de 5) para iniciar o campeonato 5x5. Atualmente h\xE1 ${N} jogador(es).`
    );
  }
  let selectedPlayers;
  let reservePlayers;
  if (algorithm === "random") {
    const shuffled = secureShuffle(players);
    const activeTotal = teamCount * teamSize;
    selectedPlayers = shuffled.slice(0, activeTotal);
    reservePlayers = shuffled.slice(activeTotal);
  } else if (algorithm === "balanced") {
    const sorted = [...players].sort((a, b) => b.skillRating - a.skillRating);
    const activeTotal = teamCount * teamSize;
    selectedPlayers = sorted.slice(0, activeTotal);
    reservePlayers = sorted.slice(activeTotal);
  } else {
    const sorted = [...players].sort((a, b) => b.skillRating - a.skillRating);
    const activeTotal = teamCount * teamSize;
    selectedPlayers = sorted.slice(0, activeTotal);
    reservePlayers = sorted.slice(activeTotal);
  }
  const defaultNames = [
    "Alpha Strike",
    "Shadow Ninjas",
    "Cyber Immortals",
    "Viper Squad",
    "Phantom Titans",
    "Echo Fury",
    "Apex Predators",
    "Ghost Legion",
    "Vortex Esports",
    "Iron Valkyries",
    "Solaris CS",
    "Nebula Gaming",
    "Quantum Force",
    "Rogue Vanguard",
    "Overdrive Gaming",
    "Valiant Force"
  ];
  const teams = [];
  for (let t = 0; t < teamCount; t++) {
    teams.push({
      name: defaultNames[t] || `Time ${t + 1}`,
      seed: t + 1,
      members: []
    });
  }
  if (algorithm === "random") {
    for (let t = 0; t < teamCount; t++) {
      const slice = selectedPlayers.slice(t * 5, (t + 1) * 5);
      teams[t].captainId = slice[0]?.id;
      teams[t].members = slice.map((p, idx) => ({
        playerId: p.id,
        isCaptain: idx === 0
      }));
    }
  } else if (algorithm === "balanced") {
    let playerIndex = 0;
    for (let round = 0; round < 5; round++) {
      const isReverse = round % 2 === 1;
      const order = isReverse ? Array.from({ length: teamCount }, (_, i) => teamCount - 1 - i) : Array.from({ length: teamCount }, (_, i) => i);
      for (const t of order) {
        const player = selectedPlayers[playerIndex++];
        const isCaptain = round === 0;
        if (isCaptain) {
          teams[t].captainId = player.id;
        }
        teams[t].members.push({
          playerId: player.id,
          isCaptain
        });
      }
    }
  } else {
    for (let t = 0; t < teamCount; t++) {
      const captain = selectedPlayers[t];
      teams[t].captainId = captain.id;
      teams[t].members.push({ playerId: captain.id, isCaptain: true });
    }
    const pool = selectedPlayers.slice(teamCount);
    let poolIndex = 0;
    for (let round = 1; round < 5; round++) {
      const isReverse = round % 2 === 1;
      const order = isReverse ? Array.from({ length: teamCount }, (_, i) => teamCount - 1 - i) : Array.from({ length: teamCount }, (_, i) => i);
      for (const t of order) {
        const player = pool[poolIndex++];
        teams[t].members.push({ playerId: player.id, isCaptain: false });
      }
    }
  }
  return {
    teams,
    reserves: reservePlayers.map((p) => ({ playerId: p.id })),
    algorithm
  };
}
function getRoundName(totalRounds, currentRound) {
  const roundsFromFinal = totalRounds - currentRound;
  switch (roundsFromFinal) {
    case 0:
      return "Grande Final";
    case 1:
      return "Semifinais";
    case 2:
      return "Quartas de Final";
    case 3:
      return "Oitavas de Final";
    default:
      return `Rodada ${currentRound}`;
  }
}
function generateSingleEliminationBracket(teams, bestOf = 1) {
  const T = teams.length;
  if (T < 2) {
    throw new Error("\xC9 necess\xE1rio ter no m\xEDnimo 2 equipes para gerar o chaveamento.");
  }
  const P = nextPowerOfTwo(T);
  const totalRounds = Math.log2(P);
  const byeCount = P - T;
  const rounds = [];
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      roundNumber: r,
      name: getRoundName(totalRounds, r)
    });
  }
  function getSeedPairings(size) {
    let pairings = [1, 2];
    while (pairings.length < size) {
      const next = [];
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
  const teamBySeed = new Map(teams.map((t) => [t.seed, t]));
  const allMatches = [];
  const matchesByRound = [];
  let matchCounter = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const matchCountInRound = P / Math.pow(2, r);
    const roundList = [];
    for (let pos = 0; pos < matchCountInRound; pos++) {
      roundList.push({
        roundNumber: r,
        roundName: rounds[r - 1].name,
        bracketPosition: matchCounter++,
        teamAId: null,
        teamBId: null,
        isBye: false,
        status: "pending"
      });
    }
    matchesByRound.push(roundList);
  }
  for (let r = 0; r < totalRounds - 1; r++) {
    const currentRound = matchesByRound[r];
    const nextRound = matchesByRound[r + 1];
    for (let i = 0; i < currentRound.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const slot = i % 2 === 0 ? "team_a" : "team_b";
      currentRound[i].nextRoundMatchIndex = nextRound[nextMatchIndex].bracketPosition;
      currentRound[i].nextMatchSlot = slot;
    }
  }
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
    if (teamA && !teamB) {
      round1[i].isBye = true;
      round1[i].status = "completed";
      round1[i].winnerId = teamA.id;
      if (totalRounds > 1) {
        const nextMatchPos = round1[i].nextRoundMatchIndex;
        const nextMatch = matchesByRound.flat().find((m) => m.bracketPosition === nextMatchPos);
        if (nextMatch) {
          if (round1[i].nextMatchSlot === "team_a") {
            nextMatch.teamAId = teamA.id;
          } else {
            nextMatch.teamBId = teamA.id;
          }
        }
      }
    } else if (!teamA && teamB) {
      round1[i].isBye = true;
      round1[i].status = "completed";
      round1[i].winnerId = teamB.id;
      if (totalRounds > 1) {
        const nextMatchPos = round1[i].nextRoundMatchIndex;
        const nextMatch = matchesByRound.flat().find((m) => m.bracketPosition === nextMatchPos);
        if (nextMatch) {
          if (round1[i].nextMatchSlot === "team_a") {
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
    matches: matchesByRound.flat()
  };
}
function checkSeriesWinner(maps, teamAId, teamBId, bestOf) {
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
        error: "Mapas de Counter-Strike n\xE3o podem terminar empatados."
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
      seriesWinnerId: teamAId
    };
  }
  if (winsB >= winsRequired) {
    return {
      isCompleted: true,
      winsA,
      winsB,
      seriesWinnerId: teamBId
    };
  }
  return {
    isCompleted: false,
    winsA,
    winsB,
    seriesWinnerId: null
  };
}

// server/routes/draws.ts
import crypto5 from "crypto";
async function handleDraws(req, tournamentId, action) {
  const method = req.method;
  if (action === "draw-teams" && method === "POST") {
    const authCheck = await requireAdmin(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    try {
      const body = await req.json().catch(() => ({}));
      const algorithm = body.algorithm || "random";
      const idempotencyKey = body.idempotencyKey || `draw-teams-${tournamentId}-${Date.now()}`;
      const existingDraw = await sql`
        SELECT id FROM cs_arena.draws WHERE idempotency_key = ${idempotencyKey} LIMIT 1;
      `;
      if (existingDraw.length > 0) {
        return jsonResponse({
          message: "Sorteio j\xE1 executado com esta chave de idempot\xEAncia.",
          drawId: existingDraw[0].id
        });
      }
      const existingTeams = await sql`
        SELECT COUNT(id)::int as count FROM cs_arena.teams WHERE tournament_id = ${tournamentId};
      `;
      if (existingTeams[0]?.count > 0 && !body.forceReset) {
        return jsonResponse(
          { error: "As equipes deste torneio j\xE1 foram sorteadas. Para sortear novamente, forne\xE7a confirma\xE7\xE3o expl\xEDcita com justificativa." },
          409
        );
      }
      if (body.forceReset) {
        await sql`DELETE FROM cs_arena.teams WHERE tournament_id = ${tournamentId};`;
        await sql`
          UPDATE cs_arena.registrations 
          SET status = 'confirmed' 
          WHERE tournament_id = ${tournamentId};
        `;
      }
      const registrants = await sql`
        SELECT p.id, p.nickname, p.steam_id, p.avatar_url, p.preferred_role, p.skill_rating
        FROM cs_arena.registrations r
        JOIN cs_arena.players p ON r.player_id = p.id
        WHERE r.tournament_id = ${tournamentId}
        ORDER BY r.registered_at ASC;
      `;
      if (registrants.length < 10) {
        return jsonResponse(
          { error: `Inscritos insuficientes: s\xE3o necess\xE1rios pelo menos 10 jogadores (2 equipes) para iniciar o campeonato 5x5. Atualmente h\xE1 ${registrants.length} inscritos.` },
          400
        );
      }
      const playersData = registrants.map((r) => ({
        id: r.id,
        nickname: r.nickname,
        steamId: r.steam_id,
        avatarUrl: r.avatar_url,
        preferredRole: r.preferred_role,
        skillRating: r.skill_rating
      }));
      const draft = formTeams(playersData, algorithm);
      const auditHash = crypto5.createHash("sha256").update(JSON.stringify(draft)).digest("hex");
      const [drawRecord] = await sql`
        INSERT INTO cs_arena.draws (
          tournament_id, type, status, algorithm, options, performed_by, idempotency_key, audit_hash, metadata
        )
        VALUES (
          ${tournamentId}, 'teams', 'completed', ${algorithm}, 
          ${JSON.stringify({ N: registrants.length, teamsCount: draft.teams.length, reservesCount: draft.reserves.length })},
          ${authCheck.user.userId}, ${idempotencyKey}, ${auditHash},
          ${JSON.stringify({ draftSummary: `${draft.teams.length} equipes e ${draft.reserves.length} reservas geradas.` })}
        )
        RETURNING *;
      `;
      let selectionOrder = 1;
      const animationSteps = [];
      for (const t of draft.teams) {
        const [teamRow] = await sql`
          INSERT INTO cs_arena.teams (tournament_id, name, captain_id, seed, status)
          VALUES (${tournamentId}, ${t.name}, ${t.captainId || null}, ${t.seed}, 'active')
          RETURNING id, name, seed;
        `;
        for (const m of t.members) {
          const playerObj = playersData.find((p) => p.id === m.playerId);
          await sql`
            INSERT INTO cs_arena.team_members (team_id, player_id, tournament_id, is_captain)
            VALUES (${teamRow.id}, ${m.playerId}, ${tournamentId}, ${m.isCaptain})
            ON CONFLICT (tournament_id, player_id) DO NOTHING;
          `;
          await sql`
            INSERT INTO cs_arena.draw_results (draw_id, player_id, team_id, selection_order, metadata)
            VALUES (${drawRecord.id}, ${m.playerId}, ${teamRow.id}, ${selectionOrder}, ${JSON.stringify({ isCaptain: m.isCaptain, teamName: t.name })});
          `;
          animationSteps.push({
            order: selectionOrder++,
            playerId: m.playerId,
            playerNickname: playerObj.nickname,
            avatarUrl: playerObj.avatarUrl,
            teamName: t.name,
            teamSeed: t.seed,
            isCaptain: m.isCaptain
          });
        }
      }
      for (const r of draft.reserves) {
        await sql`
          UPDATE cs_arena.registrations
          SET status = 'reserve'
          WHERE tournament_id = ${tournamentId} AND player_id = ${r.playerId};
        `;
        await sql`
          INSERT INTO cs_arena.draw_results (draw_id, player_id, selection_order, metadata)
          VALUES (${drawRecord.id}, ${r.playerId}, ${selectionOrder++}, ${JSON.stringify({ isReserve: true })});
        `;
      }
      await sql`
        UPDATE cs_arena.tournaments
        SET status = 'drawing', updated_at = NOW()
        WHERE id = ${tournamentId};
      `;
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (
          ${authCheck.user.userId}, ${authCheck.user.name}, 'DRAW_TEAMS', 'tournaments', ${tournamentId},
          ${JSON.stringify({ drawId: drawRecord.id, algorithm, teams: draft.teams.length, reserves: draft.reserves.length })}
        );
      `;
      return jsonResponse({
        success: true,
        drawId: drawRecord.id,
        algorithm,
        teamsCount: draft.teams.length,
        reservesCount: draft.reserves.length,
        animationSteps
      });
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao executar sorteio das equipes" }, 500);
    }
  }
  if (action === "draw-bracket" && method === "POST") {
    const authCheck = await requireAdmin(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    try {
      const body = await req.json().catch(() => ({}));
      const teams = await sql`
        SELECT id, name, seed
        FROM cs_arena.teams
        WHERE tournament_id = ${tournamentId}
        ORDER BY seed ASC;
      `;
      if (teams.length < 2) {
        return jsonResponse({ error: "\xC9 necess\xE1rio ter no m\xEDnimo 2 equipes para gerar a chave de confrontos." }, 400);
      }
      const [tournament] = await sql`
        SELECT best_of FROM cs_arena.tournaments WHERE id = ${tournamentId};
      `;
      const bestOf = tournament?.best_of || 1;
      await sql`DELETE FROM cs_arena.bracket_rounds WHERE tournament_id = ${tournamentId};`;
      const generated = generateSingleEliminationBracket(
        teams.map((t) => ({ id: t.id, seed: t.seed, name: t.name })),
        bestOf
      );
      const roundIdMap = /* @__PURE__ */ new Map();
      for (const r of generated.rounds) {
        const [insertedRound] = await sql`
          INSERT INTO cs_arena.bracket_rounds (tournament_id, round_number, name)
          VALUES (${tournamentId}, ${r.roundNumber}, ${r.name})
          RETURNING id;
        `;
        roundIdMap.set(r.roundNumber, insertedRound.id);
      }
      const matchIdMap = /* @__PURE__ */ new Map();
      for (const m of generated.matches) {
        const roundDbId = roundIdMap.get(m.roundNumber);
        const [insertedMatch] = await sql`
          INSERT INTO cs_arena.matches (
            tournament_id, round_id, bracket_position, team_a_id, team_b_id, is_bye, best_of, status, winner_id
          )
          VALUES (
            ${tournamentId}, ${roundDbId}, ${m.bracketPosition}, ${m.teamAId || null}, ${m.teamBId || null},
            ${m.isBye}, ${bestOf}, ${m.status}, ${m.winnerId || null}
          )
          RETURNING id;
        `;
        matchIdMap.set(m.bracketPosition, insertedMatch.id);
      }
      for (const m of generated.matches) {
        if (m.nextRoundMatchIndex !== void 0) {
          const thisMatchDbId = matchIdMap.get(m.bracketPosition);
          const nextMatchDbId = matchIdMap.get(m.nextRoundMatchIndex);
          await sql`
            UPDATE cs_arena.matches
            SET next_match_id = ${nextMatchDbId}, next_match_slot = ${m.nextMatchSlot || null}
            WHERE id = ${thisMatchDbId};
          `;
          if (m.isBye && m.winnerId) {
            if (m.nextMatchSlot === "team_a") {
              await sql`UPDATE cs_arena.matches SET team_a_id = ${m.winnerId} WHERE id = ${nextMatchDbId};`;
            } else if (m.nextMatchSlot === "team_b") {
              await sql`UPDATE cs_arena.matches SET team_b_id = ${m.winnerId} WHERE id = ${nextMatchDbId};`;
            }
          }
        }
      }
      await sql`
        UPDATE cs_arena.tournaments
        SET status = 'in_progress', updated_at = NOW()
        WHERE id = ${tournamentId};
      `;
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (
          ${authCheck.user.userId}, ${authCheck.user.name}, 'DRAW_BRACKET', 'tournaments', ${tournamentId},
          ${JSON.stringify({ matchesCount: generated.matches.length, roundsCount: generated.rounds.length })}
        );
      `;
      return jsonResponse({
        success: true,
        roundsCount: generated.rounds.length,
        matchesCount: generated.matches.length
      });
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao gerar chaveamento" }, 500);
    }
  }
  return jsonResponse({ error: "A\xE7\xE3o de sorteio desconhecida." }, 404);
}

// server/routes/matches.ts
async function handleMatches(req, segments) {
  const method = req.method;
  const matchId = segments[0] || null;
  const subAction = segments[1] || null;
  if (!matchId) {
    return jsonResponse({ error: "ID da partida \xE9 obrigat\xF3rio." }, 400);
  }
  if (!subAction && method === "GET") {
    const [match] = await sql`
      SELECT 
        m.*,
        r.name as round_name, r.round_number,
        t1.name as team_a_name, t1.seed as team_a_seed,
        t2.name as team_b_name, t2.seed as team_b_seed,
        w.name as winner_name
      FROM cs_arena.matches m
      JOIN cs_arena.bracket_rounds r ON m.round_id = r.id
      LEFT JOIN cs_arena.teams t1 ON m.team_a_id = t1.id
      LEFT JOIN cs_arena.teams t2 ON m.team_b_id = t2.id
      LEFT JOIN cs_arena.teams w ON m.winner_id = w.id
      WHERE m.id = ${matchId};
    `;
    if (!match)
      return jsonResponse({ error: "Partida n\xE3o encontrada." }, 404);
    const maps = await sql`
      SELECT *
      FROM cs_arena.match_maps
      WHERE match_id = ${matchId}
      ORDER BY order_number ASC;
    `;
    return jsonResponse({ match, maps });
  }
  if (subAction === "results" && method === "POST") {
    const authCheck = await requireAdmin(req);
    if ("errorResponse" in authCheck)
      return authCheck.errorResponse;
    try {
      const body = await req.json();
      const { maps } = body;
      if (!Array.isArray(maps) || maps.length === 0) {
        return jsonResponse({ error: "\xC9 necess\xE1rio informar ao menos um mapa." }, 400);
      }
      const [match] = await sql`
        SELECT * FROM cs_arena.matches WHERE id = ${matchId};
      `;
      if (!match)
        return jsonResponse({ error: "Partida n\xE3o encontrada." }, 404);
      if (!match.team_a_id || !match.team_b_id) {
        return jsonResponse({ error: "A partida ainda n\xE3o possui ambas as equipes definidas." }, 400);
      }
      const seriesCheck = checkSeriesWinner(maps, match.team_a_id, match.team_b_id, match.best_of);
      if (seriesCheck.error) {
        return jsonResponse({ error: seriesCheck.error }, 400);
      }
      await sql`DELETE FROM cs_arena.match_maps WHERE match_id = ${matchId};`;
      for (const m of maps) {
        const winnerId2 = m.scoreA > m.scoreB ? match.team_a_id : match.team_b_id;
        await sql`
          INSERT INTO cs_arena.match_maps (match_id, order_number, map_name, score_a, score_b, winner_id)
          VALUES (${matchId}, ${m.orderNumber}, ${m.mapName}, ${m.scoreA}, ${m.scoreB}, ${winnerId2});
        `;
      }
      const newStatus = seriesCheck.isCompleted ? "completed" : "in_progress";
      const winnerId = seriesCheck.seriesWinnerId;
      const [updatedMatch] = await sql`
        UPDATE cs_arena.matches
        SET 
          status = ${newStatus},
          winner_id = ${winnerId || null},
          completed_at = ${seriesCheck.isCompleted ? (/* @__PURE__ */ new Date()).toISOString() : null},
          version = version + 1
        WHERE id = ${matchId}
        RETURNING *;
      `;
      if (seriesCheck.isCompleted && winnerId) {
        if (updatedMatch.next_match_id) {
          if (updatedMatch.next_match_slot === "team_a") {
            await sql`
              UPDATE cs_arena.matches
              SET team_a_id = ${winnerId}
              WHERE id = ${updatedMatch.next_match_id};
            `;
          } else if (updatedMatch.next_match_slot === "team_b") {
            await sql`
              UPDATE cs_arena.matches
              SET team_b_id = ${winnerId}
              WHERE id = ${updatedMatch.next_match_id};
            `;
          }
        } else {
          const loserId = winnerId === match.team_a_id ? match.team_b_id : match.team_a_id;
          await sql`
            UPDATE cs_arena.tournaments
            SET status = 'completed', updated_at = NOW()
            WHERE id = ${match.tournament_id};
          `;
          await sql`
            UPDATE cs_arena.teams
            SET status = 'champion'
            WHERE id = ${winnerId};
          `;
          await sql`
            UPDATE cs_arena.teams
            SET status = 'runner_up'
            WHERE id = ${loserId};
          `;
        }
      }
      await sql`
        INSERT INTO cs_arena.audit_logs (actor_id, actor_name, action, entity_type, entity_id, after_state)
        VALUES (
          ${authCheck.user.userId}, ${authCheck.user.name}, 'SUBMIT_MATCH_RESULT', 'matches', ${matchId},
          ${JSON.stringify({ matchId, seriesCheck, maps })}
        );
      `;
      return jsonResponse({
        success: true,
        match: updatedMatch,
        series: seriesCheck
      });
    } catch (err) {
      return jsonResponse({ error: err.message || "Erro ao registrar resultado da partida" }, 500);
    }
  }
  return jsonResponse({ error: "A\xE7\xE3o n\xE3o reconhecida." }, 404);
}

// server/index.ts
import { neon as neon2 } from "@neondatabase/serverless";
async function router(req) {
  const url = new URL(req.url);
  let pathname = url.pathname.replace(/^\/api\/?/, "");
  if (pathname.includes("[...")) {
    const params = url.searchParams.getAll("path");
    if (params.length > 0) {
      pathname = params.join("/");
    } else {
      const single = url.searchParams.get("path") || url.searchParams.get("all") || url.searchParams.get("slug");
      if (single)
        pathname = single;
    }
  }
  pathname = pathname.replace(/\/+$/, "").split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  const primary = segments[0];
  if (primary === "health") {
    let dbStatus = "ok";
    let dbError = null;
    try {
      const connString = process.env.DATABASE_URL;
      if (!connString) {
        throw new Error("DATABASE_URL is not set in environment.");
      }
      const testSql = neon2(connString);
      await testSql`SELECT 1;`;
    } catch (e) {
      dbStatus = "error";
      dbError = e.message || "Database connection error";
    }
    return jsonResponse(
      {
        status: dbStatus === "ok" ? "healthy" : "degraded",
        database: dbStatus,
        dbError,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      dbStatus === "ok" ? 200 : 500
    );
  }
  if (primary === "auth") {
    return handleAuth(req);
  }
  if (primary === "tournaments") {
    const tournamentId = segments[1];
    const subAction = segments[2];
    if (tournamentId && (subAction === "draw-teams" || subAction === "draw-bracket")) {
      return handleDraws(req, tournamentId, subAction);
    }
    return handleTournaments(req, segments.slice(1));
  }
  if (primary === "matches") {
    return handleMatches(req, segments.slice(1));
  }
  if (primary === "users") {
    return handleUsers(req, segments.slice(1));
  }
  return jsonResponse({ error: `Rota API '/api/${pathname}' n\xE3o encontrada.` }, 404);
}
async function handler(req, res) {
  if (res && (typeof res.setHeader === "function" || typeof res.writeHead === "function")) {
    try {
      let rawPath = req.headers && (req.headers["x-forwarded-uri"] || req.headers["x-matched-path"]) || req.url || "/api";
      if (rawPath.includes("[...")) {
        const qPath = req.query?.path || req.query?.all || req.query?.slug;
        if (qPath) {
          const joined = Array.isArray(qPath) ? qPath.join("/") : qPath;
          rawPath = `/api/${joined}`;
        }
      }
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const proto = req.headers["x-forwarded-proto"] || "https";
      const fullUrl = `${proto}://${host}${rawPath}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
      let body = void 0;
      if (req.method !== "GET" && req.method !== "HEAD") {
        if (typeof req.body === "string") {
          body = req.body;
        } else if (req.body && typeof req.body === "object" && Buffer.isBuffer(req.body)) {
          body = req.body.toString("utf-8");
        } else if (req.body && typeof req.body === "object") {
          body = JSON.stringify(req.body);
        } else {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          if (chunks.length > 0) {
            body = Buffer.concat(chunks).toString("utf-8");
          }
        }
      }
      const request = new Request(fullUrl, {
        method: req.method,
        headers,
        body
      });
      const response = await router(request);
      res.statusCode = response.status;
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });
      const data = await response.text();
      res.end(data);
    } catch (err) {
      console.error("API Error:", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "Internal Server Error" }));
    }
    return;
  }
  return router(req);
}

// server/[...path].ts
var path_default = handler;
export {
  path_default as default
};
