import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL
});

export async function query(text, params) {
  return pool.query(text, params);
}
