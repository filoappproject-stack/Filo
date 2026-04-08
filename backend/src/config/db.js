import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;
const hasDatabaseUrl = Boolean(env.DATABASE_URL);
const hasLocalDbHost = hasDatabaseUrl ? /localhost|127\.0\.0\.1/i.test(env.DATABASE_URL) : false;

export const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: env.DATABASE_URL,
      ssl: hasLocalDbHost ? undefined : { rejectUnauthorized: false }
    })
  : null;

export async function query(text, params) {
  if (!pool) {
    throw new Error('DATABASE_URL non configurato');
  }
  return pool.query(text, params);
}
