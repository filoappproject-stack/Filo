import { z } from 'zod';
import { suggestSmartSlots } from '../services/scheduling.service.js';
import { HttpError } from '../utils/httpError.js';

const SmartSlotSchema = z.object({
  userId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  task: z
    .object({
      title: z.string().max(200).optional(),
      label: z.string().max(200).optional(),
      energyCost: z.coerce.number().int().min(1).max(5).optional(),
      stressImpact: z.coerce.number().int().min(1).max(5).optional()
    })
    .optional(),
  durationMinutes: z.coerce.number().int().min(15).max(180).default(45),
  date: z.string().date().optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  workStartHour: z.coerce.number().int().min(0).max(23).optional(),
  workEndHour: z.coerce.number().int().min(1).max(24).optional()
});

export async function postSmartSlotSuggestion(req, res) {
  const parsed = SmartSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload Smart Slot Suggestion non valido');
  }

  const result = await suggestSmartSlots(parsed.data);
  res.json({ data: result });
}
