import crypto from 'crypto';
import { env } from '../config/env.js';

const buckets = new Map();

function nowMs() {
  return Date.now();
}

function resolveActorKey(req) {
  const userId = req.body?.userId;
  if (userId) return `user:${userId}`;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded || req.ip || 'anonymous');
  return `ip:${String(ip).split(',')[0].trim() || 'anonymous'}`;
}

function hashActor(actorKey) {
  return crypto.createHash('sha256').update(actorKey).digest('hex');
}

function cleanupBucketIfExpired(key, bucket, now) {
  if (!bucket) return;
  if (now >= bucket.resetAtMs) buckets.delete(key);
}

export function assistantRateLimit(req, res, next) {
  if (!env.AI_RATE_LIMIT_ENABLED) return next();

  const windowMs = env.AI_RATE_LIMIT_WINDOW_MS;
  const maxRequests = env.AI_RATE_LIMIT_MAX;
  const now = nowMs();
  const actorKey = hashActor(resolveActorKey(req));
  const bucketKey = `${req.path}:${actorKey}`;

  cleanupBucketIfExpired(bucketKey, buckets.get(bucketKey), now);

  let bucket = buckets.get(bucketKey);
  if (!bucket) {
    bucket = { count: 0, resetAtMs: now + windowMs };
    buckets.set(bucketKey, bucket);
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: 'RateLimitExceeded',
      message: 'Troppe richieste ravvicinate. Riprova tra poco.',
      retryAfterSeconds
    });
  }

  bucket.count += 1;
  return next();
}
