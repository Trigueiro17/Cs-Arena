import { config } from '../config';

const COOKIE_NAME = 'cs_refresh_token';

export function serializeRefreshTokenCookie(refreshToken: string): string {
  const isProd = config.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearRefreshTokenCookie(): string {
  const isProd = config.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function extractRefreshTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)cs_refresh_token=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

