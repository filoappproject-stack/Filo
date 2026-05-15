import crypto from 'crypto';
import { z } from 'zod';
import { analyzeDay, buildFallbackSuggestions, getAiAttemptCounter } from '../services/assistant.service.js';
import { listCalendarEvents } from '../services/calendar.service.js';
import { consumeAnalysisQuota, getAnalysisQuotaStatus } from '../services/quota.service.js';
import { HttpError } from '../utils/httpError.js';

const AnalyzeDaySchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  agenda: z.string().trim().max(5000).optional().default(''),
  pending: z.string().trim().max(5000).optional().default(''),
  dayEnd: z.string().trim().max(50).optional().default(''),
  availability: z.string().trim().max(100).optional().default(''),
  dayFocus: z.string().trim().max(500).optional().default(''),
  inboxContext: z.string().trim().max(12000).optional().default(''),
  memoryContext: z.string().trim().max(4000).optional().default(''),
  userTimeZone: z.string().trim().max(80).optional().default('UTC'),
  calendarFrom: z.string().datetime().optional().nullable(),
  calendarTo: z.string().datetime().optional().nullable(),
  sleep: z.string().trim().max(80).optional().nullable(),
  energy: z.coerce.number().min(1).max(5).optional().nullable(),
  stress: z.coerce.number().min(1).max(5).optional().nullable()
});

const AnalyzeQuotaSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  agenda: z.string().trim().max(5000).optional().default(''),
  pending: z.string().trim().max(5000).optional().default('')
});

export async function postDayAnalysis(req, res) {
  const parsed = AnalyzeDaySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload analisi giornata non valido');
  }

  const data = parsed.data;
  if (!data.agenda && !data.pending) {
    throw new HttpError(400, 'Inserisci almeno agenda o sospesi');
  }

  let quota = null;
  let failureStage = 'quota';

  try {
    quota = await consumeAnalysisQuota(req, data);

    if (!quota.ok) {
      if (quota.error === 'CooldownExceeded') {
        return res.status(429).json({
          error: 'CooldownExceeded',
          message: 'Attendi qualche secondo prima di una nuova analisi.',
          limit: quota.limit,
          used: quota.used,
          remaining: quota.remaining,
          retryAfterSeconds: quota.retryAfterSeconds,
          retryAt: quota.retryAt
        });
      }

      return res.status(429).json({
        error: 'QuotaExceeded',
        message: 'Hai raggiunto il limite giornaliero di analisi.',
        limit: quota.limit,
        used: quota.used,
        remaining: quota.remaining,
        retryAt: quota.retryAt
      });
    }

    failureStage = 'analysis';
    const calendarContext = await buildCalendarContextForDayAnalysis(data.userId, {
      userTimeZone: data.userTimeZone,
      calendarFrom: data.calendarFrom,
      calendarTo: data.calendarTo
    });
    const suggerimenti = await analyzeDay({ ...data, calendarContext });

    return res.json({
      data: {
        suggerimenti,
        quota: {
          limit: quota.limit,
          used: quota.used,
          remaining: quota.remaining,
          dayKey: quota.dayKey
        },
        diagnostics: {
          aiAttemptCounter: getAiAttemptCounter()
        }
      }
    });
  } catch (error) {
    const diagnosticId = buildDiagnosticId();
    logAssistantFailure(req, diagnosticId, error, data, failureStage);

    const suggerimenti = buildFallbackSuggestions(data);
    const degradedReason = buildDegradedReason(failureStage, error);

    return res.status(200).json({
      data: {
        suggerimenti,
        quota: quota?.ok
          ? {
              limit: quota.limit,
              used: quota.used,
              remaining: quota.remaining,
              dayKey: quota.dayKey
            }
          : null,
        degraded: true,
        degradedStage: failureStage,
        degradedReason: degradedReason.code,
        degradedHint: degradedReason.hint,
        diagnosticId,
        source: 'local-fallback',
        diagnostics: {
          aiAttemptCounter: getAiAttemptCounter()
        }
      },
      message: 'Analisi AI temporaneamente non disponibile: mostrati suggerimenti locali.'
    });
  }
}

async function buildCalendarContextForDayAnalysis(userId, options = {}) {
  if (!userId) return '';

  try {
    const userTimeZone = options.userTimeZone || 'UTC';
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const defaultTo = new Date(new Date(defaultFrom).getTime() + (24 * 60 * 60 * 1000)).toISOString();
    const fromIso = normalizeIsoOrDefault(options.calendarFrom, defaultFrom);
    const toIso = normalizeIsoOrDefault(options.calendarTo, defaultTo);
    const events = await listCalendarEvents(userId, {
      from: fromIso,
      to: toIso,
      limit: 8
    });

    if (!Array.isArray(events) || !events.length) return '';

    const short = events
      .filter((event) => String(event?.status || '').toLowerCase() !== 'cancelled')
      .slice(0, 5)
      .map((event) => {
        const title = String(event?.title || 'Evento').trim();
        const startsAt = event?.starts_at ? new Date(event.starts_at) : null;
        const hhmm = startsAt && !Number.isNaN(startsAt.getTime())
          ? startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: userTimeZone })
          : 'orario da definire';
        return `${hhmm} · ${title}`;
      })
      .join('\n');

    return short.slice(0, 1200);
  } catch (error) {
    console.warn('Impossibile costruire contesto calendario per analisi:', error?.message || error);
    return '';
  }
}

function normalizeIsoOrDefault(value, fallbackIso) {
  if (!value) return fallbackIso;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return fallbackIso;
  return dt.toISOString();
}

export async function postDayAnalysisQuotaStatus(req, res) {
  const parsed = AnalyzeQuotaSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload quota analisi non valido');
  }

  const quota = await getAnalysisQuotaStatus(req, parsed.data);

  res.json({
    data: {
      quota
    }
  });
}

function buildDiagnosticId() {
  return crypto.randomUUID?.() || `diag_${Date.now()}`;
}

function buildDegradedReason(stage, error) {
  if (stage === 'quota') {
    const detail = error?.message ? ` Dettaglio: ${error.message}` : '';
    return {
      code: 'QUOTA_SERVICE_UNAVAILABLE',
      hint: `Impossibile verificare quota in questo momento.${detail}`
    };
  }

  return {
    code: 'AI_PROVIDER_UNAVAILABLE',
    hint: error?.message || 'Errore temporaneo del provider AI.'
  };
}

function logAssistantFailure(req, diagnosticId, error, input, stage) {
  console.warn('[assistant.degraded]', {
    diagnosticId,
    stage,
    path: req.path,
    userId: input?.userId || null,
    message: error?.message || String(error)
  });
}
