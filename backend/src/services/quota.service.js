import crypto from 'crypto';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';

const BASE_DAILY_LIMIT = 3;
const BURST_DAILY_LIMIT = 5;
const COOLDOWN_MS = 20_000;

const usageByActor = new Map();

function getDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function resolveActorId(req, payload) {
  if (payload?.userId) return `user:${payload.userId}`;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded || req.ip || 'anonymous');
  return `ip:${String(ip).split(',')[0].trim() || 'anonymous'}`;
}

function buildActorKey(req, payload) {
  const actorId = resolveActorId(req, payload);
  return crypto.createHash('sha256').update(actorId).digest('hex');
}

function isBurstEligible(payload) {
  const agendaLen = (payload?.agenda || '').trim().length;
  const pendingLen = (payload?.pending || '').trim().length;
  return agendaLen >= 16 && pendingLen >= 16;
}

function allowedLimitFor(payload) {
  return isBurstEligible(payload) ? BURST_DAILY_LIMIT : BASE_DAILY_LIMIT;
}

function ensureActorUsage(actorKey, dayKey) {
  const current = usageByActor.get(actorKey);
  if (!current || current.dayKey !== dayKey) {
    const fresh = { dayKey, count: 0, lastRequestAt: 0 };
    usageByActor.set(actorKey, fresh);
    return fresh;
  }
  return current;
}

function consumeInMemory(actorKey, dayKey, allowedLimit, nowMs) {
  const usage = ensureActorUsage(actorKey, dayKey);
  const msSinceLast = nowMs - usage.lastRequestAt;

  if (usage.lastRequestAt && msSinceLast < COOLDOWN_MS) {
    const retryAfterMs = COOLDOWN_MS - msSinceLast;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return {
      ok: false,
      error: 'CooldownExceeded',
      limit: allowedLimit,
      used: usage.count,
      remaining: Math.max(allowedLimit - usage.count, 0),
      retryAfterSeconds,
      retryAt: new Date(nowMs + retryAfterMs).toISOString()
    };
  }

  if (usage.count >= allowedLimit) {
    return {
      ok: false,
      error: 'QuotaExceeded',
      limit: allowedLimit,
      used: usage.count,
      remaining: 0,
      retryAt: `${dayKey}T23:59:59.999Z`
    };
  }

  usage.count += 1;
  usage.lastRequestAt = nowMs;

  return {
    ok: true,
    limit: allowedLimit,
    used: usage.count,
    remaining: Math.max(allowedLimit - usage.count, 0),
    dayKey
  };
}

async function consumeInDatabase(actorKey, dayKey, allowedLimit, nowIso) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO ai_usage_limits (actor_key, day_key, used_count, last_request_at)
       VALUES ($1, $2::date, 0, TO_TIMESTAMP(0))
       ON CONFLICT (actor_key, day_key) DO NOTHING`,
      [actorKey, dayKey]
    );

    const selectRes = await client.query(
      `SELECT used_count, last_request_at
       FROM ai_usage_limits
       WHERE actor_key = $1 AND day_key = $2::date
       FOR UPDATE`,
      [actorKey, dayKey]
    );

    const row = selectRes.rows[0] || { used_count: 0, last_request_at: null };
    const used = Number(row.used_count || 0);
    const nowMs = Date.parse(nowIso);
    const lastRequestAtMs = row.last_request_at ? Date.parse(row.last_request_at) : 0;
    const msSinceLast = nowMs - lastRequestAtMs;

    if (lastRequestAtMs && msSinceLast < COOLDOWN_MS) {
      const retryAfterMs = COOLDOWN_MS - msSinceLast;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      await client.query('ROLLBACK');
      return {
        ok: false,
        error: 'CooldownExceeded',
        limit: allowedLimit,
        used,
        remaining: Math.max(allowedLimit - used, 0),
        retryAfterSeconds,
        retryAt: new Date(nowMs + retryAfterMs).toISOString()
      };
    }

    if (used >= allowedLimit) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        error: 'QuotaExceeded',
        limit: allowedLimit,
        used,
        remaining: 0,
        retryAt: `${dayKey}T23:59:59.999Z`
      };
    }

    const updateRes = await client.query(
      `UPDATE ai_usage_limits
       SET used_count = used_count + 1,
           last_request_at = $3::timestamptz,
           updated_at = NOW()
       WHERE actor_key = $1 AND day_key = $2::date
       RETURNING used_count`,
      [actorKey, dayKey, nowIso]
    );

    await client.query('COMMIT');

    const updatedUsed = Number(updateRes.rows[0]?.used_count || used + 1);
    return {
      ok: true,
      limit: allowedLimit,
      used: updatedUsed,
      remaining: Math.max(allowedLimit - updatedUsed, 0),
      dayKey
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function consumeAnalysisQuota(req, payload) {
  const now = new Date();
  const dayKey = getDayKey(now);
  const actorKey = buildActorKey(req, payload);
  const allowedLimit = allowedLimitFor(payload);

  if (!pool || !env.DATABASE_URL) {
    return consumeInMemory(actorKey, dayKey, allowedLimit, now.getTime());
  }

  try {
    return consumeInDatabase(actorKey, dayKey, allowedLimit, now.toISOString());
  } catch (error) {
    console.warn('Quota DB non disponibile, fallback in-memory attivato:', error?.message || error);
    return consumeInMemory(actorKey, dayKey, allowedLimit, now.getTime());
  }
}
