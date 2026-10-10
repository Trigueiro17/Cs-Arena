import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in environment.');
  process.exit(1);
}

const sql = neon(connectionString);

export async function runMigrations() {
  console.log('--- Iniciando migração do banco Neon (schema: cs_arena) ---');

  // 1. Criar schema isolado cs_arena
  await sql`CREATE SCHEMA IF NOT EXISTS cs_arena;`;

  // 2. Tabela de Usuários
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 3. Tabela de Jogadores
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nickname TEXT NOT NULL UNIQUE,
      steam_id TEXT,
      avatar_url TEXT,
      preferred_role TEXT NOT NULL DEFAULT 'Flex',
      skill_rating INTEGER NOT NULL DEFAULT 1000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 4. Tabela de Torneios
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.tournaments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      format TEXT NOT NULL DEFAULT 'single_elimination',
      team_size INTEGER NOT NULL DEFAULT 5,
      best_of INTEGER NOT NULL DEFAULT 1,
      max_players INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      rules TEXT,
      created_by UUID REFERENCES cs_arena.users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 5. Inscrições
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id UUID NOT NULL REFERENCES cs_arena.tournaments(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES cs_arena.players(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'registered',
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT tournament_player_unique UNIQUE (tournament_id, player_id)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS reg_tournament_id_idx ON cs_arena.registrations(tournament_id);`;

  // 6. Equipes
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id UUID NOT NULL REFERENCES cs_arena.tournaments(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      captain_id UUID REFERENCES cs_arena.players(id) ON DELETE SET NULL,
      seed INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS team_tournament_id_idx ON cs_arena.teams(tournament_id);`;

  // 7. Membros de Equipe (garante 1 equipe por torneio por jogador)
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES cs_arena.teams(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES cs_arena.players(id) ON DELETE CASCADE,
      tournament_id UUID NOT NULL REFERENCES cs_arena.tournaments(id) ON DELETE CASCADE,
      is_captain BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT team_members_tournament_player_unique UNIQUE (tournament_id, player_id)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON cs_arena.team_members(team_id);`;

  // 8. Fases da Chave
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.bracket_rounds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id UUID NOT NULL REFERENCES cs_arena.tournaments(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      name TEXT NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS bracket_round_tournament_idx ON cs_arena.bracket_rounds(tournament_id);`;

  // 9. Partidas / Confrontos
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id UUID NOT NULL REFERENCES cs_arena.tournaments(id) ON DELETE CASCADE,
      round_id UUID NOT NULL REFERENCES cs_arena.bracket_rounds(id) ON DELETE CASCADE,
      bracket_position INTEGER NOT NULL,
      team_a_id UUID REFERENCES cs_arena.teams(id) ON DELETE SET NULL,
      team_b_id UUID REFERENCES cs_arena.teams(id) ON DELETE SET NULL,
      next_match_id UUID,
      next_match_slot TEXT,
      winner_id UUID REFERENCES cs_arena.teams(id) ON DELETE SET NULL,
      is_bye BOOLEAN NOT NULL DEFAULT FALSE,
      best_of INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      version INTEGER NOT NULL DEFAULT 1
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS match_tournament_id_idx ON cs_arena.matches(tournament_id);`;
  await sql`CREATE INDEX IF NOT EXISTS match_round_id_idx ON cs_arena.matches(round_id);`;

  // 10. Mapas da Partida
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.match_maps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES cs_arena.matches(id) ON DELETE CASCADE,
      order_number INTEGER NOT NULL,
      map_name TEXT NOT NULL,
      score_a INTEGER NOT NULL DEFAULT 0,
      score_b INTEGER NOT NULL DEFAULT 0,
      winner_id UUID REFERENCES cs_arena.teams(id) ON DELETE SET NULL,
      CONSTRAINT match_map_order_unique UNIQUE (match_id, order_number)
    );
  `;

  // 11. Sorteios / Roletas
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.draws (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id UUID NOT NULL REFERENCES cs_arena.tournaments(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      algorithm TEXT NOT NULL DEFAULT 'random',
      options JSONB,
      performed_by UUID REFERENCES cs_arena.users(id) ON DELETE SET NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      idempotency_key TEXT NOT NULL UNIQUE,
      audit_hash TEXT,
      metadata JSONB
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS draw_tournament_id_idx ON cs_arena.draws(tournament_id);`;

  // 12. Resultados de Sorteio
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.draw_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      draw_id UUID NOT NULL REFERENCES cs_arena.draws(id) ON DELETE CASCADE,
      player_id UUID REFERENCES cs_arena.players(id) ON DELETE CASCADE,
      team_id UUID REFERENCES cs_arena.teams(id) ON DELETE CASCADE,
      bracket_position INTEGER,
      selection_order INTEGER NOT NULL,
      metadata JSONB
    );
  `;

  // 13. Logs de Auditoria
  await sql`
    CREATE TABLE IF NOT EXISTS cs_arena.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID,
      actor_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_state JSONB,
      after_state JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS audit_created_idx ON cs_arena.audit_logs(created_at);`;
  await sql`CREATE INDEX IF NOT EXISTS audit_entity_idx ON cs_arena.audit_logs(entity_type, entity_id);`;

  console.log('✅ Todas as tabelas, índices e constraints no schema cs_arena foram criadas com sucesso!');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erro na migração:', err);
      process.exit(1);
    });
}
