import { query } from '../config/db.js';

let notesSchemaReady = false;

function resolveInternalUserEmail(userId) {
  return `user-${userId}@filo.local`;
}

async function ensureNotesSchema() {
  if (notesSchemaReady) return;

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
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      tags TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC)');

  notesSchemaReady = true;
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

export async function listNotes(userId) {
  await ensureNotesSchema();
  const sql = `
    SELECT id, user_id, title, body, tags, created_at, updated_at
    FROM notes
    WHERE user_id = $1
    ORDER BY updated_at DESC, created_at DESC
  `;
  const { rows } = await query(sql, [userId]);
  return rows;
}

export async function createNote(input) {
  await ensureNotesSchema();
  await ensureUserExists(input.userId);
  const sql = `
    INSERT INTO notes (user_id, title, body, tags)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, title, body, tags, created_at, updated_at
  `;
  const { rows } = await query(sql, [input.userId, input.title, input.body, input.tags]);
  return rows[0];
}

export async function updateNote(noteId, input) {
  await ensureNotesSchema();
  const sql = `
    UPDATE notes
    SET title = $3, body = $4, tags = $5, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, body, tags, created_at, updated_at
  `;
  const { rows } = await query(sql, [noteId, input.userId, input.title, input.body, input.tags]);
  return rows[0] ?? null;
}

export async function deleteNote(noteId, userId) {
  await ensureNotesSchema();
  const sql = `
    DELETE FROM notes
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const { rows } = await query(sql, [noteId, userId]);
  return rows[0] ?? null;
}
