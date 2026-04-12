import { query } from '../config/db.js';

function resolveInternalUserEmail(userId) {
  return `user-${userId}@filo.local`;
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

export async function upsertDailyCheckin(input) {
  await ensureUserExists(input.userId);
  const sql = `
    INSERT INTO daily_checkins (user_id, checkin_date, energy_level, stress_level, sleep_quality)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, checkin_date)
    DO UPDATE SET
      energy_level = EXCLUDED.energy_level,
      stress_level = EXCLUDED.stress_level,
      sleep_quality = EXCLUDED.sleep_quality,
      updated_at = NOW()
    RETURNING id, user_id, checkin_date, energy_level, stress_level, sleep_quality, created_at, updated_at
  `;

  const { rows } = await query(sql, [
    input.userId,
    input.checkinDate,
    input.energyLevel,
    input.stressLevel,
    input.sleepQuality
  ]);

  return rows[0];
}

export async function getLatestCheckin(userId) {
  const sql = `
    SELECT id, user_id, checkin_date, energy_level, stress_level, sleep_quality, created_at, updated_at
    FROM daily_checkins
    WHERE user_id = $1
    ORDER BY checkin_date DESC
    LIMIT 1
  `;

  const { rows } = await query(sql, [userId]);
  return rows[0] ?? null;
}
