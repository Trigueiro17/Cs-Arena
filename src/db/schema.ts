import { pgSchema, text, timestamp, integer, boolean, uuid, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Isolated PostgreSQL Schema for CS Arena
export const csSchema = pgSchema('cs_arena');

// Users (Admins, Organizers, Players)
export const users = csSchema.table('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  nickname: text('nickname'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['ADMIN', 'ORGANIZER', 'PLAYER'] }).default('PLAYER').notNull(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Auth Sessions (Revocable Sessions & Refresh Token Rotation with Family Reuse Detection)
export const authSessions = csSchema.table('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  familyId: uuid('family_id').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionUserIdx: index('auth_session_user_idx').on(table.userId),
  sessionFamilyIdx: index('auth_session_family_idx').on(table.familyId),
  sessionTokenHashIdx: index('auth_session_token_hash_idx').on(table.refreshTokenHash),
}));

// Auth Audit Logs
export const authAuditLogs = csSchema.table('auth_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  auditUserIdx: index('auth_audit_user_idx').on(table.userId),
  auditActionIdx: index('auth_audit_action_idx').on(table.action),
  auditCreatedIdx: index('auth_audit_created_idx').on(table.createdAt),
}));

// Serverless Rate Limits Table
export const rateLimits = csSchema.table('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').default(1).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// Password Reset Tokens
export const passwordResetTokens = csSchema.table('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  resetTokenHashIdx: index('pw_reset_token_hash_idx').on(table.tokenHash),
}));

// Players (can register for tournaments)
export const players = csSchema.table('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  nickname: text('nickname').notNull().unique(),
  steamId: text('steam_id'),
  avatarUrl: text('avatar_url'),
  preferredRole: text('preferred_role', { enum: ['AWP', 'Entry', 'Support', 'IGL', 'Flex'] }).default('Flex').notNull(),
  skillRating: integer('skill_rating').default(1000).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tournaments
export const tournaments = csSchema.table('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  gameMode: text('game_mode', { enum: ['1v1', '2v2', '3v3', '4v4', '5v5'] }).default('5v5').notNull(),
  format: text('format').default('single_elimination').notNull(),
  teamSize: integer('team_size').default(5).notNull(),
  bestOf: integer('best_of').default(1).notNull(),
  thirdPlaceEnabled: boolean('third_place_enabled').default(false).notNull(),
  mapSelection: text('map_selection').default('admin').notNull(),
  maxPlayers: integer('max_players'),
  status: text('status', {
    enum: ['draft', 'registration_open', 'registration_closed', 'drawing', 'in_progress', 'completed', 'cancelled']
  }).default('draft').notNull(),
  rules: text('rules'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Registrations
export const registrations = csSchema.table('registrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
  status: text('status', {
    enum: ['registered', 'confirmed', 'reserve', 'withdrawn']
  }).default('registered').notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tournamentPlayerIdx: uniqueIndex('tournament_player_unique_idx').on(table.tournamentId, table.playerId),
  tournamentIdIdx: index('reg_tournament_id_idx').on(table.tournamentId),
}));

// Teams in a tournament
export const teams = csSchema.table('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  captainId: uuid('captain_id').references(() => players.id, { onDelete: 'set null' }),
  seed: integer('seed'),
  status: text('status', {
    enum: ['active', 'eliminated', 'champion', 'runner_up']
  }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tournamentTeamIdx: index('team_tournament_id_idx').on(table.tournamentId),
}));

// Team Members - A player can belong to only one team per tournament
export const teamMembers = csSchema.table('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  isCaptain: boolean('is_captain').default(false).notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tournamentPlayerUniqueIdx: uniqueIndex('team_members_tournament_player_unique_idx').on(table.tournamentId, table.playerId),
  teamIdIdx: index('team_members_team_id_idx').on(table.teamId),
}));

// Bracket Rounds
export const bracketRounds = csSchema.table('bracket_rounds', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  roundNumber: integer('round_number').notNull(),
  name: text('name').notNull(),
}, (table) => ({
  roundTournamentIdx: index('bracket_round_tournament_idx').on(table.tournamentId),
}));

// Bracket Matches
export const matches = csSchema.table('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  roundId: uuid('round_id').references(() => bracketRounds.id, { onDelete: 'cascade' }).notNull(),
  bracketPosition: integer('bracket_position').notNull(),
  teamAId: uuid('team_a_id').references(() => teams.id, { onDelete: 'set null' }),
  teamBId: uuid('team_b_id').references(() => teams.id, { onDelete: 'set null' }),
  playerAId: uuid('player_a_id').references(() => players.id, { onDelete: 'set null' }),
  playerBId: uuid('player_b_id').references(() => players.id, { onDelete: 'set null' }),
  nextMatchId: uuid('next_match_id'),
  nextMatchSlot: text('next_match_slot', { enum: ['team_a', 'team_b'] }),
  winnerId: uuid('winner_id').references(() => teams.id, { onDelete: 'set null' }),
  winnerPlayerId: uuid('winner_player_id').references(() => players.id, { onDelete: 'set null' }),
  isBye: boolean('is_bye').default(false).notNull(),
  bestOf: integer('best_of').default(1).notNull(),
  mapName: text('map_name'),
  evidenceUrl: text('evidence_url'),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'cancelled']
  }).default('pending').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
}, (table) => ({
  matchTournamentIdx: index('match_tournament_id_idx').on(table.tournamentId),
  matchRoundIdx: index('match_round_id_idx').on(table.roundId),
  matchPlayerAIdx: index('match_player_a_idx').on(table.playerAId),
  matchPlayerBIdx: index('match_player_b_idx').on(table.playerBId),
}));

// Match Maps
export const matchMaps = csSchema.table('match_maps', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  orderNumber: integer('order_number').notNull(),
  mapName: text('map_name').notNull(),
  scoreA: integer('score_a').default(0).notNull(),
  scoreB: integer('score_b').default(0).notNull(),
  winnerId: uuid('winner_id').references(() => teams.id, { onDelete: 'set null' }),
  winnerPlayerId: uuid('winner_player_id').references(() => players.id, { onDelete: 'set null' }),
}, (table) => ({
  matchMapOrderUniqueIdx: uniqueIndex('match_map_order_unique_idx').on(table.matchId, table.orderNumber),
}));

// Draws
export const draws = csSchema.table('draws', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  type: text('type', { enum: ['teams', 'bracket'] }).notNull(),
  status: text('status', { enum: ['completed', 'cancelled'] }).default('completed').notNull(),
  algorithm: text('algorithm', { enum: ['random', 'balanced', 'captains'] }).default('random').notNull(),
  options: jsonb('options').$type<Record<string, unknown>>(),
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  auditHash: text('audit_hash'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
}, (table) => ({
  drawTournamentIdx: index('draw_tournament_id_idx').on(table.tournamentId),
}));

// Draw Results
export const drawResults = csSchema.table('draw_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  drawId: uuid('draw_id').references(() => draws.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  bracketPosition: integer('bracket_position'),
  selectionOrder: integer('selection_order').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
});

// Audit Logs
export const auditLogs = csSchema.table('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id'),
  actorName: text('actor_name'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeState: jsonb('before_state').$type<Record<string, unknown> | null>(),
  afterState: jsonb('after_state').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  auditCreatedIdx: index('audit_created_idx').on(table.createdAt),
  auditEntityIdx: index('audit_entity_idx').on(table.entityType, table.entityId),
}));

// Relations
export const tournamentsRelations = relations(tournaments, ({ many, one }) => ({
  creator: one(users, { fields: [tournaments.createdBy], references: [users.id] }),
  registrations: many(registrations),
  teams: many(teams),
  bracketRounds: many(bracketRounds),
  matches: many(matches),
  draws: many(draws),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  tournament: one(tournaments, { fields: [registrations.tournamentId], references: [tournaments.id] }),
  player: one(players, { fields: [registrations.playerId], references: [players.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [teams.tournamentId], references: [tournaments.id] }),
  captain: one(players, { fields: [teams.captainId], references: [players.id] }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  player: one(players, { fields: [teamMembers.playerId], references: [players.id] }),
  tournament: one(tournaments, { fields: [teamMembers.tournamentId], references: [tournaments.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [matches.tournamentId], references: [tournaments.id] }),
  round: one(bracketRounds, { fields: [matches.roundId], references: [bracketRounds.id] }),
  teamA: one(teams, { fields: [matches.teamAId], references: [teams.id] }),
  teamB: one(teams, { fields: [matches.teamBId], references: [teams.id] }),
  playerA: one(players, { fields: [matches.playerAId], references: [players.id] }),
  playerB: one(players, { fields: [matches.playerBId], references: [players.id] }),
  winner: one(teams, { fields: [matches.winnerId], references: [teams.id] }),
  winnerPlayer: one(players, { fields: [matches.winnerPlayerId], references: [players.id] }),
  maps: many(matchMaps),
}));

export const matchMapsRelations = relations(matchMaps, ({ one }) => ({
  match: one(matches, { fields: [matchMaps.matchId], references: [matches.id] }),
  winner: one(teams, { fields: [matchMaps.winnerId], references: [teams.id] }),
  winnerPlayer: one(players, { fields: [matchMaps.winnerPlayerId], references: [players.id] }),
}));

export const drawsRelations = relations(draws, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [draws.tournamentId], references: [tournaments.id] }),
  results: many(drawResults),
  performer: one(users, { fields: [draws.performedBy], references: [users.id] }),
}));
