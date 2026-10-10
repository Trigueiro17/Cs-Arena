import { neon } from '@neondatabase/serverless';

let cachedClient: any = null;

export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const connString = process.env.DATABASE_URL;
  if (!connString) {
    throw new Error('DATABASE_URL is not set in environment.');
  }
  if (!cachedClient) {
    cachedClient = neon(connString);
  }
  return cachedClient(strings, ...values);
};
