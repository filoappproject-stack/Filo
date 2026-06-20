import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import {
  buildGoogleAuthUrl,
  connectImapInboxAndSync,
  exchangeGoogleCodeAndSync,
  getInboxStatus,
  getGoogleInboxStatus,
  listInboxMessages,
  syncImapInbox,
  syncGoogleInbox
} from '../services/inbox.service.js';

const ConnectSchema = z.object({
  userId: z.string().uuid(),
  userEmail: z.string().email().optional(),
  redirectUri: z.string().url().optional(),
  state: z.string().min(8).max(500).optional()
});

const ExchangeSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().min(10),
  redirectUri: z.string().url().optional()
});

const MessagesQuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});
const SyncSchema = z.object({
  userId: z.string().uuid()
});

const ImapConnectSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(1).max(320).optional(),
  password: z.string().min(1).max(500),
  imapHost: z.string().min(3).max(255),
  imapPort: z.coerce.number().int().min(1).max(65535).default(993),
  imapSecure: z.boolean().default(true),
  imapMailbox: z.string().min(1).max(120).default('INBOX'),
  smtpHost: z.string().min(3).max(255),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
  smtpSecure: z.boolean().default(true)
});

function getAuthenticatedEmail(req) {
  const email = req.auth?.email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

export async function getGoogleConnectUrl(req, res) {
  const source = req.method === 'GET' ? req.query : req.body;
  const parsed = ConnectSchema.safeParse(source);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload connect inbox non valido');
  }

  const auth = buildGoogleAuthUrl({ ...parsed.data, authEmail: getAuthenticatedEmail(req) });
  res.json({ data: auth });
}

export async function postGoogleCodeExchange(req, res) {
  const parsed = ExchangeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload exchange code non valido');
  }

  const result = await exchangeGoogleCodeAndSync({ ...parsed.data, authEmail: getAuthenticatedEmail(req) });
  res.status(201).json({ data: result });
}

export async function postGoogleSync(req, res) {
  const parsed = z
    .object({
      userId: z.string().uuid()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload sync inbox non valido');
  }

  const result = await syncGoogleInbox(parsed.data.userId, getAuthenticatedEmail(req));
  res.json({ data: result });
}

export async function getInboxMessages(req, res) {
  const parsed = MessagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Query inbox non valida');
  }

  const messages = await listInboxMessages(parsed.data.userId, parsed.data.limit, getAuthenticatedEmail(req));
  res.set('Cache-Control', 'no-store');
  res.json({ data: messages });
}

export async function getGoogleInboxConnectionStatus(req, res) {
  const parsed = z
    .object({
      userId: z.string().uuid()
    })
    .safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Query stato inbox non valida');
  }

  const status = await getGoogleInboxStatus(parsed.data.userId, getAuthenticatedEmail(req));
  res.set('Cache-Control', 'no-store');
  res.json({ data: status });
}

export async function getInboxConnectionStatus(req, res) {
  const parsed = z
    .object({
      userId: z.string().uuid()
    })
    .safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Query stato inbox non valida');
  }

  const status = await getInboxStatus(parsed.data.userId, getAuthenticatedEmail(req));
  res.set('Cache-Control', 'no-store');
  res.json({ data: status });
}

export async function postImapConnect(req, res) {
  const parsed = ImapConnectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload account email non valido');
  }

  const result = await connectImapInboxAndSync(parsed.data);
  res.status(201).json({ data: result });
}

export async function postImapSync(req, res) {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload sync inbox non valido');
  }

  const result = await syncImapInbox(parsed.data.userId);
  res.json({ data: result });
}

export async function postInboxSync(req, res) {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload sync inbox non valido');
  }

  const result = await syncImapInbox(parsed.data.userId);
  res.set('Cache-Control', 'no-store');
  res.json({ data: result });
}
