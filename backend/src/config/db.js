import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;
const hasLocalDbHost = /localhost|127\.0\.0\.1/i.test(env.DATABASE_URL);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: hasLocalDbHost ? undefined : { rejectUnauthorized: false }
});

export async function query(text, params) {
  return pool.query(text, params);
}
