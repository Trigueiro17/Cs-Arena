import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { config } from '../config';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'PLAYER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserClaims {
  id?: string;
  userId: string;
  email: string;
  name: string;
  nickname?: string | null;
  role: UserRole;
  status: UserStatus;
}

let cachedSecretKey: crypto.KeyObject | null = null;

function getSecretKey(): crypto.KeyObject {
  if (!cachedSecretKey) {
    cachedSecretKey = crypto.createSecretKey(Buffer.from(config.JWT_SECRET, 'utf-8'));
  }
  return cachedSecretKey;
}

/**
 * Issue a short-lived Access Token (15 minutes) with all mandatory RFC 7519 claims
 */
export async function issueAccessToken(user: UserClaims): Promise<{ token: string; expiresIn: number }> {
  const secret = getSecretKey();
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 15 * 60; // 15 minutes = 900 seconds
  const exp = now + expiresIn;

  const token = await new SignJWT({
    userId: user.userId,
    email: user.email,
    name: user.name,
    nickname: user.nickname || null,
    role: user.role,
    status: user.status,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.userId)
    .setIssuer(config.JWT_ISSUER)
    .setAudience(config.JWT_AUDIENCE)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(secret);

  return { token, expiresIn };
}

/**
 * Verify Access Token: checks signature, algorithms, issuer, audience and expiration
 */
export async function verifyAccessToken(token: string): Promise<UserClaims> {
  const secret = getSecretKey();

  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    clockTolerance: 10, // 10 seconds tolerance for slight server clock skews
  });

  return {
    userId: (payload.sub || payload.userId) as string,
    email: payload.email as string,
    name: payload.name as string,
    nickname: payload.nickname as string | undefined,
    role: (payload.role as UserRole) || 'PLAYER',
    status: (payload.status as UserStatus) || 'ACTIVE',
  };
}
