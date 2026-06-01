import { z } from 'zod';
import { buildGoogleLoginAuthUrl, exchangeGoogleLoginCode } from '../services/auth.service.js';
import { HttpError } from '../utils/httpError.js';

const ConnectSchema = z.object({
  redirectUri: z.string().url(),
  state: z.string().min(8).max(500)
});

const ExchangeSchema = z.object({
  code: z.string().min(10),
  redirectUri: z.string().url()
});

export async function getGoogleLoginUrl(req, res) {
  const source = req.method === 'GET' ? req.query : req.body;
  const parsed = ConnectSchema.safeParse(source);
  if (!parsed.success) throw new HttpError(400, 'Payload login Google non valido');

  const auth = buildGoogleLoginAuthUrl(parsed.data);
  res.json({ data: auth });
}

export async function postGoogleLoginExchange(req, res) {
  const parsed = ExchangeSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Payload exchange login Google non valido');

  const result = await exchangeGoogleLoginCode(parsed.data);
  res.json({ data: result });
}
