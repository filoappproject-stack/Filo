import crypto from 'crypto';
import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { analyzeDay, buildFallbackSuggestions, getAiAttemptCounter } from '../services/assistant.service.js';
import { consumeAnalysisQuota } from '../services/quota.service.js';

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

function buildDiagnosticId() {
  return `asst_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}


function buildDegradedReason(failureStage, error) {
  const message = String(error?.message || '').toLowerCase();

  if (failureStage === 'quota') {
    return {
      code: 'quota-temporarily-unavailable',
      hint: 'Limiti analisi temporaneamente non verificabili: uso suggerimenti locali.'
    };
  }

  if (message.includes('anthropic') || message.includes('api key')) {
    return {
      code: 'ai-provider-unavailable',
      hint: 'Servizio AI temporaneamente non disponibile: uso suggerimenti locali.'
    };
  }

  return {
    code: 'analysis-temporarily-unavailable',
    hint: 'Analisi avanzata temporaneamente non disponibile: uso suggerimenti locali.'
  };
}
function logAssistantFailure(req, diagnosticId, error, data, failureStage) {
  const authUserId = req.auth?.userId || null;
  console.error('[assistant.day-analysis] failure', {
    diagnosticId,
    route: req.originalUrl,
    method: req.method,
    authUserId,
    payloadUserId: data?.userId || null,
    agendaLength: (data?.agenda || '').length,
    pendingLength: (data?.pending || '').length,
    dayFocusLength: (data?.dayFocus || '').length,
    failureStage,
    errorName: error?.name,
    errorMessage: error?.message
  });
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
    const suggerimenti = await analyzeDay(data);

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
