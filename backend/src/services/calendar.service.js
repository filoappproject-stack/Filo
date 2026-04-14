import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
let calendarSchemaReady = false;

function requireGoogleOauthEnv() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(500, 'Config Google OAuth mancante');
  }
}

function resolveRedirectUri(redirectUri) {
  if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) throw new HttpError(400, 'Redirect URI Google mancante');
  return redirectUri;
}

export function buildGoogleCalendarAuthUrl({ userId, redirectUri, state }) {
  requireGoogleOauthEnv();
  const effectiveRedirectUri = resolveRedirectUri(redirectUri);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: effectiveRedirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: state ?? userId
  });

  return {
    authUrl: `${GOOGLE_AUTH_BASE}?${params.toString()}`,
    redirectUri: effectiveRedirectUri
  };
}

async function exchangeGoogleCode({ code, redirectUri }) {
  requireGoogleOauthEnv();
  const effectiveRedirectUri = resolveRedirectUri(redirectUri);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: effectiveRedirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    let parsedError = null;
    try {
      parsedError = JSON.parse(payload);
    } catch (e) {
      parsedError = null;
    }
    const errorCode = typeof parsedError?.error === 'string' ? parsedError.error : null;
    const errorDescription =
      typeof parsedError?.error_description === 'string' ? parsedError.error_description : null;
    if (errorCode === 'invalid_grant') {
      throw new HttpError(
        400,
        'Codice OAuth Google non valido o scaduto. Clicca "Collega Google Calendar" e completa di nuovo il consenso.'
      );
    }
    const detail = errorCode || errorDescription ? `${errorCode ?? ''} ${errorDescription ?? ''}`.trim() : payload;
    throw new HttpError(400, `Scambio OAuth calendario fallito: ${detail}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken) {
  requireGoogleOauthEnv();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new HttpError(401, `Refresh token Google calendario fallito: ${payload}`);
  }

  return response.json();
}

async function calendarRequest(path, accessToken, queryParams = {}) {
  const qs = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && qs.append(key, String(item)));
      return;
    }
    qs.append(key, String(value));
  });

  const url = `${GOOGLE_CALENDAR_BASE}${path}${qs.size ? `?${qs.toString()}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const payload = await response.text();
    throw new HttpError(502, `Errore API Calendar: ${payload}`);
  }
  return response.json();
}

async function getGoogleUserEmail(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new HttpError(502, `Errore API Google UserInfo: ${payload}`);
  }
  const payload = await response.json();
  return typeof payload?.email === 'string' && payload.email ? payload.email : null;
}

async function ensureCalendarSchema() {
  if (calendarSchemaReady) return;
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS calendar_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google')),
      provider_email TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      scope TEXT NOT NULL,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, provider)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_event_id TEXT NOT NULL,
      calendar_id TEXT NOT NULL DEFAULT 'primary',
      title TEXT NOT NULL DEFAULT '(Senza titolo)',
      description TEXT NOT NULL DEFAULT '',
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      all_day BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'confirmed',
      html_link TEXT,
      updated_remote_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, provider_event_id)
    )
  `);
  await query(
    'CREATE INDEX IF NOT EXISTS idx_calendar_accounts_user_provider ON calendar_accounts(user_id, provider)'
  );
  await query(
    'CREATE INDEX IF NOT EXISTS idx_calendar_events_user_starts ON calendar_events(user_id, starts_at ASC)'
  );
  calendarSchemaReady = true;
}

async function ensureUserExists(userId, email) {
  await query(
    `
      INSERT INTO users (id, email)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `,
    [userId, email]
  );
}

function resolveInternalUserEmail(userId) {
  return `user-${userId}@filo.local`;
}

async function upsertCalendarAccount(input) {
  const { rows } = await query(
    `
      INSERT INTO calendar_accounts (
        user_id, provider, provider_email, access_token, refresh_token, token_expires_at, scope, last_synced_at
      )
      VALUES ($1, 'google', $2, $3, $4, $5, $6, NULL)
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        provider_email = EXCLUDED.provider_email,
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, calendar_accounts.refresh_token),
        token_expires_at = EXCLUDED.token_expires_at,
        scope = EXCLUDED.scope,
        updated_at = NOW()
      RETURNING id, user_id, provider_email, token_expires_at, last_synced_at
    `,
    [
      input.userId,
      input.providerEmail,
      input.accessToken,
      input.refreshToken,
      input.tokenExpiresAt,
      input.scope
    ]
  );
  return rows[0];
}

async function findGoogleCalendarAccount(userId) {
  const { rows } = await query(
    `
      SELECT *
      FROM calendar_accounts
      WHERE user_id = $1 AND provider = 'google'
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

async function updateAccountTokens(accountId, accessToken, tokenExpiresAt) {
  await query(
    `
      UPDATE calendar_accounts
      SET access_token = $2, token_expires_at = $3, updated_at = NOW()
      WHERE id = $1
    `,
    [accountId, accessToken, tokenExpiresAt]
  );
}

async function resolveAccountAccessToken(account) {
  if (account.token_expires_at && new Date(account.token_expires_at).getTime() > Date.now() + 30_000) {
    return account.access_token;
  }
  if (!account.refresh_token) {
    throw new HttpError(401, 'Refresh token non disponibile. Ricollega Google Calendar.');
  }
  const refreshed = await refreshAccessToken(account.refresh_token);
  const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
  await updateAccountTokens(account.id, refreshed.access_token, expiresAt);
  return refreshed.access_token;
}

function parseCalendarDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function syncCalendarEvents(account, accessToken) {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const payload = await calendarRequest('/calendars/primary/events', accessToken, {
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    timeMin,
    timeMax
  });

  const ids = [];
  for (const item of payload.items ?? []) {
    if (!item?.id) continue;
    ids.push(String(item.id));
    const startsAt = parseCalendarDateTime(item.start?.dateTime) ?? parseCalendarDateTime(item.start?.date);
    const endsAt = parseCalendarDateTime(item.end?.dateTime) ?? parseCalendarDateTime(item.end?.date);
    await query(
      `
        INSERT INTO calendar_events (
          account_id, user_id, provider_event_id, calendar_id, title, description, starts_at, ends_at, all_day, status, html_link, updated_remote_at
        )
        VALUES ($1, $2, $3, 'primary', $4, $5, $6::timestamptz, $7::timestamptz, $8, $9, $10, $11::timestamptz)
        ON CONFLICT (account_id, provider_event_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          starts_at = EXCLUDED.starts_at,
          ends_at = EXCLUDED.ends_at,
          all_day = EXCLUDED.all_day,
          status = EXCLUDED.status,
          html_link = EXCLUDED.html_link,
          updated_remote_at = EXCLUDED.updated_remote_at,
          updated_at = NOW()
      `,
      [
        account.id,
        account.user_id,
        item.id,
        item.summary ?? '(Senza titolo)',
        item.description ?? '',
        startsAt,
        endsAt,
        Boolean(item.start?.date && !item.start?.dateTime),
        item.status ?? 'confirmed',
        item.htmlLink ?? null,
        parseCalendarDateTime(item.updated)
      ]
    );
  }

  if (ids.length === 0) {
    await query('DELETE FROM calendar_events WHERE account_id = $1', [account.id]);
  } else {
    await query(
      `
        DELETE FROM calendar_events
        WHERE account_id = $1 AND provider_event_id != ALL($2::text[])
      `,
      [account.id, ids]
    );
  }

  await query(
    `
      UPDATE calendar_accounts
      SET last_synced_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [account.id]
  );

  return ids.length;
}

export async function exchangeGoogleCalendarCodeAndSync({ userId, code, redirectUri }) {
  await ensureCalendarSchema();
  const oauthPayload = await exchangeGoogleCode({ code, redirectUri });
  const expiresAt = new Date(Date.now() + (oauthPayload.expires_in ?? 3600) * 1000).toISOString();

  await calendarRequest('/users/me/calendarList', oauthPayload.access_token, { maxResults: '1' });
  const providerEmail =
    (await getGoogleUserEmail(oauthPayload.access_token).catch(() => null)) ??
    resolveInternalUserEmail(userId);

  await ensureUserExists(userId, resolveInternalUserEmail(userId));
  const account = await upsertCalendarAccount({
    userId,
    providerEmail,
    accessToken: oauthPayload.access_token,
    refreshToken: oauthPayload.refresh_token ?? null,
    tokenExpiresAt: expiresAt,
    scope: oauthPayload.scope ?? GOOGLE_SCOPE
  });

  const validAccessToken = await resolveAccountAccessToken({
    ...account,
    access_token: oauthPayload.access_token,
    refresh_token: oauthPayload.refresh_token ?? null
  });
  const importedCount = await syncCalendarEvents(account, validAccessToken);
  return {
    account,
    sync: { importedCount, window: 'next_30_days' }
  };
}

export async function syncGoogleCalendar(userId) {
  await ensureCalendarSchema();
  const account = await findGoogleCalendarAccount(userId);
  if (!account) throw new HttpError(404, 'Nessun Google Calendar collegato');
  const accessToken = await resolveAccountAccessToken(account);
  const importedCount = await syncCalendarEvents(account, accessToken);
  const refreshed = await findGoogleCalendarAccount(userId);
  return {
    importedCount,
    account: {
      id: refreshed?.id ?? account.id,
      provider_email: refreshed?.provider_email ?? account.provider_email,
      last_synced_at: refreshed?.last_synced_at ?? new Date().toISOString()
    }
  };
}

export async function listCalendarEvents(userId, options = {}) {
  await ensureCalendarSchema();
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 250);
  const from = options.from ? new Date(options.from) : null;
  const to = options.to ? new Date(options.to) : null;
  const fromIso = from && !Number.isNaN(from.getTime()) ? from.toISOString() : null;
  const toIso = to && !Number.isNaN(to.getTime()) ? to.toISOString() : null;

  const { rows } = await query(
    `
      SELECT
        id,
        provider_event_id,
        title,
        description,
        starts_at,
        ends_at,
        all_day,
        status,
        html_link,
        updated_remote_at
      FROM calendar_events
      WHERE user_id = $1
        AND ($2::timestamptz IS NULL OR starts_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR starts_at <= $3::timestamptz)
      ORDER BY starts_at ASC NULLS LAST, created_at ASC
      LIMIT $4
    `,
    [userId, fromIso, toIso, limit]
  );
  return rows;
}

export async function getGoogleCalendarStatus(userId) {
  await ensureCalendarSchema();
  const account = await findGoogleCalendarAccount(userId);
  if (!account) {
    return {
      connected: false,
      provider_email: null,
      last_synced_at: null
    };
  }

  return {
    connected: true,
    provider_email: account.provider_email,
    last_synced_at: account.last_synced_at
  };
}
