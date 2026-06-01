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

function serializeForInlineScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildRedirectUrl(appRedirectUri, appState, entries) {
  const target = new URL(appRedirectUri);
  const hash = new URLSearchParams({ state: appState });
  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') hash.set(key, String(value));
  });
  target.hash = hash.toString();
  return target.toString();
}

function sendGoogleLoginCallbackPage(res, payload) {
  const inlinePayload = serializeForInlineScript(payload);
  res.set('Cache-Control', 'no-store');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"
  );
  return res.status(200).send(`<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accesso a Filo...</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F5F0;color:#1A1A18;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
  .box{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:20px;padding:32px 36px;box-shadow:0 10px 40px rgba(0,0,0,.08);text-align:center;max-width:360px;}
  .mark{width:56px;height:56px;border-radius:16px;background:#1A4FBF;color:#fff;display:grid;place-items:center;margin:0 auto 18px;font-size:26px;font-weight:700;}
  .title{font-size:22px;font-weight:650;margin-bottom:8px;letter-spacing:-.3px;}
  .sub{font-size:14px;color:#57534A;line-height:1.5;}
</style>
</head>
<body>
  <div class="box" role="status" aria-live="polite">
    <div class="mark">F</div>
    <div class="title">Accesso a Filo...</div>
    <div class="sub">Sto completando il login con Google. Ci vuole solo un istante.</div>
  </div>
<script>
const payload = ${inlinePayload};
function finish(entries){
  const target = new URL(payload.appRedirectUri);
  const hash = new URLSearchParams({ state: payload.appState });
  Object.entries(entries || {}).forEach(([key,value]) => {
    if (value !== undefined && value !== null && value !== '') hash.set(key, String(value));
  });
  target.hash = hash.toString();
  window.location.replace(target.toString());
}
(async () => {
  if (payload.error) {
    finish({ error: payload.error, error_description: payload.errorDescription });
    return;
  }
  try {
    const response = await fetch('/api/v1/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: payload.code, redirectUri: payload.callbackRedirectUri })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'Exchange login Google fallito');
    }
    const body = await response.json();
    const idToken = body && body.data && body.data.idToken;
    if (!idToken) throw new Error('ID token Google mancante');
    finish({ id_token: idToken });
  } catch (error) {
    finish({ error: 'exchange_failed', error_description: error && error.message ? error.message : String(error) });
  }
})();
</script>
</body>
</html>`);
}

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

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const callbackRedirectUri = getGoogleLoginCallbackRedirectUri(appRedirectUri);

  if (req.query.error) {
    return res.redirect(
      302,
      buildRedirectUrl(appRedirectUri, appState, {
        error: String(req.query.error),
        error_description: req.query.error_description ? String(req.query.error_description) : null
      })
    );
  }

  if (!code) {
    return res.redirect(
      302,
      buildRedirectUrl(appRedirectUri, appState, {
        error: 'missing_code',
        error_description: 'Google non ha restituito il codice OAuth.'
      })
    );
  }

  return sendGoogleLoginCallbackPage(res, {
    appRedirectUri,
    appState,
    callbackRedirectUri,
    code
  });
}
