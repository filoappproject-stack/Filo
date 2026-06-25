import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import crypto from 'node:crypto';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1';
const INBOX_PROVIDER_GOOGLE = 'google';
const INBOX_PROVIDER_IMAP = 'imap_smtp';
const IMAP_SCOPE = 'imap:read smtp:send';
const IMAP_CONNECTION_TIMEOUT_MS = 12_000;
const IMAP_GREETING_TIMEOUT_MS = 8_000;
const IMAP_SOCKET_TIMEOUT_MS = 20_000;
let inboxSchemaReady = false;

function requireGoogleOauthEnv() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(500, 'Config Google OAuth mancante');
  }
}


function getGoogleOauthTestUsers() {
  return env.GOOGLE_OAUTH_TEST_USERS.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function assertGoogleOauthTester(userEmail) {
  const testUsers = getGoogleOauthTestUsers();
  if (!testUsers.length || !userEmail) {
    return;
  }

  const normalizedEmail = userEmail.trim().toLowerCase();
  if (testUsers.includes(normalizedEmail)) {
    return;
  }

  throw new HttpError(
    403,
    `Questo account Google (${userEmail}) non è abilitato come tester OAuth. Aggiungilo in Google Cloud Console > Google Auth Platform > Audience > Test users oppure pubblica/verifica l'app Google.`
  );
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

export function buildGoogleAuthUrl({ userId, redirectUri, state, authEmail }) {
  requireGoogleOauthEnv();
  const userEmail = normalizeEmail(authEmail);
  assertGoogleOauthTester(userEmail);
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

  if (userEmail) {
    params.set('login_hint', userEmail);
  }

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
    throw new HttpError(401, `Refresh token Google fallito: ${payload}`);
  }

  return response.json();
}

function isInvalidGrantError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('invalid_grant') || message.includes('token has been expired or revoked');
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
      provider TEXT NOT NULL CHECK (provider IN ('google', 'imap_smtp')),
      provider_email TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      scope TEXT NOT NULL,
      provider_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, provider)
    )
  `);

  await query("ALTER TABLE inbox_accounts ADD COLUMN IF NOT EXISTS provider_config JSONB NOT NULL DEFAULT '{}'::jsonb");
  await query('ALTER TABLE inbox_accounts DROP CONSTRAINT IF EXISTS inbox_accounts_provider_check');
  await query(
    "ALTER TABLE inbox_accounts ADD CONSTRAINT inbox_accounts_provider_check CHECK (provider IN ('google', 'imap_smtp'))"
  );

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
      refresh_token = COALESCE(EXCLUDED.refresh_token, inbox_accounts.refresh_token),
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

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeHost(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeMailbox(value) {
  const mailbox = typeof value === 'string' ? value.trim() : '';
  return mailbox || 'INBOX';
}

function getCredentialsKey() {
  const secret = env.INBOX_CREDENTIALS_SECRET || env.DATABASE_URL;
  if (!secret || secret.length < 16) {
    throw new HttpError(
      500,
      'Config cifratura mailbox mancante: imposta INBOX_CREDENTIALS_SECRET oppure DATABASE_URL'
    );
  }

  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCredentialsKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return JSON.stringify({
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  });
}

function decryptSecret(payload) {
  const parsed = JSON.parse(payload);
  if (parsed?.v !== 1 || parsed?.alg !== 'aes-256-gcm') {
    throw new HttpError(500, 'Formato credenziali mailbox non supportato');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getCredentialsKey(),
    Buffer.from(parsed.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

async function loadImapFlow() {
  try {
    const module = await import('imapflow');
    return module.ImapFlow;
  } catch (error) {
    throw new HttpError(500, 'Dipendenza IMAP non installata sul backend');
  }
}

function buildImapClientConfig(config, password) {
  return {
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapSecure,
    connectionTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: IMAP_GREETING_TIMEOUT_MS,
    socketTimeout: IMAP_SOCKET_TIMEOUT_MS,
    auth: {
      user: config.username || config.email,
      pass: password
    }
  };
}

function normalizeImapAccountInput(input) {
  const email = normalizeEmail(input.email);
  const imapHost = normalizeHost(input.imapHost);
  const smtpHost = normalizeHost(input.smtpHost);
  const username = typeof input.username === 'string' ? input.username.trim() : email;

  if (!email || !imapHost || !smtpHost || !input.password) {
    throw new HttpError(400, 'Configurazione email non valida');
  }

  return {
    email,
    username,
    imapHost,
    imapPort: Number(input.imapPort || 993),
    imapSecure: input.imapSecure !== false,
    imapMailbox: normalizeMailbox(input.imapMailbox),
    smtpHost,
    smtpPort: Number(input.smtpPort || 465),
    smtpSecure: input.smtpSecure !== false
  };
}

function stripMessageSource(source) {
  const text = Buffer.isBuffer(source) ? source.toString('utf8') : String(source ?? '');
  return text
    .replace(/\r?\n/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

async function verifyImapAccount(config, password) {
  const ImapFlow = await loadImapFlow();
  const client = new ImapFlow(buildImapClientConfig(config, password));
  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.imapMailbox);
    lock.release();
  } finally {
    await client.logout().catch(() => {});
  }
}

function toImapHttpError(error, config) {
  if (error instanceof HttpError) {
    return error;
  }

  const code = String(error?.code ?? '').toUpperCase();
  const message = String(error?.message ?? '').toLowerCase();

  if (error?.authenticationFailed || message.includes('authentication') || message.includes('invalid credentials')) {
    return new HttpError(
      401,
      'Credenziali IMAP non valide. Per Libero usa come username l’indirizzo email completo e verifica che la password sia quella della casella o una password per app.'
    );
  }

  if (
    code.includes('TIMEOUT') ||
    code === 'ETIMEDOUT' ||
    message.includes('timeout') ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENOTFOUND'
  ) {
    return new HttpError(
      503,
      `Non riesco a raggiungere il server IMAP ${config.imapHost}:${config.imapPort}. Controlla host, porta, SSL/TLS o riprova più tardi.`
    );
  }

  if (message.includes('certificate') || code.includes('CERT')) {
    return new HttpError(
      400,
      `Certificato TLS non valido per ${config.imapHost}. Verifica di aver inserito il server IMAP corretto e SSL/TLS attivo.`
    );
  }

  return new HttpError(400, `Connessione IMAP non riuscita: ${error?.message ?? 'errore sconosciuto'}`);
}

async function upsertImapAccount({ userId, config, password }) {
  const encryptedPassword = encryptSecret(password);
  const sql = `
    INSERT INTO inbox_accounts (
      user_id,
      provider,
      provider_email,
      access_token,
      refresh_token,
      token_expires_at,
      scope,
      provider_config,
      last_synced_at
    )
    VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6::jsonb, NULL)
    ON CONFLICT (user_id, provider)
    DO UPDATE SET
      provider_email = EXCLUDED.provider_email,
      access_token = EXCLUDED.access_token,
      refresh_token = NULL,
      token_expires_at = NULL,
      scope = EXCLUDED.scope,
      provider_config = EXCLUDED.provider_config,
      updated_at = NOW()
    RETURNING id, user_id, provider, provider_email, provider_config, last_synced_at
  `;

  const { rows } = await query(sql, [
    userId,
    INBOX_PROVIDER_IMAP,
    config.email,
    encryptedPassword,
    IMAP_SCOPE,
    JSON.stringify(config)
  ]);

  return rows[0];
}

async function findImapAccountByUserId(userId) {
  const { rows } = await query(
    `
      SELECT id, user_id, provider, provider_email, access_token, provider_config, last_synced_at
      FROM inbox_accounts
      WHERE user_id = $1 AND provider = $2
      LIMIT 1
    `,
    [userId, INBOX_PROVIDER_IMAP]
  );
  return rows[0] ?? null;
}

function resolveImapAccountConfig(account) {
  const config =
    typeof account.provider_config === 'string'
      ? JSON.parse(account.provider_config)
      : account.provider_config;
  return normalizeImapAccountInput({
    ...config,
    password: 'placeholder'
  });
}

async function syncImapInboxMessages(account) {
  const config = resolveImapAccountConfig(account);
  const password = decryptSecret(account.access_token);
  const ImapFlow = await loadImapFlow();
  const client = new ImapFlow(buildImapClientConfig(config, password));
  const syncedInboxIds = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.imapMailbox);
    try {
      const exists = Number(client.mailbox?.exists || 0);
      if (exists > 0) {
        const fromSeq = Math.max(1, exists - 99);
        for await (const message of client.fetch(`${fromSeq}:*`, {
          uid: true,
          envelope: true,
          flags: true,
          source: true
        })) {
          const providerMessageId = `${config.imapMailbox}:${message.uid}`;
          const labels = ['INBOX'];
          const flags = Array.from(message.flags ?? []).map(String);
          if (!flags.includes('\\Seen')) labels.push('UNREAD');
          const from = message.envelope?.from?.[0];
          const sender = from
            ? [from.name, from.address ? `<${from.address}>` : ''].filter(Boolean).join(' ')
            : null;
          const receivedAt =
            message.envelope?.date && !Number.isNaN(new Date(message.envelope.date).getTime())
              ? new Date(message.envelope.date).toISOString()
              : null;

          await query(
            `
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
              VALUES ($1, $2, $3, NULL, $4, $5, $6, $7::timestamptz, $8::text[])
              ON CONFLICT (account_id, provider_message_id)
              DO UPDATE SET
                snippet = EXCLUDED.snippet,
                subject = EXCLUDED.subject,
                sender = EXCLUDED.sender,
                received_at = EXCLUDED.received_at,
                labels = EXCLUDED.labels,
                updated_at = NOW()
            `,
            [
              account.id,
              account.user_id,
              providerMessageId,
              stripMessageSource(message.source),
              message.envelope?.subject ?? null,
              sender,
              receivedAt,
              labels
            ]
          );
          syncedInboxIds.push(providerMessageId);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  if (syncedInboxIds.length === 0) {
    await query('DELETE FROM inbox_messages WHERE account_id = $1', [account.id]);
  } else {
    await query(
      `
        DELETE FROM inbox_messages
        WHERE account_id = $1
          AND provider_message_id != ALL($2::text[])
      `,
      [account.id, syncedInboxIds]
    );
  }

  await markLastSynced(account.id);
  return syncedInboxIds.length;
}

function isProviderEmailAllowedForUser(providerEmail, authEmail) {
  const normalizedProviderEmail = normalizeEmail(providerEmail);
  const normalizedAuthEmail = normalizeEmail(authEmail);
  return !!normalizedProviderEmail && !!normalizedAuthEmail && normalizedProviderEmail === normalizedAuthEmail;
}

async function deleteInboxAccount(accountId) {
  await query('DELETE FROM inbox_accounts WHERE id = $1', [accountId]);
}

async function ensureInboxAccountMatchesAuthenticatedUser(account, authEmail) {
  if (!account) {
    return null;
  }

  const normalizedAuthEmail = normalizeEmail(authEmail);
  if (!normalizedAuthEmail) {
    return null;
  }

  if (isProviderEmailAllowedForUser(account.provider_email, normalizedAuthEmail)) {
    return account;
  }

  await deleteInboxAccount(account.id);
  return null;
}

async function updateAccountTokens(accountId, accessToken, tokenExpiresAt, refreshToken = null) {
  const sql = `
    UPDATE inbox_accounts
    SET access_token = $2,
        token_expires_at = $3,
        refresh_token = COALESCE($4, refresh_token),
        updated_at = NOW()
    WHERE id = $1
  `;

  await query(sql, [accountId, accessToken, tokenExpiresAt, refreshToken]);
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
  const syncedInboxIds = [];

  let pageToken;
  for (let i = 0; i < 10; i += 1) {
    const listPayload = await gmailRequest('/users/me/messages', accessToken, {
      maxResults: '100',
      labelIds: ['INBOX'],
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

    const labelIds = Array.isArray(message.labelIds) ? message.labelIds : [];
    if (!labelIds.includes('INBOX')) {
      continue;
    }

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

    syncedInboxIds.push(providerMessageId);

    await query(sql, [
      account.id,
      account.user_id,
      providerMessageId,
      message.threadId ?? null,
      message.snippet ?? '',
      headerValue(headers, 'Subject'),
      headerValue(headers, 'From'),
      receivedAtIso,
      labelIds
    ]);
  }

  if (syncedInboxIds.length === 0) {
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
      [account.id, syncedInboxIds]
    );
  }

  await markLastSynced(account.id);
  return syncedInboxIds.length;
}

async function resolveAccountAccessToken(account) {
  if (account.token_expires_at && new Date(account.token_expires_at).getTime() > Date.now() + 30_000) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new HttpError(401, 'Refresh token non disponibile. Ricollega account Google.');
  }

  let refreshed;
  try {
    refreshed = await refreshAccessToken(account.refresh_token);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 401 && isInvalidGrantError(error)) {
      await deleteInboxAccount(account.id);
      throw new HttpError(401, 'Token Google scaduto o revocato. Ricollega la mailbox.');
    }
    throw error;
  }
  const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();

  await updateAccountTokens(account.id, refreshed.access_token, expiresAt, refreshed.refresh_token ?? null);
  return refreshed.access_token;
}

async function ensureAccountTokenMatchesAuthenticatedUser(account, authEmail) {
  if (!account) {
    return null;
  }

  const accessToken = await resolveAccountAccessToken(account);
  const profile = await gmailRequest('/users/me/profile', accessToken);

  if (!isProviderEmailAllowedForUser(profile.emailAddress, authEmail)) {
    await deleteInboxAccount(account.id);
    return null;
  }

  if (!isProviderEmailAllowedForUser(account.provider_email, profile.emailAddress)) {
    await query(
      `
        UPDATE inbox_accounts
        SET provider_email = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [account.id, profile.emailAddress]
    );
  }

  return {
    ...account,
    provider_email: profile.emailAddress,
    access_token: accessToken
  };
}

async function getVerifiedGoogleAccountForUser(userId, authEmail) {
  const account = await ensureInboxAccountMatchesAuthenticatedUser(
    await findGoogleAccountByUserId(userId),
    authEmail
  );

  if (!account) {
    return null;
  }

  return ensureAccountTokenMatchesAuthenticatedUser(account, authEmail);
}

async function findGoogleAccountByUserId(userId) {
  const sql = `
    SELECT id, user_id, provider_email, access_token, refresh_token, token_expires_at, last_synced_at
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
  const authEmail = options.authEmail ?? null;
  const account = await getVerifiedGoogleAccountForUser(userId, authEmail);
  if (!account) {
    return { connected: false, importedCount: 0, synced: false };
  }

  if (!forceSync && !shouldSyncAccount(account)) {
    return { connected: true, importedCount: 0, synced: false };
  }

  const importedCount = await syncInboxMessages(account, account.access_token);
  return { connected: true, importedCount, synced: true };
}

export async function exchangeGoogleCodeAndSync({ userId, code, redirectUri, authEmail }) {
  await ensureInboxSchema();

  const oauthPayload = await exchangeGoogleCode({ code, redirectUri });
  const expiresAt = new Date(Date.now() + (oauthPayload.expires_in ?? 3600) * 1000).toISOString();

  const profile = await gmailRequest('/users/me/profile', oauthPayload.access_token);
  if (!isProviderEmailAllowedForUser(profile.emailAddress, authEmail)) {
    throw new HttpError(403, 'La mailbox Google selezionata non coincide con l\'utente Filo autenticato. Esci da Google o scegli lo stesso account usato per accedere a Filo.');
  }

  await ensureUserExists(userId, resolveInternalUserEmail(userId));

  const account = await upsertInboxAccount({
    userId,
    providerEmail: profile.emailAddress,
    accessToken: oauthPayload.access_token,
    refreshToken: oauthPayload.refresh_token ?? oauthPayload.refreshToken ?? null,
    tokenExpiresAt: expiresAt,
    scope: oauthPayload.scope ?? GOOGLE_SCOPE
  });

  const validAccount = await ensureAccountTokenMatchesAuthenticatedUser(
    {
      ...account,
      access_token: oauthPayload.access_token,
      refresh_token: oauthPayload.refresh_token ?? oauthPayload.refreshToken ?? null
    },
    authEmail
  );
  if (!validAccount) {
    throw new HttpError(403, 'La mailbox Google selezionata non coincide con l\'utente Filo autenticato. Ricollega la mailbox con lo stesso account Google usato per accedere a Filo.');
  }

  const importedCount = await syncInboxMessages(validAccount, validAccount.access_token);

  return {
    account,
    sync: {
      importedCount,
      window: account.last_synced_at ? 'incremental' : 'last_30_days'
    }
  };
}

export async function listInboxMessages(userId, limit, authEmail) {
  await ensureInboxSchema();
  await maybeSyncInboxForUser(userId, { authEmail });

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
      m.created_at,
      a.provider
    FROM inbox_messages m
    JOIN inbox_accounts a ON a.id = m.account_id
    WHERE m.user_id = $1
      AND (a.provider = $4 OR LOWER(a.provider_email) = LOWER($3))
      AND 'INBOX' = ANY(m.labels)
    ORDER BY m.received_at DESC NULLS LAST, m.created_at DESC
    LIMIT $2
  `;

  const { rows } = await query(sql, [userId, limit, authEmail, INBOX_PROVIDER_IMAP]);
  return rows;
}

export async function connectImapInboxAndSync({ userId, email, username, password, imapHost, imapPort, imapSecure, imapMailbox, smtpHost, smtpPort, smtpSecure }) {
  await ensureInboxSchema();

  const config = normalizeImapAccountInput({
    email,
    username,
    password,
    imapHost,
    imapPort,
    imapSecure,
    imapMailbox,
    smtpHost,
    smtpPort,
    smtpSecure
  });

  try {
    await verifyImapAccount(config, password);
  } catch (error) {
    throw toImapHttpError(error, config);
  }
  await ensureUserExists(userId, resolveInternalUserEmail(userId));

  let account;
  try {
    account = await upsertImapAccount({ userId, config, password });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, 'Salvataggio configurazione mailbox non riuscito');
  }

  return {
    account: {
      id: account.id,
      provider: account.provider,
      provider_email: account.provider_email,
      last_synced_at: account.last_synced_at
    },
    sync: {
      importedCount: 0,
      window: 'not_synced'
    }
  };
}

export async function syncImapInbox(userId) {
  await ensureInboxSchema();
  const account = await findImapAccountByUserId(userId);
  if (!account) {
    throw new HttpError(404, 'Nessun account email collegato');
  }

  let importedCount;
  try {
    importedCount = await syncImapInboxMessages(account);
  } catch (error) {
    throw toImapHttpError(error, resolveImapAccountConfig(account));
  }
  const refreshed = await findImapAccountByUserId(userId);
  return {
    importedCount,
    account: {
      id: refreshed?.id ?? account.id,
      provider_email: refreshed?.provider_email ?? account.provider_email,
      last_synced_at: refreshed?.last_synced_at ?? new Date().toISOString()
    }
  };
}

export async function getInboxStatus(userId, authEmail) {
  await ensureInboxSchema();

  const googleStatus = await getGoogleInboxStatus(userId, authEmail);
  if (googleStatus.connected) {
    return {
      ...googleStatus,
      provider: INBOX_PROVIDER_GOOGLE
    };
  }

  const imapAccount = await findImapAccountByUserId(userId);
  if (!imapAccount) {
    return {
      connected: false,
      provider: null,
      provider_email: null,
      last_synced_at: null
    };
  }

  return {
    connected: true,
    provider: INBOX_PROVIDER_IMAP,
    provider_email: imapAccount.provider_email,
    last_synced_at: imapAccount.last_synced_at
  };
}

export async function disconnectInboxAccount(userId) {
  await ensureInboxSchema();

  const { rows: messageRows } = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM inbox_messages m
      JOIN inbox_accounts a ON a.id = m.account_id
      WHERE a.user_id = $1
    `,
    [userId]
  );

  const { rowCount } = await query(
    `
      DELETE FROM inbox_accounts
      WHERE user_id = $1
    `,
    [userId]
  );

  return {
    disconnected: rowCount > 0,
    deletedAccounts: rowCount,
    deletedMessages: messageRows[0]?.count ?? 0
  };
}

export async function syncGoogleInbox(userId, authEmail) {
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

  const account = await ensureAccountTokenMatchesAuthenticatedUser(
    await ensureInboxAccountMatchesAuthenticatedUser(rows[0], authEmail),
    authEmail
  );
  if (!account) {
    throw new HttpError(404, 'Nessun account Google collegato');
  }

  const importedCount = await syncInboxMessages(account, account.access_token);

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

export async function getGoogleInboxStatus(userId, authEmail) {
  await ensureInboxSchema();

  const { rows } = await query(
    `
      SELECT id, provider_email, access_token, refresh_token, token_expires_at, last_synced_at
      FROM inbox_accounts
      WHERE user_id = $1 AND provider = 'google'
      LIMIT 1
    `,
    [userId]
  );

  let account = await ensureInboxAccountMatchesAuthenticatedUser(rows[0], authEmail);
  if (!account) {
    return {
      connected: false,
      provider_email: null,
      last_synced_at: null
    };
  }

  // Verifica credenziali e proprietà reale del token: se il token Google appartiene
  // a un account diverso dall'utente Filo autenticato, il collegamento viene rimosso.
  try {
    account = await ensureAccountTokenMatchesAuthenticatedUser(account, authEmail);
    if (!account) {
      return {
        connected: false,
        provider_email: null,
        last_synced_at: null
      };
    }
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 401) {
      return {
        connected: false,
        provider_email: null,
        last_synced_at: null
      };
    }
    throw error;
  }

  return {
    connected: true,
    provider_email: account.provider_email,
    last_synced_at: account.last_synced_at
  };
}
