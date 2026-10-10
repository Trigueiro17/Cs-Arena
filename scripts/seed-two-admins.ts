import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { hashPassword } from '../server/lib/crypto';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL não configurada no ambiente.');
  process.exit(1);
}

const sql = neon(connectionString);

async function createOrUpdateAdmin(email: string, name: string, nickname: string, passwordPlain: string) {
  const hash = await hashPassword(passwordPlain);
  
  const [user] = await sql`
    INSERT INTO cs_arena.users (name, nickname, email, password_hash, role, status)
    VALUES (${name}, ${nickname}, ${email.toLowerCase()}, ${hash}, 'ADMIN', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE
    SET name = ${name},
        nickname = ${nickname},
        role = 'ADMIN',
        status = 'ACTIVE',
        password_hash = ${hash},
        updated_at = NOW()
    RETURNING id, name, nickname, email, role, status;
  `;

  // Ensure linked player record exists so admin can also test tournaments
  await sql`
    INSERT INTO cs_arena.players (nickname, preferred_role, skill_rating)
    VALUES (${nickname}, 'IGL', 1500)
    ON CONFLICT (nickname) DO NOTHING;
  `;

  return user;
}

async function main() {
  console.log('🚀 Criando / Atualizando 2 Contas de Administrador...\n');

  const admin1 = await createOrUpdateAdmin(
    'rafaeltriqueiro17@gmail.com',
    'Rafael Trigueiro',
    'trigueiro17',
    'admin123'
  );
  console.log('✅ Admin 1 criado/atualizado com sucesso:');
  console.log(`   Nome:     ${admin1.name}`);
  console.log(`   Nickname: ${admin1.nickname}`);
  console.log(`   E-mail:   ${admin1.email}`);
  console.log(`   Senha:    admin123`);
  console.log(`   Role:     ${admin1.role}`);
  console.log(`   Status:   ${admin1.status}\n`);

  const admin2 = await createOrUpdateAdmin(
    'admin@csarena.com',
    'Administrador Master',
    'admin_master',
    'admin123'
  );
  console.log('✅ Admin 2 criado/atualizado com sucesso:');
  console.log(`   Nome:     ${admin2.name}`);
  console.log(`   Nickname: ${admin2.nickname}`);
  console.log(`   E-mail:   ${admin2.email}`);
  console.log(`   Senha:    admin123`);
  console.log(`   Role:     ${admin2.role}`);
  console.log(`   Status:   ${admin2.status}\n`);

  console.log('🎉 Ambas as contas de administrador estão ativas e prontas para uso!');
}

main().catch(err => {
  console.error('Erro ao criar admins:', err);
  process.exit(1);
});
