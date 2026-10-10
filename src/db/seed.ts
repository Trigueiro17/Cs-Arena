import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { hashPassword } from '../lib/auth';
import { formTeams, generateSingleEliminationBracket } from '../lib/tournament-engine';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const sql = neon(connectionString);

const CS2_NICKNAMES = [
  'FalleN', 'coldzera', 'fer', 'TACO', 'fnx', 's1mple', 'ZywOo', 'm0NESY',
  'NiKo', 'device', 'b1t', 'ropz', 'karrigan', 'broky', 'rain', 'twistzz',
  'electronic', 'sh1ro', 'Ax1Le', 'flameZ', 'Spinx', 'donk', 'magixx', 'chopper',
  'shroud', 'tarik', 'Stewie2K', 'autimatic', 'RUSH', 'olofmeister', 'KRIMZ', 'JW',
  'flusha', 'pronax', 'GeT_RiGhT', 'f0rest', 'friberg', 'Xizt', 'Fifflaren', 'pashaBiceps',
  'Snax', 'byali', 'TaZ', 'NEO', 'kennyS', 'apEX', 'NBK', 'shox', 'SmithZz',
  'kennyS_jr', 'Art', 'yuurih', 'KSCERATO', 'drop', 'saffee', 'chelo', 'skullz',
  'felps', 'boltz', 'steel', 'lucas1', 'hen1', 'kNgV-', 'horvy', 'yeL',
  'PKL', 'biguzera', 'hardzao', 'dav1deus', 'dumau', 'b4rtiN', 'noway', 'nqz', 'insani'
];

const ROLES: ('AWP' | 'Entry' | 'Support' | 'IGL' | 'Flex')[] = ['AWP', 'Entry', 'Support', 'IGL', 'Flex'];

export async function runSeed() {
  console.log('--- Iniciando Seed do CS Arena no Neon ---');

  // 1. Criar admin e player users
  const adminPasswordHash = await hashPassword('admin123');
  const playerPasswordHash = await hashPassword('player123');

  const adminUsers = await sql`
    INSERT INTO cs_arena.users (email, password_hash, name, role)
    VALUES 
      ('admin@csarena.com', ${adminPasswordHash}, 'Administrador CS Arena', 'admin'),
      ('player@csarena.com', ${playerPasswordHash}, 'Jogador Teste', 'user')
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
    RETURNING id, email, role;
  `;
  const adminId = adminUsers.find(u => u.role === 'admin')?.id || adminUsers[0].id;
  console.log('👤 Usuários criados/atualizados:', adminUsers.length);

  // 2. Criar pool de 75 jogadores
  const createdPlayers: { id: string; nickname: string; preferred_role: string; skill_rating: number }[] = [];
  for (let i = 0; i < CS2_NICKNAMES.length; i++) {
    const nick = CS2_NICKNAMES[i];
    const role = ROLES[i % ROLES.length];
    const rating = 1400 + Math.floor(Math.sin(i) * 300) + (i * 12);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nick)}`;

    const [p] = await sql`
      INSERT INTO cs_arena.players (nickname, steam_id, avatar_url, preferred_role, skill_rating)
      VALUES (${nick}, ${`76561198${10000000 + i}`}, ${avatar}, ${role}, ${rating})
      ON CONFLICT (nickname) DO UPDATE
      SET skill_rating = EXCLUDED.skill_rating, avatar_url = EXCLUDED.avatar_url
      RETURNING id, nickname, preferred_role, skill_rating;
    `;
    createdPlayers.push(p as any);
  }
  console.log(`🎮 Pool de ${createdPlayers.length} jogadores preparado.`);

  // 3. Criar Torneios com diferentes contagens de inscritos
  const tournamentsToCreate = [
    { name: 'CS2 Duo Qualif — 8 Jogadores', slug: 'cs2-duo-qualif-8', count: 8, desc: 'Torneio demonstrativo com 8 inscritos (inferior a 2 equipes completas).' },
    { name: 'CS2 Flash Cup — 15 Jogadores', slug: 'cs2-flash-cup-15', count: 15, desc: 'Torneio rápido com 3 equipes e 1 BYE.' },
    { name: 'CS2 Weekly Pro — 30 Jogadores', slug: 'cs2-weekly-pro-30', count: 30, desc: 'Torneio semanal com 6 equipes e 2 BYEs.' },
    { name: 'CS2 Masters Showdown — 40 Jogadores', slug: 'cs2-masters-40', count: 40, desc: 'Torneio completo com 8 equipes sem BYEs.' },
    { name: 'CS2 Major Arena — 43 Jogadores', slug: 'cs2-major-arena-43', count: 43, desc: 'Torneio oficial principal com 43 inscritos (8 equipes e 3 reservas).' },
    { name: 'CS2 Mega Open — 75 Jogadores', slug: 'cs2-mega-open-75', count: 75, desc: 'Torneio massivo com 15 equipes e 1 BYE na chave de 16.' },
  ];

  for (const t of tournamentsToCreate) {
    const [tournament] = await sql`
      INSERT INTO cs_arena.tournaments (name, slug, description, format, team_size, best_of, status, created_by)
      VALUES (${t.name}, ${t.slug}, ${t.desc}, 'single_elimination', 5, 1, 'registration_open', ${adminId})
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description
      RETURNING id, name, slug;
    `;

    // Inscrever os primeiros N jogadores
    const registrants = createdPlayers.slice(0, t.count);
    for (const player of registrants) {
      await sql`
        INSERT INTO cs_arena.registrations (tournament_id, player_id, status)
        VALUES (${tournament.id}, ${player.id}, 'confirmed')
        ON CONFLICT (tournament_id, player_id) DO NOTHING;
      `;
    }

    console.log(`🏆 Torneio '${t.name}' criado com ${registrants.length} inscritos.`);
  }

  // 4. Inserir log de auditoria inicial
  await sql`
    INSERT INTO cs_arena.audit_logs (actor_name, action, entity_type, entity_id, after_state)
    VALUES (
      'System Seed',
      'INITIALIZE_DEVELOPMENT_ENVIRONMENT',
      'database',
      'cs_arena',
      ${JSON.stringify({ tournamentsCount: tournamentsToCreate.length, playersCount: createdPlayers.length })}
    );
  `;

  console.log('✅ Seed finalizado com sucesso no Neon PostgreSQL!');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erro no seed:', err);
      process.exit(1);
    });
}
