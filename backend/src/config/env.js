import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_OAUTH_TEST_USERS: z.string().optional().default(''),
  AI_ENABLED: z.preprocess((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    }
    return value;
  }, z.boolean().default(true)),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.preprocess((value) => {
    if (typeof value === 'string') return value.trim();
    return value;
  }, z.string().min(1).default('claude-sonnet-4-20250514')),
  ANTHROPIC_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  AI_RATE_LIMIT_ENABLED: z.preprocess((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    }
    return value;
  }, z.boolean().default(true)),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(6)
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variabili ambiente non valide:', parsed.error.flatten().fieldErrors);
  throw new Error('Configurazione ambiente non valida');
}

export const env = parsed.data;
