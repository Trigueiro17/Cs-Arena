import { verifyAccessToken, issueAccessToken, UserClaims, UserRole } from './lib/jwt';
import { createSession, rotateRefreshToken, revokeSession } from './lib/session';
import { serializeRefreshTokenCookie } from './lib/cookies';
import { sql } from './db';

export { verifyAccessToken, rotateRefreshToken, revokeSession };

export function jsonResponse(data: unknown, status = 200, additionalHeaders: HeadersInit = {}): Response {
  const headers = new Headers(additionalHeaders);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Issue both an Access Token (15m) and a Refresh Token (7d)
 */
export async function issueTokens(user: UserClaims, familyId?: string) {
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
      id: user.userId,
    },
  };
}

/**
 * Extract and verify authenticated user from Authorization header, validating active status in DB
 */
export async function getAuthUser(req: Request): Promise<UserClaims | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return null;

  try {
    const claims = await verifyAccessToken(token);

    // Verify current user state in PostgreSQL to prevent revoked/banned users with valid JWT
    const [dbUser] = await sql`
      SELECT id, role, status FROM cs_arena.users WHERE id = ${claims.userId} LIMIT 1;
    `;

    if (!dbUser || dbUser.status !== 'ACTIVE') {
      return null;
    }

    return {
      ...claims,
      role: dbUser.role as UserRole,
      status: dbUser.status as any,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Authentication Guard - requires valid, non-expired access token and active user account
 */
export async function requireAuth(req: Request): Promise<{ user: UserClaims } | { errorResponse: Response }> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      errorResponse: jsonResponse(
        { error: 'Não autorizado. Faça login para acessar este recurso.' },
        401
      ),
    };
  }
  return { user };
}

/**
 * Role-Based Access Control (RBAC) Guard
 */
export async function requireRole(
  req: Request,
  allowedRoles: UserRole[]
): Promise<{ user: UserClaims } | { errorResponse: Response }> {
  const authCheck = await requireAuth(req);
  if ('errorResponse' in authCheck) return authCheck;

  const user = authCheck.user;
  // Normalize comparison to uppercase
  const userRole = (user.role || '').toUpperCase() as UserRole;
  const isAllowed = allowedRoles.some((r) => r.toUpperCase() === userRole);

  if (!isAllowed) {
    return {
      errorResponse: jsonResponse(
        {
          error: `Acesso negado. Ação restrita aos perfis: ${allowedRoles.join(', ')}.`,
          currentRole: userRole,
          requiredRoles: allowedRoles,
        },
        403
      ),
    };
  }

  return { user };
}

/**
 * Admin Only Guard
 */
export async function requireAdmin(req: Request): Promise<{ user: UserClaims } | { errorResponse: Response }> {
  return requireRole(req, ['ADMIN']);
}

/**
 * Organizer or Admin Guard
 */
export async function requireOrganizerOrAdmin(req: Request): Promise<{ user: UserClaims } | { errorResponse: Response }> {
  return requireRole(req, ['ADMIN', 'ORGANIZER']);
}
