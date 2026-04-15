import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { analyzeDay } from '../services/assistant.service.js';

const AnalyzeDaySchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  agenda: z.string().trim().max(5000).optional().default(''),
  pending: z.string().trim().max(5000).optional().default(''),
  dayEnd: z.string().trim().max(50).optional().default(''),
  availability: z.string().trim().max(100).optional().default(''),
  dayFocus: z.string().trim().max(500).optional().default(''),
  memoryContext: z.string().trim().max(4000).optional().default(''),
  energy: z.coerce.number().min(1).max(5).optional().nullable(),
  stress: z.coerce.number().min(1).max(5).optional().nullable()
});

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

function isBurstEligible(payload) {
  const agendaLen = (payload?.agenda || '').trim().length;
  const pendingLen = (payload?.pending || '').trim().length;
  return agendaLen >= 16 && pendingLen >= 16;
}

function ensureActorUsage(actorId, dayKey) {
  const current = usageByActor.get(actorId);
  if (!current || current.dayKey !== dayKey) {
    const fresh = { dayKey, count: 0, lastRequestAt: 0 };
    usageByActor.set(actorId, fresh);
    return fresh;
  }
  return current;
}

export async function postDayAnalysis(req, res) {
  const parsed = AnalyzeDaySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload analisi giornata non valido');
  }

  const data = parsed.data;
  if (!data.agenda && !data.pending) {
    throw new HttpError(400, 'Inserisci almeno agenda o sospesi');
  }

  const now = Date.now();
  const dayKey = getDayKey(new Date(now));
  const actorId = resolveActorId(req, data);
  const usage = ensureActorUsage(actorId, dayKey);
  const allowedLimit = isBurstEligible(data) ? BURST_DAILY_LIMIT : BASE_DAILY_LIMIT;

  const msSinceLast = now - usage.lastRequestAt;
  if (usage.lastRequestAt && msSinceLast < COOLDOWN_MS) {
    const retryAfterMs = COOLDOWN_MS - msSinceLast;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return res.status(429).json({
      error: 'CooldownExceeded',
      message: 'Attendi qualche secondo prima di una nuova analisi.',
      limit: allowedLimit,
      used: usage.count,
      remaining: Math.max(allowedLimit - usage.count, 0),
      retryAfterSeconds,
      retryAt: new Date(now + retryAfterMs).toISOString()
    });
  }

  if (usage.count >= allowedLimit) {
    const retryAt = `${dayKey}T23:59:59.999Z`;
    return res.status(429).json({
      error: 'QuotaExceeded',
      message: 'Hai raggiunto il limite giornaliero di analisi.',
      limit: allowedLimit,
      used: usage.count,
      remaining: 0,
      retryAt
    });
  }

  const suggerimenti = await analyzeDay(data);
  usage.count += 1;
  usage.lastRequestAt = now;

  res.json({
    data: {
      suggerimenti,
      quota: {
        limit: allowedLimit,
        used: usage.count,
        remaining: Math.max(allowedLimit - usage.count, 0),
        dayKey
      }
    }
  });
}
