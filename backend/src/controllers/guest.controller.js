import { z } from 'zod';
import { analyzeGuestFirstFilo } from '../services/assistant.service.js';
import { consumeGuestFirstFiloQuota, refundGuestFirstFiloQuota } from '../services/quota.service.js';
import { HttpError } from '../utils/httpError.js';

const GuestFirstFiloSchema = z.object({
  raw: z.string().trim().min(12).max(5000),
  kind: z.string().trim().max(80).optional().default(''),
  source: z.string().trim().max(80).optional().default('')
});

export async function postGuestFirstFilo(req, res) {
  const parsed = GuestFirstFiloSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload primo Filo non valido');
  }

  const quota = await consumeGuestFirstFiloQuota(req);
  if (!quota.ok) {
    return res.status(429).json({
      error: quota.error === 'CooldownExceeded' ? 'CooldownExceeded' : 'QuotaExceeded',
      message: quota.error === 'CooldownExceeded'
        ? 'Attendi qualche secondo prima di generare un altro Filo.'
        : 'Hai usato le prove gratuite di oggi. Crea un account per continuare.',
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
      retryAfterSeconds: quota.retryAfterSeconds,
      retryAt: quota.retryAt
    });
  }

  try {
    const result = await analyzeGuestFirstFilo(parsed.data);
    if (!result) {
      await refundGuestFirstFiloQuota(req);
      return res.json({
        data: {
          source: 'local-fallback',
          degraded: true,
          quota,
          result: null
        }
      });
    }

    return res.json({
      data: {
        source: 'ai',
        degraded: false,
        quota,
        result
      }
    });
  } catch (error) {
    await refundGuestFirstFiloQuota(req).catch((refundError) => {
      console.warn('Rimborso quota guest fallito:', refundError?.message || refundError);
    });
    console.warn('[guest.first_filo.degraded]', error?.message || error);
    return res.json({
      data: {
        source: 'local-fallback',
        degraded: true,
        quota: null,
        result: null
      },
      message: 'Generazione IA temporaneamente non disponibile: uso fallback locale.'
    });
  }
}
