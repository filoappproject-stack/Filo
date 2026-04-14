import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { analyzeDay } from '../services/assistant.service.js';

const AnalyzeDaySchema = z.object({
  agenda: z.string().trim().max(5000).optional().default(''),
  pending: z.string().trim().max(5000).optional().default(''),
  dayEnd: z.string().trim().max(50).optional().default(''),
  availability: z.string().trim().max(100).optional().default(''),
  dayFocus: z.string().trim().max(500).optional().default(''),
  memoryContext: z.string().trim().max(4000).optional().default(''),
  energy: z.coerce.number().min(1).max(5).optional().nullable(),
  stress: z.coerce.number().min(1).max(5).optional().nullable()
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

  const suggerimenti = await analyzeDay(data);
  res.json({ data: { suggerimenti } });
}
