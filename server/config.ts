import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres (256 bits de entropia)'),
  JWT_ISSUER: z.string().default('cs-arena'),
  JWT_AUDIENCE: z.string().default('cs-arena-web'),
  APP_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  // Support AUTH_SECRET as fallback for JWT_SECRET for backward compatibility
  const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET;

  const raw = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: jwtSecret,
    JWT_ISSUER: process.env.JWT_ISSUER || 'cs-arena',
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'cs-arena-web',
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.warn(`[CONFIG WARNING] Variáveis de ambiente incompletas:\n${errorDetails}`);
    // In production, throw; in dev/test, fallback gracefully if possible
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Configuração inválida:\n${errorDetails}`);
    }
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET: jwtSecret || 'cs-arena-default-fallback-secret-at-least-32-chars-long!',
      JWT_ISSUER: 'cs-arena',
      JWT_AUDIENCE: 'cs-arena-web',
      APP_URL: process.env.APP_URL || 'http://localhost:5173',
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    };
  }

  return parsed.data;
}

export const config = loadConfig();
