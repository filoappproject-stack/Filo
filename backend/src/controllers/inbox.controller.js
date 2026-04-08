import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import {
  buildGoogleAuthUrl,
  exchangeGoogleCodeAndSync,
  listInboxMessages,
  syncGoogleInbox
} from '../services/inbox.service.js';

const ConnectSchema = z.object({
  userId: z.string().uuid(),
  redirectUri: z.string().url(),
  state: z.string().min(8).max(500).optional()
});

const ExchangeSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().min(10),
  redirectUri: z.string().url()
});

const SyncSchema = z.object({
  userId: z.string().uuid()
});

const MessagesQuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});
const SyncSchema = z.object({
  userId: z.string().uuid()
});

export async function getGoogleConnectUrl(req, res) {
  const source = req.method === 'GET' ? req.query : req.body;
  const parsed = ConnectSchema.safeParse(source);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload connect inbox non valido');
  }

  const authUrl = buildGoogleAuthUrl(parsed.data);
  res.json({ data: { authUrl } });
}

export async function postGoogleCodeExchange(req, res) {
  const parsed = ExchangeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload exchange code non valido');
  }

  const result = await exchangeGoogleCodeAndSync(parsed.data);
  res.status(201).json({ data: result });
}

export async function postGoogleSync(req, res) {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload sync inbox non valido');
  }

  const result = await syncGoogleInbox(parsed.data.userId);
  res.json({ data: result });
}

export async function getInboxMessages(req, res) {
  const parsed = MessagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Query inbox non valida');
  }

  const messages = await listInboxMessages(parsed.data.userId, parsed.data.limit);
  res.set('Cache-Control', 'no-store');
  res.json({ data: messages });
}

export async function postInboxSync(req, res) {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload sync inbox non valido');
  }

  const result = await syncInboxForUser(parsed.data.userId);
  res.set('Cache-Control', 'no-store');
  res.json({ data: result });
}
