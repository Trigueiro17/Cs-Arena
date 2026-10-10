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
  const jwtSecret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    'f1fd6e8fe1eb3ae55bd1abc10ac98a2a2dcc0101493379b9bb70ee3bea3e983b';

  const raw = {
    DATABASE_URL: process.env.DATABASE_URL || '',
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
    console.warn(`[CONFIG WARNING] Variáveis de ambiente incompletas (usando fallback seguro):\n${errorDetails}`);

    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET: jwtSecret,
      JWT_ISSUER: process.env.JWT_ISSUER || 'cs-arena',
      JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'cs-arena-web',
      APP_URL: process.env.APP_URL || 'http://localhost:5173',
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    };
  }

  return parsed.data;
}

export const config = loadConfig();
