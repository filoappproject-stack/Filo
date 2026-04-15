import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const tokenCache = new Map();
const CACHE_TTL_MS = 60_000;

function getBearerToken(req) {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== 'string') return null;
  const [scheme, token] = raw.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function resolveIssuerAuthBaseUrl(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const issuer = payload?.iss;
  if (!issuer || typeof issuer !== 'string') return null;

  try {
    const parsed = new URL(issuer);
    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.endsWith('.supabase.co')) return null;
    const normalized = issuer.replace(/\/$/, '');
    return normalized.endsWith('/auth/v1') ? normalized : `${normalized}/auth/v1`;
  } catch {
    return null;
  }
}

function resolveSupabaseAuthBaseUrls(accessToken) {
  const out = [];
  if (env.SUPABASE_URL) {
    out.push(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`);
  }
  const issuerBase = resolveIssuerAuthBaseUrl(accessToken);
  if (issuerBase) {
    out.push(issuerBase);
  }
  return Array.from(new Set(out));
}

async function fetchSupabaseUser(accessToken) {
  const authBaseUrls = resolveSupabaseAuthBaseUrls(accessToken);
  if (!authBaseUrls.length) {
    throw new HttpError(500, 'Auth backend non configurata (SUPABASE_URL mancante e issuer token non valido)');
  }

  const now = Date.now();
  const cached = tokenCache.get(accessToken);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const requestUser = async (authBaseUrl, headers) => fetch(`${authBaseUrl}/user`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    let lastResponse = null;
    for (const authBaseUrl of authBaseUrls) {
      // 1) Tentativo con apikey (se presente)
      let response = await requestUser(authBaseUrl, {
        Authorization: `Bearer ${accessToken}`,
        ...(env.SUPABASE_ANON_KEY ? { apikey: env.SUPABASE_ANON_KEY } : {})
      });
      lastResponse = response;
      if (response.ok) {
        const user = await response.json();
        if (!user?.id) throw new HttpError(401, 'Utente non autenticato');
        tokenCache.set(accessToken, { user, expiresAt: now + CACHE_TTL_MS });
        return user;
      }

      // 2) Fallback con solo bearer (apikey non allineata o non necessaria)
      response = await requestUser(authBaseUrl, {
        Authorization: `Bearer ${accessToken}`
      });
      lastResponse = response;
      if (response.ok) {
        const user = await response.json();
        if (!user?.id) throw new HttpError(401, 'Utente non autenticato');
        tokenCache.set(accessToken, { user, expiresAt: now + CACHE_TTL_MS });
        return user;
      }
    }

    if (!lastResponse?.ok) {
      throw new HttpError(401, 'Sessione non valida o scaduta');
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new HttpError(503, 'Timeout verifica autenticazione');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getProvidedUserId(req) {
  const fromBody = req.body && typeof req.body === 'object' ? req.body.userId : undefined;
  const fromQuery = req.query && typeof req.query === 'object' ? req.query.userId : undefined;
  return fromBody || fromQuery || null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new HttpError(401, 'Autenticazione richiesta');
    }

    const user = await fetchSupabaseUser(token);
    const userId = String(user.id);

    const providedUserId = getProvidedUserId(req);
    if (providedUserId && String(providedUserId) !== userId) {
      throw new HttpError(403, 'userId non coerente con la sessione autenticata');
    }

    req.auth = {
      userId,
      email: user.email || null,
      accessToken: token
    };

    next();
  } catch (error) {
    next(error);
  }
}
