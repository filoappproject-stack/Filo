import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_LOGIN_SCOPE = 'openid email profile';

function getGoogleLoginClientConfig() {
  const clientId = env.GOOGLE_LOGIN_CLIENT_ID || env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_LOGIN_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HttpError(500, 'Config Google login mancante');
  }
  return { clientId, clientSecret };
}

function encodeStatePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeStatePayload(state) {
  try {
    const decoded = JSON.parse(Buffer.from(String(state || ''), 'base64url').toString('utf8'));
    if (!decoded || typeof decoded !== 'object') return null;
    return decoded;
  } catch (_) {
    return null;
  }
}

export function getGoogleLoginCallbackRedirectUri(appRedirectUri) {
  if (!appRedirectUri) throw new HttpError(400, 'Redirect URI app mancante');
  return new URL('/api/v1/auth/google/callback', appRedirectUri).toString();
}

export function buildGoogleLoginAuthUrl({ redirectUri, state }) {
  const { clientId } = getGoogleLoginClientConfig();
  if (!redirectUri) throw new HttpError(400, 'Redirect URI Google mancante');

  const callbackRedirectUri = getGoogleLoginCallbackRedirectUri(redirectUri);
  const callbackState = encodeStatePayload({ appRedirectUri: redirectUri, appState: state });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackRedirectUri,
    response_type: 'code',
    scope: GOOGLE_LOGIN_SCOPE,
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state: callbackState
  });

  return {
    authUrl: `${GOOGLE_AUTH_BASE}?${params.toString()}`,
    redirectUri: callbackRedirectUri
  };
}

export async function exchangeGoogleLoginCode({ code, redirectUri }) {
  const { clientId, clientSecret } = getGoogleLoginClientConfig();
  if (!redirectUri) throw new HttpError(400, 'Redirect URI Google mancante');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.error_description || payload?.error || `HTTP ${response.status}`;
    throw new HttpError(401, `Login Google non completato: ${details}`);
  }

  if (!payload.id_token) {
    throw new HttpError(502, 'Google non ha restituito un ID token valido');
  }

  return {
    idToken: payload.id_token,
    expiresIn: payload.expires_in ?? null
  };
}
