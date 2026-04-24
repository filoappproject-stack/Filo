import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1';
let inboxSchemaReady = false;

function requireGoogleOauthEnv() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(500, 'Config Google OAuth mancante');
  }
}

function resolveRedirectUri(redirectUri) {
  if (env.GOOGLE_REDIRECT_URI) {
    return env.GOOGLE_REDIRECT_URI;
  }

  if (!redirectUri) {
    throw new HttpError(400, 'Redirect URI Google mancante');
  }

  return redirectUri;
}

export function buildGoogleAuthUrl({ userId, redirectUri, state }) {
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
    throw new HttpError(400, `Scambio OAuth fallito: ${payload}`);
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
    let parsed = null;
    try {
      parsed = JSON.parse(payload);
    } catch (_) {
      parsed = null;
    }
    if (parsed?.error === 'invalid_grant') {
      throw new HttpError(401, 'GoogleRefreshTokenInvalid');
    }
    throw new HttpError(401, `Refresh token Google fallito: ${payload}`);
  }

  return response.json();
}

async function gmailRequest(path, accessToken, queryParams = {}) {
  const qs = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          qs.append(key, String(item));
        }
      });
      return;
    }

    qs.append(key, String(value));
  });
  const url = `${GMAIL_BASE}${path}${qs.size ? `?${qs.toString()}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new HttpError(502, `Errore API Gmail: ${payload}`);
  }

  return response.json();
}

function headerValue(headers = [], name) {
  return headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

async function ensureInboxSchema() {
  if (inboxSchemaReady) {
    return;
  }

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
    CREATE TABLE IF NOT EXISTS inbox_accounts (
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
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES inbox_accounts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_message_id TEXT NOT NULL,
      provider_thread_id TEXT,
      snippet TEXT NOT NULL DEFAULT '',
      subject TEXT,
      sender TEXT,
      received_at TIMESTAMPTZ,
      labels TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, provider_message_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_inbox_accounts_user_provider ON inbox_accounts(user_id, provider)');
  await query('CREATE INDEX IF NOT EXISTS idx_inbox_messages_user_received ON inbox_messages(user_id, received_at DESC)');

  inboxSchemaReady = true;
}

async function upsertInboxAccount(input) {
  const sql = `
    INSERT INTO inbox_accounts (
      user_id,
      provider,
      provider_email,
      access_token,
      refresh_token,
      token_expires_at,
      scope,
      last_synced_at
    )
    VALUES ($1, 'google', $2, $3, $4, $5, $6, NULL)
    ON CONFLICT (user_id, provider)
    DO UPDATE SET
      provider_email = EXCLUDED.provider_email,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      scope = EXCLUDED.scope,
      updated_at = NOW()
    RETURNING id, user_id, provider, provider_email, token_expires_at, last_synced_at
  `;

  const { rows } = await query(sql, [
    input.userId,
    input.providerEmail,
    input.accessToken,
    input.refreshToken,
    input.tokenExpiresAt,
    input.scope
  ]);

  return rows[0];
}

async function ensureUserExists(userId, email) {
  const sql = `
    INSERT INTO users (id, email)
    VALUES ($1, $2)
    ON CONFLICT (id)
    DO NOTHING
  `;

  await query(sql, [userId, email]);
}

function resolveInternalUserEmail(userId) {
  return `user-${userId}@filo.local`;
}

async function updateAccountTokens(accountId, accessToken, tokenExpiresAt) {
  const sql = `
    UPDATE inbox_accounts
    SET access_token = $2,
        token_expires_at = $3,
        updated_at = NOW()
    WHERE id = $1
  `;

  await query(sql, [accountId, accessToken, tokenExpiresAt]);
}

async function markLastSynced(accountId) {
  const sql = `
    UPDATE inbox_accounts
    SET last_synced_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `;

  await query(sql, [accountId]);
}

async function syncInboxMessages(account, accessToken) {
  const collectedIds = [];
  const collectedIdSet = new Set();

  let pageToken;
  for (let i = 0; i < 10; i += 1) {
    const listPayload = await gmailRequest('/users/me/messages', accessToken, {
      maxResults: '100',
      pageToken
    });

    for (const message of listPayload.messages ?? []) {
      if (!collectedIdSet.has(message.id)) {
        collectedIdSet.add(message.id);
        collectedIds.push(message.id);
      }
    }

    if (!listPayload.nextPageToken) {
      break;
    }

    pageToken = listPayload.nextPageToken;
  }

  for (const providerMessageId of collectedIds) {
    const message = await gmailRequest(`/users/me/messages/${providerMessageId}`, accessToken, {
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });

    const headers = message.payload?.headers ?? [];
    const sql = `
      INSERT INTO inbox_messages (
        account_id,
        user_id,
        provider_message_id,
        provider_thread_id,
        snippet,
        subject,
        sender,
        received_at,
        labels
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::text[])
      ON CONFLICT (account_id, provider_message_id)
      DO UPDATE SET
        provider_thread_id = EXCLUDED.provider_thread_id,
        snippet = EXCLUDED.snippet,
        subject = EXCLUDED.subject,
        sender = EXCLUDED.sender,
        received_at = EXCLUDED.received_at,
        labels = EXCLUDED.labels,
        updated_at = NOW()
    `;

    const rawReceivedAt = headerValue(headers, 'Date');
    const receivedAt = rawReceivedAt ? new Date(rawReceivedAt) : null;
    const receivedAtIso =
      receivedAt && !Number.isNaN(receivedAt.getTime()) ? receivedAt.toISOString() : null;

    await query(sql, [
      account.id,
      account.user_id,
      providerMessageId,
      message.threadId ?? null,
      message.snippet ?? '',
      headerValue(headers, 'Subject'),
      headerValue(headers, 'From'),
      receivedAtIso,
      message.labelIds ?? []
    ]);
  }

  if (collectedIds.length === 0) {
    await query(
      `
        DELETE FROM inbox_messages
        WHERE account_id = $1
      `,
      [account.id]
    );
  } else {
    await query(
      `
        DELETE FROM inbox_messages
        WHERE account_id = $1
          AND provider_message_id != ALL($2::text[])
      `,
      [account.id, collectedIds]
    );
  }

  await markLastSynced(account.id);
  return collectedIds.length;
}

async function resolveAccountAccessToken(account) {
  if (account.token_expires_at && new Date(account.token_expires_at).getTime() > Date.now() + 30_000) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new HttpError(401, 'Refresh token non disponibile. Ricollega account Google.');
  }

  try {
    const refreshed = await refreshAccessToken(account.refresh_token);
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();

    await updateAccountTokens(account.id, refreshed.access_token, expiresAt);
    return refreshed.access_token;
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 401 && error.message === 'GoogleRefreshTokenInvalid') {
      await query('DELETE FROM inbox_accounts WHERE id = $1', [account.id]);
    }
    throw error;
  }
}

async function findGoogleAccountByUserId(userId) {
  const sql = `
    SELECT id, user_id, access_token, refresh_token, token_expires_at, last_synced_at
    FROM inbox_accounts
    WHERE user_id = $1 AND provider = 'google'
    LIMIT 1
  `;

  const { rows } = await query(sql, [userId]);
  return rows[0] ?? null;
}

function shouldSyncAccount(account) {
  if (!account?.last_synced_at) {
    return true;
  }

  const lastSyncedTs = new Date(account.last_synced_at).getTime();
  if (Number.isNaN(lastSyncedTs)) {
    return true;
  }

  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  return Date.now() - lastSyncedTs > FIVE_MINUTES_MS;
}

async function maybeSyncInboxForUser(userId, options = {}) {
  const forceSync = options.force === true;
  const account = await findGoogleAccountByUserId(userId);
  if (!account) {
    return { connected: false, importedCount: 0, synced: false };
  }

  if (!forceSync && !shouldSyncAccount(account)) {
    return { connected: true, importedCount: 0, synced: false };
  }

  const accessToken = await resolveAccountAccessToken(account);
  const importedCount = await syncInboxMessages(account, accessToken);
  return { connected: true, importedCount, synced: true };
}

export async function exchangeGoogleCodeAndSync({ userId, code, redirectUri }) {
  await ensureInboxSchema();

  const oauthPayload = await exchangeGoogleCode({ code, redirectUri });
  const expiresAt = new Date(Date.now() + (oauthPayload.expires_in ?? 3600) * 1000).toISOString();

  const profile = await gmailRequest('/users/me/profile', oauthPayload.access_token);

  await ensureUserExists(userId, resolveInternalUserEmail(userId));

  const account = await upsertInboxAccount({
    userId,
    providerEmail: profile.emailAddress,
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

  const importedCount = await syncInboxMessages(account, validAccessToken);

  return {
    account,
    sync: {
      importedCount,
      window: account.last_synced_at ? 'incremental' : 'last_30_days'
    }
  };
}

export async function listInboxMessages(userId, limit, options = {}) {
  await ensureInboxSchema();
  await maybeSyncInboxForUser(userId, { force: options.forceSync === true });

  const sql = `
    SELECT
      m.id,
      m.provider_message_id,
      m.provider_thread_id,
      m.subject,
      m.sender,
      m.snippet,
      m.received_at,
      m.labels,
      m.created_at
    FROM inbox_messages m
    WHERE m.user_id = $1
    ORDER BY m.received_at DESC NULLS LAST, m.created_at DESC
    LIMIT $2
  `;

  const { rows } = await query(sql, [userId, limit]);
  return rows;
}

export async function syncGoogleInbox(userId) {
  await ensureInboxSchema();

  const { rows } = await query(
    `
      SELECT *
      FROM inbox_accounts
      WHERE user_id = $1 AND provider = 'google'
      LIMIT 1
    `,
    [userId]
  );

  const account = rows[0];
  if (!account) {
    throw new HttpError(404, 'Nessun account Google collegato');
  }

  const accessToken = await resolveAccountAccessToken(account);
  const importedCount = await syncInboxMessages(account, accessToken);

  const { rows: refreshedRows } = await query(
    `
      SELECT id, provider_email, last_synced_at
      FROM inbox_accounts
      WHERE id = $1
      LIMIT 1
    `,
    [account.id]
  );

  return {
    importedCount,
    account: refreshedRows[0] ?? {
      id: account.id,
      provider_email: account.provider_email,
      last_synced_at: new Date().toISOString()
    }
  };
}
