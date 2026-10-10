import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as argon2 from '@node-rs/argon2';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não configurada no ambiente.');
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log('--- Provisionamento Seguro de Administrador CS ARENA ---');

  const email = (process.env.SEED_ADMIN_EMAIL || process.argv[2] || 'admin@csarena.com').trim().toLowerCase();
  const name = (process.env.SEED_ADMIN_NAME || process.argv[3] || 'Administrador Master').trim();
  const nickname = (process.env.SEED_ADMIN_NICK || 'AdminMaster').trim();

  // If password not supplied via env, generate a cryptographically strong random password
  let password = process.env.SEED_ADMIN_PASSWORD || process.argv[4];
  let generated = false;

  if (!password) {
    password = crypto.randomBytes(12).toString('base64url'); // 16 secure chars
    generated = true;
  }

  const passwordHash = await argon2.hash(password, {
    algorithm: 2, // 2 = Argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const [admin] = await sql`
    INSERT INTO cs_arena.users (name, nickname, email, password_hash, role, status)
    VALUES (${name}, ${nickname}, ${email}, ${passwordHash}, 'ADMIN', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE
    SET role = 'ADMIN',
        status = 'ACTIVE',
        password_hash = ${passwordHash},
        updated_at = NOW()
    RETURNING id, name, nickname, email, role, status;
  `;

  console.log('✅ Administrador provisionado com sucesso:');
  console.log(`   ID:       ${admin.id}`);
  console.log(`   Nome:     ${admin.name}`);
  console.log(`   E-mail:   ${admin.email}`);
  console.log(`   Role:     ${admin.role}`);
  console.log(`   Status:   ${admin.status}`);

  if (generated) {
    console.log('\n🔒 SENHA GERADA (Guarde em local seguro - não será exibida novamente):');
    console.log(`   👉 ${password}\n`);
  } else {
    console.log('\n🔒 Senha configurada com sucesso via variável de ambiente / argumento.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro ao provisionar administrador:', err);
    process.exit(1);
  });
