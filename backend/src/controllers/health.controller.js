import { query } from '../config/db.js';
import { env } from '../config/env.js';

async function getQuotaHealth() {
  if (!env.DATABASE_URL) {
    return {
      dbConfigured: false,
      aiUsageTableExists: false,
      checkError: 'DATABASE_URL non configurato'
    };
  }

  try {
    const tableCheck = await query(
      `select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'ai_usage_limits'
      ) as exists`
    );

    return {
      dbConfigured: true,
      aiUsageTableExists: Boolean(tableCheck.rows?.[0]?.exists),
      checkError: null
    };
  } catch (error) {
    return {
      dbConfigured: true,
      aiUsageTableExists: false,
      checkError: error?.message || 'DB health check fallita'
    };
  }
}

export async function healthCheck(req, res) {
  const quota = await getQuotaHealth();

  res.json({
    status: 'ok',
    service: 'filo-backend',
    timestamp: new Date().toISOString(),
    ai: {
      enabled: env.AI_ENABLED,
      hasAnthropicKey: Boolean(env.ANTHROPIC_API_KEY),
      model: env.ANTHROPIC_MODEL
    },
    quota
  });
}
