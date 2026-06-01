import { z } from 'zod';
import {
  buildGoogleLoginAuthUrl,
  decodeStatePayload,
  exchangeGoogleLoginCode,
  getGoogleLoginCallbackRedirectUri
} from '../services/auth.service.js';
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

export async function getGoogleLoginCallback(req, res) {
  const statePayload = decodeStatePayload(req.query.state);
  const appRedirectUri = statePayload?.appRedirectUri;
  const appState = statePayload?.appState;
  if (!appRedirectUri || !appState) {
    throw new HttpError(400, 'State login Google non valido');
  }

  const target = new URL(appRedirectUri);
  const hash = new URLSearchParams({ state: appState });

  if (req.query.error) {
    hash.set('error', String(req.query.error));
    if (req.query.error_description) hash.set('error_description', String(req.query.error_description));
    target.hash = hash.toString();
    return res.redirect(302, target.toString());
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    hash.set('error', 'missing_code');
    hash.set('error_description', 'Google non ha restituito il codice OAuth.');
    target.hash = hash.toString();
    return res.redirect(302, target.toString());
  }

  try {
    const callbackRedirectUri = getGoogleLoginCallbackRedirectUri(appRedirectUri);
    const result = await exchangeGoogleLoginCode({ code, redirectUri: callbackRedirectUri });
    hash.set('id_token', result.idToken);
    target.hash = hash.toString();
    return res.redirect(302, target.toString());
  } catch (error) {
    hash.set('error', 'exchange_failed');
    hash.set('error_description', error?.message || 'Exchange login Google fallito');
    target.hash = hash.toString();
    return res.redirect(302, target.toString());
  }
}
