import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

// Serverless Neon client
export const sql = connectionString ? neon(connectionString) : null;
export const db = sql ? drizzle(sql, { schema }) : ({} as ReturnType<typeof drizzle<typeof schema>>);

export * from './schema';
