import crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

/**
 * Hash password using Argon2id with recommended parameters
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    algorithm: 2, // 2 = Argon2id
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify password against Argon2id hash, with fallback to legacy bcrypt hashes
 */
export async function verifyPassword(password: string, hash: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!hash) return { valid: false, needsRehash: false };

  // Check if hash is Argon2id
  if (hash.startsWith('$argon2id$') || hash.startsWith('$argon2i$') || hash.startsWith('$argon2d$')) {
    try {
      const valid = await argon2.verify(hash, password);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Fallback for existing legacy bcrypt hashes ($2a$, $2b$, $2y$)
  if (hash.startsWith('$2')) {
    try {
      const valid = await bcrypt.compare(password, hash);
      return { valid, needsRehash: valid }; // If valid, mark for auto-upgrade to Argon2id
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  return { valid: false, needsRehash: false };
}

/**
 * Generate cryptographically secure random opaque token (32 bytes hex = 64 chars)
 */
export function generateOpaqueToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Hash token using SHA-256 for secure database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf-8').digest('hex');
}
