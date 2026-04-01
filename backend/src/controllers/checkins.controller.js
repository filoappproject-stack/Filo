import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { getLatestCheckin, upsertDailyCheckin } from '../services/checkins.service.js';

const UpsertCheckinSchema = z.object({
  userId: z.string().uuid(),
  checkinDate: z.string().date(),
  energyLevel: z.coerce.number().int().min(1).max(5),
  stressLevel: z.coerce.number().int().min(1).max(5),
  sleepQuality: z.enum(['poor', 'fair', 'good', 'excellent'])
});

const LatestQuerySchema = z.object({
  userId: z.string().uuid()
});

export async function putDailyCheckin(req, res) {
  const parsed = UpsertCheckinSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload check-in non valido');
  }

  const checkin = await upsertDailyCheckin(parsed.data);
  res.status(201).json({ data: checkin });
}

export async function getLastCheckin(req, res) {
  const parsed = LatestQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Parametro userId non valido');
  }

  const checkin = await getLatestCheckin(parsed.data.userId);
  res.json({ data: checkin });
}
