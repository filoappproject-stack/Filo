import { z } from 'zod';
import { listSuggestionStates, upsertSuggestionState } from '../services/suggestionStates.service.js';
import { HttpError } from '../utils/httpError.js';

const DayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ListSuggestionStatesSchema = z.object({
  userId: z.string().uuid(),
  dayKey: DayKeySchema
});

const UpsertSuggestionStateSchema = z.object({
  userId: z.string().uuid(),
  dayKey: DayKeySchema,
  suggestionKey: z.string().trim().min(1).max(240),
  suggestionTitle: z.string().trim().min(1).max(240),
  status: z.enum(['added', 'completed', 'dismissed'])
});

export async function getSuggestionStates(req, res) {
  const parsed = ListSuggestionStatesSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Parametri stati suggerimenti non validi');
  }

  const states = await listSuggestionStates(parsed.data.userId, parsed.data.dayKey);
  res.json({ data: states });
}

export async function putSuggestionState(req, res) {
  const parsed = UpsertSuggestionStateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload stato suggerimento non valido');
  }

  const state = await upsertSuggestionState(parsed.data);
  res.json({ data: state });
}
