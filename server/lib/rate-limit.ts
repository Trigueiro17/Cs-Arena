import { sql } from '../db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Distributed serverless rate limiter powered by Neon PostgreSQL
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  try {
    const expiresAt = new Date(Date.now() + windowSeconds * 1000);

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
    const resetInSeconds = Math.max(0, Math.ceil((new Date(record.expires_at).getTime() - Date.now()) / 1000));

    return {
      allowed: count <= limit,
      remaining,
      resetInSeconds,
    };
  } catch (err) {
    // Fail open in case of temporary DB failure to not block legitimate users
    console.error('[RATE LIMIT ERROR]', err);
    return {
      allowed: true,
      remaining: limit,
      resetInSeconds: windowSeconds,
    };
  }
}
