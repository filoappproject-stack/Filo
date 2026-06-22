import { query } from '../config/db.js';

let suggestionStatesSchemaReady = false;

function resolveInternalUserEmail(userId) {
  return `user-${userId}@filo.local`;
}

async function ensureSuggestionStatesSchema() {
  if (suggestionStatesSchemaReady) return;

  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS suggestion_states (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_key DATE NOT NULL,
      suggestion_key TEXT NOT NULL,
      suggestion_title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('added', 'completed', 'dismissed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, day_key, suggestion_key)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_suggestion_states_user_day ON suggestion_states(user_id, day_key)');

  suggestionStatesSchemaReady = true;
}

async function ensureUserExists(userId) {
  const sql = `
    INSERT INTO users (id, email)
    VALUES ($1, $2)
    ON CONFLICT (id)
    DO NOTHING
  `;
  await query(sql, [userId, resolveInternalUserEmail(userId)]);
}

export async function listSuggestionStates(userId, dayKey) {
  await ensureSuggestionStatesSchema();
  const sql = `
    SELECT id, user_id, day_key, suggestion_key, suggestion_title, status, created_at, updated_at
    FROM suggestion_states
    WHERE user_id = $1 AND day_key = $2::date
    ORDER BY updated_at DESC
  `;
  const { rows } = await query(sql, [userId, dayKey]);
  return rows;
}

export async function upsertSuggestionState(input) {
  await ensureSuggestionStatesSchema();
  await ensureUserExists(input.userId);

  const sql = `
    INSERT INTO suggestion_states (user_id, day_key, suggestion_key, suggestion_title, status)
    VALUES ($1, $2::date, $3, $4, $5)
    ON CONFLICT (user_id, day_key, suggestion_key)
    DO UPDATE SET
      suggestion_title = EXCLUDED.suggestion_title,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id, user_id, day_key, suggestion_key, suggestion_title, status, created_at, updated_at
  `;
  const values = [
    input.userId,
    input.dayKey,
    input.suggestionKey,
    input.suggestionTitle,
    input.status
  ];

  const { rows } = await query(sql, values);
  return rows[0];
}
