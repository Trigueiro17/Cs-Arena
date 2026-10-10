import crypto from 'crypto';
import { sql } from '../db';
import { generateOpaqueToken, hashToken } from './crypto';
import { logAuthAudit } from './audit';
import { UserClaims } from './jwt';

const REFRESH_TOKEN_TTL_DAYS = 7;

export interface SessionResult {
  refreshToken: string;
  sessionId: string;
  familyId: string;
  expiresAt: Date;
}

export class SessionError extends Error {
  constructor(message: string, public code: 'NOT_FOUND' | 'EXPIRED' | 'REUSE_DETECTED' | 'REVOKED' | 'INACTIVE_USER') {
    super(message);
    this.name = 'SessionError';
  }
}

/**
 * Create a new refresh session (at login or registration)
 */
export async function createSession(userId: string, familyId?: string): Promise<SessionResult> {
  const refreshToken = generateOpaqueToken(32);
  const tokenHash = hashToken(refreshToken);
  const famId = familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

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
    expiresAt: session.expires_at,
  };
}

/**
 * Rotate refresh token with atomic family-based reuse detection
 */
export async function rotateRefreshToken(
  rawRefreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ newRefreshToken: string; user: UserClaims }> {
  const tokenHash = hashToken(rawRefreshToken);

  // 1. Find the session matching this token hash
  const sessions = await sql`
    SELECT s.id, s.user_id, s.family_id, s.expires_at, s.revoked_at, s.rotated_at,
           u.id as u_id, u.name, u.nickname, u.email, u.role, u.status
    FROM cs_arena.auth_sessions s
    JOIN cs_arena.users u ON s.user_id = u.id
    WHERE s.refresh_token_hash = ${tokenHash}
    LIMIT 1;
  `;

  if (sessions.length === 0) {
    throw new SessionError('Sessão não encontrada.', 'NOT_FOUND');
  }

  const session = sessions[0];

  // 2. TOKEN REUSE DETECTION:
  // If the token is already revoked OR has already been rotated once:
  // An attacker or compromised client is reusing an old token!
  if (session.revoked_at !== null || session.rotated_at !== null) {
    // Revoke the ENTIRE token family atomically to protect the account
    await sql`
      UPDATE cs_arena.auth_sessions
      SET revoked_at = NOW()
      WHERE family_id = ${session.family_id} AND revoked_at IS NULL;
    `;

    await logAuthAudit('SECURITY_REFRESH_TOKEN_REUSE_DETECTED', session.user_id, ipAddress, userAgent);
    throw new SessionError(
      'Tentativa de reutilização de sessão detectada. Por segurança, todas as sessões foram revogadas.',
      'REUSE_DETECTED'
    );
  }

  // 3. Expiration check
  const now = new Date();
  if (new Date(session.expires_at) < now) {
    await sql`
      UPDATE cs_arena.auth_sessions
      SET revoked_at = NOW()
      WHERE id = ${session.id};
    `;
    throw new SessionError('Sessão expirada. Faça login novamente.', 'EXPIRED');
  }

  // 4. User Status check
  if (session.status !== 'ACTIVE') {
    await sql`
      UPDATE cs_arena.auth_sessions
      SET revoked_at = NOW()
      WHERE user_id = ${session.user_id};
    `;
    throw new SessionError('Conta desativada ou suspensa.', 'INACTIVE_USER');
  }

  // 5. ATOMIC ROTATION:
  // Mark current session as rotated and generate the next link in the family
  const newRefreshToken = generateOpaqueToken(32);
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Mark old token as rotated
  await sql`
    UPDATE cs_arena.auth_sessions
    SET rotated_at = NOW(), last_used_at = NOW()
    WHERE id = ${session.id};
  `;

  // Create new session in the same family
  await sql`
    INSERT INTO cs_arena.auth_sessions (
      user_id, family_id, refresh_token_hash, expires_at
    )
    VALUES (
      ${session.user_id}, ${session.family_id}, ${newTokenHash}, ${newExpiresAt}
    );
  `;

  await logAuthAudit('SESSION_ROTATED', session.user_id, ipAddress, userAgent);

  return {
    newRefreshToken,
    user: {
      id: session.u_id,
      userId: session.u_id,
      email: session.email,
      name: session.name,
      nickname: session.nickname,
      role: session.role,
      status: session.status,
    },
  };
}

/**
 * Revoke a single session by refresh token (logout)
 */
export async function revokeSession(rawRefreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  const [session] = await sql`
    UPDATE cs_arena.auth_sessions
    SET revoked_at = NOW()
    WHERE refresh_token_hash = ${tokenHash} AND revoked_at IS NULL
    RETURNING user_id;
  `;

  if (session) {
    await logAuthAudit('LOGOUT_SUCCESS', session.user_id, ipAddress, userAgent);
  }
}

/**
 * Revoke ALL sessions for a user (logout all devices / password reset)
 */
export async function revokeAllUserSessions(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await sql`
    UPDATE cs_arena.auth_sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked_at IS NULL;
  `;

  await logAuthAudit('LOGOUT_ALL_DEVICES', userId, ipAddress, userAgent);
}

/**
 * List active sessions for user
 */
export async function getUserSessions(userId: string, currentRefreshToken?: string) {
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  const rows = await sql`
    SELECT id, family_id, expires_at, created_at, last_used_at, refresh_token_hash
    FROM cs_arena.auth_sessions
    WHERE user_id = ${userId} AND revoked_at IS NULL AND rotated_at IS NULL AND expires_at > NOW()
    ORDER BY last_used_at DESC;
  `;

  return rows.map((r: any) => ({
    id: r.id,
    familyId: r.family_id,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    expiresAt: r.expires_at,
    isCurrent: currentHash ? r.refresh_token_hash === currentHash : false,
  }));
}
