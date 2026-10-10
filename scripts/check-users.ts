import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`SELECT id, name, nickname, email, role, created_at FROM cs_arena.users`;
  console.log('Total users:', users.length);
  console.log('Users in DB:', JSON.stringify(users, null, 2));
}

main().catch(console.error);
