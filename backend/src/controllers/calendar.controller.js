import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import {
  buildGoogleCalendarAuthUrl,
  exchangeGoogleCalendarCodeAndSync,
  getGoogleCalendarStatus,
  listCalendarEvents,
  syncGoogleCalendar
} from '../services/calendar.service.js';

const ConnectSchema = z.object({
  userId: z.string().uuid(),
  redirectUri: z.string().url().optional(),
  state: z.string().min(8).max(500).optional()
});

const ExchangeSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().min(10),
  redirectUri: z.string().url().optional()
});

const EventsQuerySchema = z.object({
  userId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(250).default(50)
});

const SyncSchema = z.object({
  userId: z.string().uuid()
});

export async function getGoogleCalendarConnectUrl(req, res) {
  const source = req.method === 'GET' ? req.query : req.body;
  const parsed = ConnectSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
      .join('; ');
    throw new HttpError(400, `Payload connect calendario non valido${details ? ` (${details})` : ''}`);
  }
  const auth = buildGoogleCalendarAuthUrl(parsed.data);
  res.json({ data: auth });
}

export async function postGoogleCalendarCodeExchange(req, res) {
  const parsed = ExchangeSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Payload exchange calendario non valido');
  const result = await exchangeGoogleCalendarCodeAndSync(parsed.data);
  res.status(201).json({ data: result });
}

export async function postGoogleCalendarSync(req, res) {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Payload sync calendario non valido');
  const result = await syncGoogleCalendar(parsed.data.userId);
  res.json({ data: result });
}

export async function getCalendarEvents(req, res) {
  const parsed = EventsQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'Query calendario non valida');
  const events = await listCalendarEvents(parsed.data.userId, parsed.data);
  res.set('Cache-Control', 'no-store');
  res.json({ data: events });
}

export async function getGoogleCalendarConnectionStatus(req, res) {
  const parsed = z
    .object({
      userId: z.string().uuid()
    })
    .safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'Query stato calendario non valida');
  const status = await getGoogleCalendarStatus(parsed.data.userId);
  res.set('Cache-Control', 'no-store');
  res.json({ data: status });
}
