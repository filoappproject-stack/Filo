import { env } from '../config/env.js';

export function healthCheck(req, res) {
  res.json({
    status: 'ok',
    service: 'filo-backend',
    timestamp: new Date().toISOString(),
    ai: {
      enabled: env.AI_ENABLED,
      hasAnthropicKey: Boolean(env.ANTHROPIC_API_KEY),
      model: env.ANTHROPIC_MODEL
    }
  });
}
