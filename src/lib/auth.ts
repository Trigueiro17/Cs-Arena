import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET || 'cs-arena-default-dev-secret-key-32chars!';

let cachedCryptoKey: CryptoKey | null = null;

async function getSecretKey(): Promise<CryptoKey> {
  if (!cachedCryptoKey) {
    cachedCryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(AUTH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return cachedCryptoKey;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const key = await getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const key = await getSecretKey();
    const { payload } = await jwtVerify(token, key);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'user',
    };
  } catch (err) {
    return null;
  }
}
