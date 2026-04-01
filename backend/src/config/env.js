import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000')
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variabili ambiente non valide:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
