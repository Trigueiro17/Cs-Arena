import { sql } from '../db';

export async function logAuthAudit(
  action: string,
  userId?: string | null,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  try {
    await sql`
      INSERT INTO cs_arena.auth_audit_logs (user_id, action, ip_address, user_agent)
      VALUES (${userId || null}, ${action}, ${ipAddress || null}, ${userAgent || null});
    `;
  } catch (err) {
    // Non-blocking fallback: log to console without crashing request
    console.error(`[AUDIT ERROR] Falha ao registrar log de auditoria (${action}):`, err);
  }
}
