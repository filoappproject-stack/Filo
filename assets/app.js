// â”€â”€ SUPABASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPABASE_URL = window.FILO_CONFIG?.supabaseUrl || 'https://xkdniukhksfiuromnmtv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UdRD3JHIa14slQ_0ltkNTA_0Xkdkfn4';
// Il login Google usa un OAuth diretto verso il dominio dell'app e poi crea la sessione Supabase
// con l'ID token Google, evitando il selettore account sul dominio tecnico Supabase.
const GOOGLE_LOGIN_OAUTH_STATE_KEY = 'filo_google_login_oauth_state';
const GOOGLE_LOGIN_DIAG_KEY = 'filo_google_login_diag';
const GOOGLE_LOGIN_BUTTON_HTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>Continua con Google';
const INBOX_OAUTH_QUERY_STORAGE_KEY = 'filo_inbox_oauth_query_payload';
const MAILBOX_REDIRECT_URI_KEY = 'filo_inbox_redirect_uri';
const CALENDAR_OAUTH_QUERY_STORAGE_KEY = 'filo_calendar_oauth_query_payload';
const CALENDAR_REDIRECT_URI_KEY = 'filo_calendar_redirect_uri';
const CALENDAR_OAUTH_PENDING_KEY = 'filo_calendar_oauth_pending';
const CALENDAR_OAUTH_PENDING_AT_KEY = 'filo_calendar_oauth_pending_at';
const CALENDAR_OAUTH_USER_ID_KEY = 'filo_calendar_oauth_user_id';
const CALENDAR_LAST_EXCHANGE_CODE_KEY = 'filo_calendar_last_exchange_code';
const CALENDAR_LAST_EXCHANGE_AT_KEY = 'filo_calendar_last_exchange_at';
const CALENDAR_DIAG_PREFIX = 'filo_calendar_diag_';
const CALENDAR_OAUTH_PENDING_MAX_AGE_MS = 15 * 60 * 1000;
const CALENDAR_OAUTH_CALLBACK_MAX_AGE_MS = 5 * 60 * 1000;
const CALENDAR_EXCHANGE_REPLAY_GUARD_MS = 10 * 60 * 1000;
function setCalendarTransient(key,value){try{sessionStorage.setItem(key,value);}catch(e){}try{localStorage.setItem(key,value);}catch(e){}}
function getCalendarTransient(key){try{const v=sessionStorage.getItem(key);if(v)return v;}catch(e){}try{return localStorage.getItem(key);}catch(e){return null;}}
function removeCalendarTransient(key){try{sessionStorage.removeItem(key);}catch(e){}try{localStorage.removeItem(key);}catch(e){}}
function clearCalendarOAuthFlowState(){
  removeCalendarTransient(CALENDAR_OAUTH_QUERY_STORAGE_KEY);
  removeCalendarTransient('filo_calendar_oauth_state');
  removeCalendarTransient(CALENDAR_REDIRECT_URI_KEY);
  removeCalendarTransient(CALENDAR_OAUTH_PENDING_KEY);
  removeCalendarTransient(CALENDAR_OAUTH_PENDING_AT_KEY);
  removeCalendarTransient(CALENDAR_OAUTH_USER_ID_KEY);
}
function markCalendarOAuthPending(userId){
  setCalendarTransient(CALENDAR_OAUTH_PENDING_KEY,'1');
  setCalendarTransient(CALENDAR_OAUTH_PENDING_AT_KEY,String(Date.now()));
  if(userId)setCalendarTransient(CALENDAR_OAUTH_USER_ID_KEY,userId);
}
function hasActiveCalendarOAuthPending(){
  const pending = getCalendarTransient(CALENDAR_OAUTH_PENDING_KEY) === '1';
  if(!pending) return false;
  const startedAtRaw = getCalendarTransient(CALENDAR_OAUTH_PENDING_AT_KEY);
  const startedAt = Number(startedAtRaw);
  if(!Number.isFinite(startedAt)){
    clearCalendarOAuthFlowState();
    return false;
  }
  if((Date.now()-startedAt) > CALENDAR_OAUTH_PENDING_MAX_AGE_MS){
    clearCalendarOAuthFlowState();
    return false;
  }
  return true;
}
function hasRecentCalendarExchangeCode(code){
  if(!code)return false;
  try{
    const recentCode=sessionStorage.getItem(CALENDAR_LAST_EXCHANGE_CODE_KEY);
    const recentAt=Number(sessionStorage.getItem(CALENDAR_LAST_EXCHANGE_AT_KEY));
    if(!recentCode||!Number.isFinite(recentAt))return false;
    if((Date.now()-recentAt)>CALENDAR_EXCHANGE_REPLAY_GUARD_MS)return false;
    return recentCode===code;
  }catch(e){return false;}
}
function markCalendarExchangeCode(code){
  if(!code)return;
  try{
    sessionStorage.setItem(CALENDAR_LAST_EXCHANGE_CODE_KEY,code);
    sessionStorage.setItem(CALENDAR_LAST_EXCHANGE_AT_KEY,String(Date.now()));
  }catch(e){}
}
function getQueryParamPreservePlus(url,key){
  const search=typeof url?.search==='string'?url.search:'';
  if(!search||search==='?')return null;
  const query=search.startsWith('?')?search.slice(1):search;
  for(const segment of query.split('&')){
    if(!segment)continue;
    const [rawKey,...rawValueParts]=segment.split('=');
    if(!rawKey)continue;
    const decodedKey=decodeURIComponent(rawKey.replace(/\+/g,'%20'));
    if(decodedKey!==key)continue;
    const rawValue=rawValueParts.join('=');
    try{return decodeURIComponent(rawValue||'');}catch(e){return rawValue||'';}
  }
  return null;
}

(function preserveInboxOAuthQueryBeforeSupabaseInit(){
  try{
    const url = new URL(window.location.href);
    const code = getQueryParamPreservePlus(url,'code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');
    if(!code && !error) return;

    const expectedInboxState = sessionStorage.getItem('filo_inbox_oauth_state');
    const expectedCalendarState = getCalendarTransient('filo_calendar_oauth_state');
    const matchesInboxState = !!(expectedInboxState && state && expectedInboxState === state);
    const matchesCalendarState = !!(expectedCalendarState && state && expectedCalendarState === state);
    const hasInboxStatePrefix = typeof state === 'string' && state.startsWith('mailbox:');
    const hasCalendarStatePrefix = typeof state === 'string' && state.startsWith('calendar:');
    const isInboxOAuthCallback = matchesInboxState || hasInboxStatePrefix;
    const hasCalendarPendingMarker = hasActiveCalendarOAuthPending();
    const scopeRaw = url.searchParams.get('scope') || '';
    const hasCalendarScope = scopeRaw.includes('calendar');
    const isCalendarOAuthCallback =
      matchesCalendarState ||
      hasCalendarStatePrefix ||
      hasCalendarScope ||
      (hasCalendarPendingMarker && (hasCalendarStatePrefix || hasCalendarScope));
    if(!isInboxOAuthCallback && !isCalendarOAuthCallback) return;

    const payload = {
      code,
      error,
      state,
      scope: url.searchParams.get('scope'),
      authuser: url.searchParams.get('authuser'),
      prompt: url.searchParams.get('prompt'),
      capturedAt: Date.now()
    };
    // In alcuni casi Google restituisce scope multipli (es. calendar+gmail) anche per flow mailbox:
    // se usassimo un solo storageKey potremmo perdere il callback inbox e finire in loop "Collega mailbox".
    if(isInboxOAuthCallback){
      sessionStorage.setItem(INBOX_OAUTH_QUERY_STORAGE_KEY, JSON.stringify(payload));
    }
    if(isCalendarOAuthCallback){
      setCalendarTransient(CALENDAR_OAUTH_QUERY_STORAGE_KEY,JSON.stringify(payload));
    }
    ['code','error','state','scope','authuser','prompt','iss'].forEach((k)=>url.searchParams.delete(k));
    const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }catch(e){}
})();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});

// â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentUser = null;
let authTransitionInFlight = false;
let lastAuthenticatedUserId = null;
const handledInboxOAuthCodes = new Set();
const handledCalendarOAuthCodes = new Set();
let pendingLoginErrorMessage = '';

function getGoogleLoginStatePrefix(){return 'login:';}
function isGoogleLoginOauthState(state){return typeof state==='string'&&state.startsWith(getGoogleLoginStatePrefix());}
function getGoogleLoginRedirectUri(){return `${window.location.origin}${window.location.pathname}`;}
function rememberGoogleLoginState(state){
  setCalendarTransient(GOOGLE_LOGIN_OAUTH_STATE_KEY,state);
}
function getRememberedGoogleLoginState(){
  return getCalendarTransient(GOOGLE_LOGIN_OAUTH_STATE_KEY);
}
function forgetGoogleLoginState(){
  removeCalendarTransient(GOOGLE_LOGIN_OAUTH_STATE_KEY);
}
function setGoogleLoginDiagnostic(stage,details={}){
  const diagnostic={stage,details,href:window.location.href,ts:new Date().toISOString()};
  console.info('Google login diagnostic:', diagnostic);
  try{localStorage.setItem(GOOGLE_LOGIN_DIAG_KEY,JSON.stringify(diagnostic));}catch(e){}
}
function setPendingLoginError(message){
  pendingLoginErrorMessage=message||'';
  if(pendingLoginErrorMessage)showError(pendingLoginErrorMessage);
}
function getUrlParamFromSearchOrHash(url,key){
  const fromSearch = key === 'code' ? getQueryParamPreservePlus(url,key) : url.searchParams.get(key);
  if (fromSearch) return fromSearch;
  const hash = typeof url.hash === 'string' ? url.hash.replace(/^#/,'') : '';
  if (!hash) return null;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get(key);
}
function cleanGoogleLoginParams(url){
  ['code','state','scope','authuser','prompt','iss','id_token','credential'].forEach((k) => url.searchParams.delete(k));
  url.hash = '';
  window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
}
async function signInToSupabaseWithGoogleIdToken(idToken){
  const { data, error } = await supabaseClient.auth.signInWithIdToken({
    provider: 'google',
    token: idToken
  });
  if (error) throw error;
  if (data?.user) loginSuccess(data.user);
  return data;
}

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('form-login').style.display = tab==='login' ? '' : 'none';
  document.getElementById('form-register').style.display = tab==='register' ? '' : 'none';
  clearMessages();
}

function clearMessages() {
  document.getElementById('login-error').classList.remove('active');
  document.getElementById('login-success').classList.remove('active');
}

function showError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg; el.classList.add('active');
  document.getElementById('login-success').classList.remove('active');
}

function showSuccess(msg) {
  const el = document.getElementById('login-success');
  el.textContent = msg; el.classList.add('active');
  document.getElementById('login-error').classList.remove('active');
}

async function doEmailLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showError('Inserisci email e password.'); return; }
  const btn = document.getElementById('btn-email-login');
  btn.textContent = 'Accesso in corso...'; btn.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  btn.textContent = 'Accedi'; btn.disabled = false;
  if (error) showError('Email o password non corretti.');
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) { showError('Compila tutti i campi.'); return; }
  if (password.length < 6) { showError('La password deve avere almeno 6 caratteri.'); return; }
  const btn = document.getElementById('btn-register');
  btn.textContent = 'Creazione account...'; btn.disabled = true;
  const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: name } } });
  btn.textContent = 'Crea account'; btn.disabled = false;
  if (error) showError(error.message);
  else showSuccess('Account creato! Controlla la tua email per confermare la registrazione.');
}

function resetGoogleLoginButton() {
  const btn = document.getElementById('btn-google');
  if (!btn) return;
  btn.innerHTML = GOOGLE_LOGIN_BUTTON_HTML;
  btn.disabled = false;
}

async function doGoogleLogin() {
  const btn = document.getElementById('btn-google');
  btn.innerHTML = '<span class="spinning">↻</span> Connessione a Google...';
  btn.disabled = true;

  try {
    const state = `${getGoogleLoginStatePrefix()}${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const redirectUri = getGoogleLoginRedirectUri();
    rememberGoogleLoginState(state);
    setGoogleLoginDiagnostic('redirect_start',{state,redirectUri});

    const res = await fetch('/api/v1/auth/google/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUri, state, colorSet: normalizeColorSet(prefs.colorSet) })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }
    const payload = await res.json();
    const authUrl = payload?.data?.authUrl;
    if (!authUrl) throw new Error('URL login Google mancante');
    setGoogleLoginDiagnostic('redirect_to_google',{state,redirectUri});
    window.location.assign(authUrl);
  } catch (err) {
    console.warn('Errore avvio login Google:', err);
    setGoogleLoginDiagnostic('connect_failed',{message:String(err?.message||err||'')});
    setPendingLoginError('Login Google temporaneamente non disponibile. Puoi accedere con email e password.');
    resetGoogleLoginButton();
  }

  await fallbackSupabaseGoogleOAuth(btn);
}

function clearCorruptedPasswordAutofill() {
  const pwd = document.getElementById('login-password');
  if (!pwd) return;
  const value = pwd.value || '';
  if (!value) return;
  const looksCorrupted = value.includes('â€¢') || /^[âÃ€�•\s]+$/.test(value);
  if (looksCorrupted) pwd.value = '';
}

async function doLogout() {
  await supabaseClient.auth.signOut();
}

function handleSupabaseAuthErrorInQuery() {
  let url;
  try {
    url = new URL(window.location.href);
  } catch (e) {
    return false;
  }

  const authError = url.searchParams.get('error');
  if (!authError) return false;

  const state = url.searchParams.get('state');
  if (isGoogleLoginOauthState(state)) {
    forgetGoogleLoginState();
  }

  const rawDescription = url.searchParams.get('error_description') || '';
  let authDescription = rawDescription;
  try {
    authDescription = decodeURIComponent(rawDescription);
  } catch (err) {
    authDescription = rawDescription;
  }
  const isExternalCodeError = authDescription.toLowerCase().includes('external code');

  if (!isExternalCodeError) {
    showError(authDescription ? `Login Google non completato: ${authDescription}` : 'Login Google non completato. Riprova.');
  }

  ['error', 'error_code', 'error_description', 'code', 'state', 'scope', 'authuser', 'prompt', 'iss'].forEach((key) => {
    url.searchParams.delete(key);
  });

  window.history.replaceState(
    {},
    document.title,
    url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
  );
  return true;
}

async function tryExchangeGoogleLoginCode() {
  let url;
  try {
    url = new URL(window.location.href);
  } catch (e) {
    return false;
  }

  const state = getUrlParamFromSearchOrHash(url,'state');
  if (!isGoogleLoginOauthState(state)) return false;

  const code = getUrlParamFromSearchOrHash(url,'code');
  const directIdToken = getUrlParamFromSearchOrHash(url,'id_token') || getUrlParamFromSearchOrHash(url,'credential');
  const callbackError = getUrlParamFromSearchOrHash(url,'error');
  const callbackErrorDescription = getUrlParamFromSearchOrHash(url,'error_description');
  const expectedState = getRememberedGoogleLoginState();
  setGoogleLoginDiagnostic('callback_received',{hasCode:!!code,hasDirectIdToken:!!directIdToken,hasError:!!callbackError,state,expectedStateFound:!!expectedState,search:window.location.search,hash:window.location.hash});

  if (!expectedState || expectedState !== state) {
    cleanGoogleLoginParams(url);
    setPendingLoginError('Login Google non completato: stato OAuth non valido. Riprova.');
    return false;
  }

  try {
    if (callbackError) {
      throw new Error(callbackErrorDescription || callbackError);
    }

    if (directIdToken) {
      await signInToSupabaseWithGoogleIdToken(directIdToken);
      setGoogleLoginDiagnostic('signin_success',{mode:'direct_id_token'});
      forgetGoogleLoginState();
      cleanGoogleLoginParams(url);
      return true;
    }

    if (!code) {
      throw new Error('Google non ha restituito il codice OAuth.');
    }

    const res = await fetch('/api/v1/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: getGoogleLoginRedirectUri() })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }
    const payload = await res.json();
    const idToken = payload?.data?.idToken;
    if (!idToken) throw new Error('ID token Google mancante');

    await signInToSupabaseWithGoogleIdToken(idToken);
    setGoogleLoginDiagnostic('signin_success',{mode:'code_exchange'});

    forgetGoogleLoginState();
    cleanGoogleLoginParams(url);
    return true;
  } catch (err) {
    const message = String(err?.message || err || '');
    console.warn('Exchange login Google fallito:', err);
    forgetGoogleLoginState();
    cleanGoogleLoginParams(url);
    setGoogleLoginDiagnostic('exchange_failed',{message,hasCode:!!code,hasDirectIdToken:!!directIdToken,hasError:!!callbackError,state});
    setPendingLoginError(message ? `Login Google non completato: ${message}` : 'Login Google non completato. Riprova o accedi con email e password.');
    return false;
  }
}

async function tryExchangeSupabaseCodeSession() {
  let url;
  try {
    url = new URL(window.location.href);
  } catch (e) {
    return false;
  }

  const code = getQueryParamPreservePlus(url,'code');
  const state = url.searchParams.get('state');
  if (!code) return false;
  const pendingCalendarOauth = hasActiveCalendarOAuthPending();
  if (isMailboxOauthState(state) || isCalendarOauthState(state) || pendingCalendarOauth) return false;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      ['code', 'state'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(
        {},
        document.title,
        url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
      );
      return false;
    }
  } catch (_) {}

  try {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      const message = String(error.message || error || '');
      if (message.toLowerCase().includes('pkce code verifier not found')) {
        ['code', 'state'].forEach((k) => url.searchParams.delete(k));
        window.history.replaceState(
          {},
          document.title,
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
        );
        console.info('OAuth code ignorato: sessione/PKCE non più valida in questo browser.');
        return false;
      }
      console.warn('OAuth code exchange fallito:', error.message || error);
      showError('Login Google non completato. Riprova.');
      return false;
    }

    ['code', 'state'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(
      {},
      document.title,
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
    );
    return !!data?.session;
  } catch (err) {
    const message = String(err?.message || err || '');
    if (message.toLowerCase().includes('pkce code verifier not found')) {
      ['code', 'state'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(
        {},
        document.title,
        url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
      );
      console.info('OAuth code ignorato: sessione/PKCE non più valida in questo browser.');
      return false;
    }
    console.warn('Errore durante exchangeCodeForSession:', err);
    showError('Login Google non completato. Riprova.');
    return false;
  }
}

async function tryHandleMailboxOauthCallback() {
  let url;
  try {
    url = new URL(window.location.href);
  } catch (e) {
    return false;
  }

  let code = getQueryParamPreservePlus(url,'code');
  let state = url.searchParams.get('state');
  if (!code || !isMailboxOauthState(state)) {
    try {
      const stored = getStoredMailboxOauthPayload();
      if (stored) {
        const storedCode = typeof stored?.code === 'string' ? stored.code : '';
        const storedState = typeof stored?.state === 'string' ? stored.state : '';
        if (storedCode && isMailboxOauthState(storedState)) {
          code = storedCode;
          state = storedState;
        }
      }
    } catch (e) {}
  }
  if (!code || !isMailboxOauthState(state)) return false;

  const userId = extractUserIdFromMailboxState(state);
  if (!userId) return false;

  try {
    mailboxBackgroundSyncInProgress=true;
    mailboxConnectionError='';
    renderAll();
    const redirectUri = sessionStorage.getItem(MAILBOX_REDIRECT_URI_KEY) || getInboxConnectRedirectUri();
    const res = await fetchApi('/api/v1/inbox/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code, redirectUri })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`POST /inbox/google/exchange fallita (${res.status}): ${txt}`);
    }

    const payload = await res.json();
    const syncedAt = payload?.data?.account?.last_synced_at || new Date().toISOString();
    setInboxConnectionState(true, syncedAt, 'google', payload?.data?.account?.provider_email||null);
    mailboxOauthJustConnected=true;
    try{
      await loadInboxMessages();
    }catch(syncErr){
      console.warn('Mailbox collegata ma fetch messaggi non riuscito subito dopo OAuth:',syncErr);
      if(isMailboxAuthExpiredError(syncErr))markMailboxReconnectRequired();
    }

    ['code','state','scope','authuser','prompt','iss'].forEach((k)=>url.searchParams.delete(k));
    window.history.replaceState(
      {},
      document.title,
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
    );
    sessionStorage.removeItem(INBOX_OAUTH_QUERY_STORAGE_KEY);
    sessionStorage.removeItem('filo_inbox_oauth_state');
    sessionStorage.removeItem(MAILBOX_REDIRECT_URI_KEY);
    mailboxBackgroundSyncInProgress=false;
    return true;
  } catch (err) {
    const reason = err?.message ? String(err.message) : 'errore sconosciuto';
    console.warn('Errore callback mailbox OAuth:', reason, err);
    mailboxConnectionError = `Connessione mailbox non completata: ${reason}`;
    showError('Connessione mailbox non completata. Riprova.');
    sessionStorage.removeItem(INBOX_OAUTH_QUERY_STORAGE_KEY);
    sessionStorage.removeItem('filo_inbox_oauth_state');
    sessionStorage.removeItem(MAILBOX_REDIRECT_URI_KEY);
    mailboxBackgroundSyncInProgress=false;
    renderInboxControls();
    return false;
  }
}

async function tryHandleCalendarOauthCallback() {
  let url;
  try { url = new URL(window.location.href); } catch (e) { return false; }

  let code = getQueryParamPreservePlus(url,'code');
  let state = url.searchParams.get('state');
  const expectedState = getCalendarTransient('filo_calendar_oauth_state');
  const urlScope = url.searchParams.get('scope') || '';
  const hasPendingMarker = hasActiveCalendarOAuthPending();
  let hasCalendarIntent =
    isCalendarOauthState(state) ||
    (expectedState && state && expectedState === state) ||
    urlScope.includes('calendar');
  if (hasPendingMarker && isCalendarOauthState(state) && !code) {
    removeCalendarTransient(CALENDAR_OAUTH_QUERY_STORAGE_KEY);
    return false;
  }
  if (!code || !hasCalendarIntent) {
    try {
      const raw = getCalendarTransient(CALENDAR_OAUTH_QUERY_STORAGE_KEY);
      if (raw && hasPendingMarker && !state) {
        const stored = JSON.parse(raw);
        const storedCode = typeof stored?.code === 'string' ? stored.code : '';
        const storedState = typeof stored?.state === 'string' ? stored.state : '';
        const storedScope = typeof stored?.scope === 'string' ? stored.scope : '';
        const capturedAt = Number(stored?.capturedAt);
        const isFresh = Number.isFinite(capturedAt) ? (Date.now() - capturedAt) < CALENDAR_OAUTH_CALLBACK_MAX_AGE_MS : false;
        if (storedCode && isFresh) {
          code = storedCode;
          state = storedState || state;
          hasCalendarIntent =
            isCalendarOauthState(storedState) ||
            (expectedState && storedState && expectedState === storedState) ||
            storedScope.includes('calendar');
        }
      }
    } catch (e) {}
  }
  if (!code || !hasCalendarIntent) return false;
  if (expectedState && state !== expectedState) {
    clearCalendarOAuthFlowState();
    return false;
  }
  if(hasRecentCalendarExchangeCode(code)) return false;
  if (handledCalendarOAuthCodes.has(code)) return false;
  const userId =
    extractUserIdFromCalendarState(state) ||
    getCalendarTransient(CALENDAR_OAUTH_USER_ID_KEY) ||
    currentUser?.id ||
    null;
  if (!userId) return false;
  handledCalendarOAuthCodes.add(code);
  markCalendarExchangeCode(code);

  try {
    setCalendarDiagnostic('IN CORSO','exchange OAuth');
    const redirectUri = getCalendarTransient(CALENDAR_REDIRECT_URI_KEY) || getCalendarConnectRedirectUri();
    const {res,path}=await fetchCalendarApiWithFallback([
      '/api/v1/calendar/google/exchange',
      '/api/v1/calendar/exchange'
    ],{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId,code,redirectUri})
    },{retryOnHttpError:false});
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`POST ${path.replace('/api/v1','')} fallita (${res.status}): ${txt}`);
    }
    const payload = await res.json();
    const syncedAt = payload?.data?.account?.last_synced_at || new Date().toISOString();
    setCalendarConnectionState(true, syncedAt);
    saveCalendarToCache(userId);
    calendarOauthJustConnected=true;
    setCalendarDiagnostic('OK','account collegato');
    try{
      await loadCalendarEvents();
    }catch(loadErr){
      console.warn('Exchange calendario completato ma fetch eventi fallito:',loadErr);
      setCalendarDiagnostic('OK','collegato (fetch eventi non riuscito)');
    }
    ['code','state','scope','authuser','prompt','iss'].forEach((k)=>url.searchParams.delete(k));
    window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
    clearCalendarOAuthFlowState();
    return true;
  } catch (err) {
    const reason = err?.message ? String(err.message) : 'errore sconosciuto';
    console.warn('Errore callback calendario OAuth:', reason, err);
    ['code','state','scope','authuser','prompt','iss'].forEach((k)=>url.searchParams.delete(k));
    window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
    calendarConnectionError = `Connessione calendario non completata: ${reason}`;
    setCalendarDiagnostic('KO',reason);
    showError('Connessione Google Calendar non completata. Riprova.');
    clearCalendarOAuthFlowState();
    return false;
  }
}

function resolveCalendarCallbackPayloadPresence() {
  try {
    const raw = getCalendarTransient(CALENDAR_OAUTH_QUERY_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return typeof parsed?.code === 'string' && parsed.code.length > 0;
  } catch (e) {
    return false;
  }
}

function markCalendarPendingAsFailedIfNoCallbackDetected() {
  const pending = hasActiveCalendarOAuthPending();
  if (!pending) return;
  const hasStoredPayload = resolveCalendarCallbackPayloadPresence();
  let hasCodeInUrl = false;
  try {
    const url = new URL(window.location.href);
    hasCodeInUrl = !!url.searchParams.get('code');
  } catch (e) {}
  if (hasStoredPayload || hasCodeInUrl) return;

  const reason = 'callback OAuth non rilevato (controlla redirect URI Google)';
  setCalendarDiagnostic('KO', reason);
  calendarConnectionError = reason;
  clearCalendarOAuthFlowState();
}

function handleCalendarOAuthPageShow(event){
  const pending=hasActiveCalendarOAuthPending();
  if(!pending)return;
  if(event?.persisted){
    const reason='ritorno da cache browser (OAuth non completato o redirect URI non raggiunta)';
    setCalendarDiagnostic('KO',reason);
    calendarConnectionError=reason;
    clearCalendarOAuthFlowState();
    renderCalendarControls();
  }
}


function clearSupabaseAuthHashFromUrl() {
  if (!window.location.hash) return;
  const cleanUrl = window.location.pathname + (window.location.search || '');
  window.history.replaceState({}, document.title, cleanUrl);
}

async function trySetSupabaseSessionFromHash() {
  const rawHash = window.location.hash || '';
  if (!rawHash.includes('access_token') || !rawHash.includes('refresh_token')) return false;

  const hashParams = new URLSearchParams(rawHash.replace(/^#/, ''));
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');
  if (!access_token || !refresh_token) return false;

  try {
    const { data, error } = await supabaseClient.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.warn('Impossibile impostare la sessione da hash OAuth:', error.message || error);
      return false;
    }

    clearSupabaseAuthHashFromUrl();
    return !!data?.session;
  } catch (err) {
    console.warn('Errore durante setSession da hash OAuth:', err);
    return false;
  }
}

function showLoginScreen() {
  activeSessionUserId = null;
  currentUser = null;
  authTransitionInFlight = false;
  lastAuthenticatedUserId = null;
  handledInboxOAuthCodes.clear();
  const messageToRestore=pendingLoginErrorMessage;
  clearMessages();
  document.getElementById('app-shell').classList.remove('active');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('checkin-overlay').style.display = 'none';
  if(messageToRestore)showError(messageToRestore);
}

async function loginSuccess(user) {
  if (!user?.id) return;
  const shell = document.getElementById('app-shell');
  if (activeSessionUserId === user.id && shell.classList.contains('active')) return;

  activeSessionUserId = user.id;
  currentUser = user;
  Object.keys(smartSlotAccepted).forEach(key=>delete smartSlotAccepted[key]);
  Object.assign(smartSlotAccepted,loadSmartSlotAccepted());
  const cachedNotes = loadNotesFromCache();
  if (cachedNotes) notes = cachedNotes;
  const numericNoteIds = notes.map(n=>parseInt(n.id,10)).filter(n=>Number.isFinite(n));
  nextNoteId = numericNoteIds.length ? Math.max(...numericNoteIds)+1 : 100;
  tasks = [];
  nextTaskId = 100;
  document.getElementById('login-screen').style.display = 'none';
  shell.classList.add('active');

  const name = user.user_metadata?.full_name || user.email.split('@')[0];
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const firstName = name.split(' ')[0];

  document.getElementById('sidebar-initials').textContent = initials;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('profile-av-big').textContent = initials;
  document.getElementById('profile-name-disp').textContent = name;
  document.getElementById('pv-name').textContent = name;
  document.getElementById('pv-email').textContent = user.email;
  document.getElementById('profile-role-disp').textContent = user.email;
  document.getElementById('pf-name').value = name;
  document.getElementById('page-title').textContent = 'Buongiorno, ' + firstName;
  const calendarDiag = loadCalendarDiagnostic();
  if(calendarDiag)setCalendarDiagnostic(calendarDiag.status,calendarDiag.message);

  const cachedTasks = loadTasksFromCache();
  if (cachedTasks) {
    tasks = cachedTasks;
    normalizeCachedTasks();
    const numericTaskIds = tasks.map(t=>parseInt(t.id,10)).filter(n=>Number.isFinite(n));
    nextTaskId = numericTaskIds.length ? Math.max(...numericTaskIds)+1 : 100;
  }
  // Privacy: non ripristinare messaggi inbox da cache prima della verifica backend.
  // Dopo il login ricarichiamo sempre stato e messaggi della mailbox dell'utente autenticato.
  const cachedInbox = null;
  setInboxConnectionState(false,null);
  mailboxBackgroundSyncInProgress=hasPendingMailboxOauthCallback();
  const cachedCalendar = loadCalendarFromCache();
  if (cachedCalendar) {
    calendarEvents = Array.isArray(cachedCalendar.events)?cachedCalendar.events:[];
    setCalendarConnectionState(cachedCalendar.connected,cachedCalendar.lastSync);
  }
  await loadTasksFromApi();
  await loadNotesFromApi();
  await loadSuggestionStatesFromApi();
  // Evita fetch check-in da API al boot (in deploy degradati generava 500 a freddo).
  // Manteniamo solo recupero profilo/cache locale.
  if(!hasCheckinForDate(formatLocalDate()))hydrateLatestCheckinFromSupabaseProfile();
  initCheckin();
  restoreDayDraft();
  const cachedSuggestions=loadSuggestionsFromCache();
  if(cachedSuggestions?.suggestions?.length){
    renderDaySuggestions(ensureCelebrationSuggestion(cachedSuggestions.suggestions),{persist:false,updatedAt:cachedSuggestions.savedAt,source:'cache',originalSource:cachedSuggestions.source,degraded:cachedSuggestions.degraded,degradedReason:cachedSuggestions.degradedReason,degradedHint:cachedSuggestions.degradedHint});
  }
  renderAll();
  restorePostOauthPage();
  await tryHandleMailboxOauthCallback();
  await tryHandleCalendarOauthCallback();
  markCalendarPendingAsFailedIfNoCallbackDetected();
  renderAll();
  // Evita chiamate backend automatiche al boot:
  // in caso di deploy backend degradato causavano una cascata di 500 in console.
  // I sync restano disponibili via azioni esplicite dell'utente (Collega/Sincronizza/Salva/Analizza).
  mailboxBackgroundSyncInProgress=false;
  if(!cachedInbox&&!mailboxOauthJustConnected){
    setInboxConnectionState(false,null);
    INBOX.length=0;
  }
  if(currentUser?.id&&!mailboxOauthJustConnected){
    let shouldShowMailboxBootstrapSync=false;
    try{
      await loadInboxStatus();
      if(mailboxConnected){
        shouldShowMailboxBootstrapSync=true;
        mailboxBackgroundSyncInProgress=true;
        mailboxConnectionError='';
        renderAll();
        await loadInboxMessages();
      }
    }catch(err){
      console.warn('Impossibile aggiornare stato inbox da backend:',err);
      if(isMailboxAuthExpiredError(err)){
        markMailboxReconnectRequired();
      }else if(mailboxConnected){
        mailboxConnectionError='Mailbox collegata, ma aggiornamento non riuscito. Premi "Sincronizza" per riprovare.';
      }
    }finally{
      if(shouldShowMailboxBootstrapSync){
        mailboxBackgroundSyncInProgress=false;
        renderAll();
      }
    }
  }
  mailboxOauthJustConnected=false;
  if(currentUser?.id&&!calendarOauthJustConnected){
    try{
      await loadCalendarStatus();
      if(calendarConnected){
        await loadCalendarEvents();
      }
    }catch(err){
      console.warn('Impossibile aggiornare stato calendario da backend:',err);
      if(isCalendarAuthExpiredError(err)){
        markCalendarReconnectRequired();
      }
    }
  }
  calendarOauthJustConnected=false;
  if(!calendarConnected&&!cachedCalendar&&!calendarOauthJustConnected){
    calendarEvents=[];
  }
  renderAll();
  analyzePatterns();
  bindAnalyzeQuotaWatchers();
  scheduleAnalyzeQuotaBootstrapRefresh();
}

// ── DATI STATICI ──────────────────────────────────────────────────────────────
const INBOX=[];
const TAG_PALETTE=[{bg:"var(--color-primary-soft)",tc:"var(--color-primary-strong)"},{bg:"#E4F4EE",tc:"#0E6B4A"},{bg:"#FDF3DC",tc:"#8A5C00"},{bg:"#FDECEC",tc:"#9B2525"},{bg:"#F0EAF8",tc:"#5B2D8E"},{bg:"var(--color-subtle)",tc:"var(--color-muted-strong)"}];
const ENERGY_LABELS={1:"A pezzi",2:"Stanco",3:"Nella norma",4:"Bene",5:"Ottimo"};
const ENERGY_COLORS={1:"#9B2525",2:"#8A5C00",3:"var(--color-muted-strong)",4:"#0E6B4A",5:"var(--color-primary-strong)"};
const DAY_TEMPLATES=[
  {id:"focus",name:"Giornata focus",sub:"Pochi blocchi profondi, admin raccolto, chiusura netta.",tasks:["Scegliere la priorita principale","Preparare materiali per il blocco profondo","Chiudere follow-up rapidi"],blocks:[{time:"09:00",title:"Priorita principale",meta:"90 min · lavoro profondo"},{time:"10:45",title:"Follow-up rapidi",meta:"45 min · email, risposte, sblocco team"},{time:"14:00",title:"Secondo blocco focus",meta:"90 min · consegna importante"},{time:"16:00",title:"Admin e decisioni leggere",meta:"45 min · task brevi"},{time:"17:00",title:"Chiusura giornata",meta:"15 min · cosa resta e prossimo passo"}]},
  {id:"light",name:"Giornata leggera",sub:"Carico ridotto quando energia o sonno chiedono piu margine.",tasks:["Ridurre la lista alle 2 cose essenziali","Spostare un task non urgente","Preparare la ripartenza di domani"],blocks:[{time:"09:30",title:"Una priorita essenziale",meta:"60 min · focus sostenibile"},{time:"11:00",title:"Comunicazioni necessarie",meta:"45 min · risposte e coordinamento"},{time:"14:30",title:"Task operativo leggero",meta:"60 min · avanzamento senza pressione"},{time:"16:00",title:"Buffer recupero",meta:"30 min · margine protetto"},{time:"16:45",title:"Piano minimo per domani",meta:"15 min · chiusura"}]},
  {id:"week",name:"Settimana bilanciata",sub:"Un ritmo settimanale semplice: pianifica, produci, coordina, chiudi.",tasks:["Definire le 3 priorita della settimana","Bloccare due sessioni di deep work","Preparare revisione del venerdi"],blocks:[{time:"Lun",title:"Pianificazione e priorita",meta:"Obiettivi, vincoli, slot protetti"},{time:"Mar",title:"Deep work",meta:"Produzione senza riunioni non necessarie"},{time:"Mer",title:"Deep work + allineamenti",meta:"Avanzamento e check di meta settimana"},{time:"Gio",title:"Meeting e follow-up",meta:"Decisioni, risposte, coordinamento"},{time:"Ven",title:"Chiusura e retrospettiva",meta:"Pulizia task e preparazione prossima settimana"}]}
];
let tasks=[];
let nextTaskId=100;
let taskViewMode='list';
let taskImportRows=[];
let activeReminderTaskId=null;
let remindedTaskKeys=new Set();
let mailboxConnected=false;
let mailboxProvider=null;
let mailboxProviderEmail=null;
let mailboxLastSync=null;
let mailboxSyncInProgress=false;
let mailboxBackgroundSyncInProgress=false;
let mailboxConnectionError='';
let mailboxOauthJustConnected=false;
let otherMailboxConfigResolver=null;
let calendarOauthJustConnected=false;
let calendarConnected=false;
let calendarLastSync=null;
let calendarSyncInProgress=false;
let calendarConnectionError='';
let calendarEvents=[];
let templateEvents=[];
let selectedTemplateId='focus';
let calendarDiagnosticStatus='--';
let calendarDiagnosticTimeoutId=null;
let notes=[];
let nextNoteId=100;
let currentNoteId=null;
let inboxSelectedId=null;
let prefs={checkin:true,memoria:true,ai:true,celebrations:true,colorSet:'classic'};
let todayEnergy=null,todaySleep=null,todayStress=3;
let activeSessionUserId=null;
const ANALYZE_MIN_INTERVAL_MS=60000;
const ANALYZE_REMOTE_BACKOFF_MS=5*60*1000;
let analyzeCooldownTimeoutId=null;
let analyzeCooldownUntilMs=0;
let analyzeRequestInFlight=false;
let analyzeQuotaBootstrapTimeoutIds=[];
function clearAnalyzeQuotaBootstrapRetries(){
  analyzeQuotaBootstrapTimeoutIds.forEach(id=>clearTimeout(id));
  analyzeQuotaBootstrapTimeoutIds=[];
}
function scheduleAnalyzeQuotaBootstrapRefresh(){
  clearAnalyzeQuotaBootstrapRetries();
  const delays=[0,1500,5000];
  delays.forEach((delay)=>{
    const id=setTimeout(()=>{refreshAnalyzeQuota();},delay);
    analyzeQuotaBootstrapTimeoutIds.push(id);
  });
}

let analyzeRequestSeq=0;
let analyzeRemoteBackoffUntilMs=0;
let analyzeQuotaRefreshTimeoutId=null;
let analyzeQuotaWatchersBound=false;
let focusSessionTitle='';
let focusSessionSeconds=0;
let focusSessionIntervalId=null;
let focusSessionActionBtn=null;
let focusSessionSiblingBtn=null;
const LOCAL_API_BASES=['http://localhost:4000','http://127.0.0.1:4000'];
const SHOULD_TRY_LOCAL_API=['localhost','127.0.0.1'].includes(window.location.hostname);
function buildApiBaseCandidates(){
  const out=[];
  const origin=window.location.origin;
  out.push(origin);
  const configured=(window.FILO_API_BASE_URL||'').trim();
  if(configured)out.push(configured);
  if(SHOULD_TRY_LOCAL_API)out.push(...LOCAL_API_BASES);
  return out
    .filter((v,i,a)=>v&&a.indexOf(v)===i)
    .filter((base)=>{
      try{
        const u=new URL(base,window.location.origin);
        if(window.location.protocol==='https:'&&u.protocol==='http:')return false;
        return true;
      }catch(e){return false;}
    });
}
const API_BASES=buildApiBaseCandidates();
const APP_BUILD_ID=window.__FILO_BUILD_ID__||'dev';
const APP_BUILD_DATE=window.__FILO_BUILD_DATE__||new Date().toISOString().slice(0,10);
const TASKS_CACHE_PREFIX='filo_tasks_cache_';
const QUICKCHECK_CACHE_PREFIX='filo_quickcheck_cache_';
const NOTES_CACHE_PREFIX='filo_notes_cache_';
const NOTES_BACKFILL_DONE_PREFIX='filo_notes_backfill_done_';
const INBOX_CACHE_PREFIX='filo_inbox_cache_';
const CALENDAR_CACHE_PREFIX='filo_calendar_cache_';
const SUGGESTIONS_CACHE_PREFIX='filo_suggestions_cache_';
const SUGGESTION_DISMISSALS_PREFIX='filo_suggestion_dismissals_';
const SUGGESTION_STATES_PREFIX='filo_suggestion_states_';
const SUGGESTIONS_CACHE_TTL_MS=72*60*60*1000;
const POST_OAUTH_PAGE_KEY='filo_after_oauth_page';
const DAY_ANALYSIS_DRAFT_PREFIX='filo_day_analysis_draft_';
const FILO_LANDING_URL='https://filo-landing-gules.vercel.app/';
const SMART_SLOT_ACCEPTED_PREFIX='filo_smart_slot_accepted_';
const smartSlotState={};
const smartSlotAccepted={};
let suggestionStatesByKey={};
let currentDaySuggestionsForShare=[];

function normalizeApiTask(task){
  const uiPriorityMap={low:'bassa',medium:'normale',high:'alta',urgent:'urgente'};
  const status=['todo','in_progress','done'].includes(task?.status)?task.status:(task?.done?'done':'todo');
  return {
    id:String(task?.id||`tmp-${Date.now()}`),
    label:String(task?.title||task?.label||'Task senza titolo'),
    done:status==='done',
    status,
    priorita:uiPriorityMap[task?.priority]||task?.priorita||'normale',
    scadenza:task?.due_date?new Date(task.due_date).toLocaleDateString('it-IT'):(task?.scadenza||''),
    dueDateIso:task?.due_date||task?.dueDateIso||null,
    reminderAt:task?.reminder_at||task?.reminderAt||null,
    recurrence:task?.recurrence||'none',
    energyCost:Number(task?.energy_cost??task?.energyCost??3)||3,
    stressImpact:Number(task?.stress_impact??task?.stressImpact??3)||3,
    suggestionTitle:task?.suggestionTitle||task?.sourceSuggestionTitle||task?.source_suggestion_title||'',
    sourceNoteId:task?.sourceNoteId||task?.source_note_id||''
  };
}
function isTodayDate(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))return false;
  const today=new Date();
  return date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate();
}
function parseTaskDueDate(scadenza){
  const value=String(scadenza||'').trim();
  if(!value)return null;
  const lower=value.toLowerCase();
  if(lower==='oggi')return new Date();
  if(lower==='domani'){const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);return tomorrow;}
  const isoDate=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(isoDate)return new Date(Number(isoDate[1]),Number(isoDate[2])-1,Number(isoDate[3]));
  const italianDate=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(italianDate)return new Date(Number(italianDate[3]),Number(italianDate[2])-1,Number(italianDate[1]));
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?null:parsed;
}
function isTaskDueToday(task){return !task.done&&isTodayDate(parseTaskDueDate(task.scadenza));}
function dueTodayLabel(count){return `${count} in scadenza oggi`;}
function isPersistedTaskId(id){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id||''));}
function getTaskStatus(task){return ['todo','in_progress','done'].includes(task?.status)?task.status:(task?.done?'done':'todo');}
function setTaskStatusLocal(task,status){task.status=status;task.done=status==='done';}
function recurrenceLabel(value){return {daily:'Ogni giorno',weekly:'Ogni settimana',monthly:'Ogni mese'}[value]||'';}
function parseDateTimeLocalInput(value){const v=String(value||'').trim();if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
function formatReminderLabel(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function formatDueForUi(date){return date.toLocaleDateString('it-IT');}
function addRecurrenceInterval(date,recurrence){const next=new Date(date.getTime());if(recurrence==='daily')next.setDate(next.getDate()+1);else if(recurrence==='weekly')next.setDate(next.getDate()+7);else if(recurrence==='monthly')next.setMonth(next.getMonth()+1);return next;}
function getTaskDueDate(task){if(task?.dueDateIso){const d=new Date(task.dueDateIso);if(!Number.isNaN(d.getTime()))return d;}return parseTaskDueDate(task?.scadenza);}
function getTaskReminderDate(task){if(!task?.reminderAt)return null;const d=new Date(task.reminderAt);return Number.isNaN(d.getTime())?null:d;}
function normalizeCachedTasks(){tasks=tasks.map(t=>normalizeApiTask({id:t.id,title:t.label,status:getTaskStatus(t),priority:{bassa:'low',normale:'medium',alta:'high',urgente:'urgent'}[t.priorita]||'medium',due_date:t.dueDateIso||null,reminder_at:t.reminderAt||null,recurrence:t.recurrence||'none',energyCost:t.energyCost||3,stressImpact:t.stressImpact||3,suggestionTitle:t.suggestionTitle||'',sourceNoteId:t.sourceNoteId||''}));}
function setTaskViewMode(mode){taskViewMode=mode==='board'?'board':'list';renderTasks();}
function taskStatusLabel(status){return {todo:'Da fare',in_progress:'In corso',done:'Completati'}[status]||'Da fare';}

function normalizeSuggestionTaskTitle(title){return String(title||'').trim().replace(/\s+/g,' ').toLowerCase();}
function getSuggestionStateKey(title){return normalizeSuggestionTaskTitle(title).slice(0,220);}
function getSuggestionState(title){const key=getSuggestionStateKey(title);return key?suggestionStatesByKey[key]||null:null;}
function setSuggestionStateLocal(title,status){
  const key=getSuggestionStateKey(title);
  const suggestionTitle=String(title||'').trim();
  if(!key||!suggestionTitle)return null;
  const state={suggestionKey:key,suggestionTitle,status,updatedAt:new Date().toISOString()};
  suggestionStatesByKey={...suggestionStatesByKey,[key]:state};
  saveSuggestionStatesToCache();
  return state;
}
async function loadSuggestionStatesFromApi(){
  suggestionStatesByKey=loadSuggestionStatesFromCache();
  if(!currentUser?.id)return;
  try{
    const dayKey=getCurrentLocalDayKey();
    const res=await fetchApi(`/api/v1/suggestion-states?userId=${encodeURIComponent(currentUser.id)}&dayKey=${encodeURIComponent(dayKey)}`);
    if(!res.ok)throw new Error(`GET /suggestion-states fallita (${res.status})`);
    const payload=await res.json();
    const rows=Array.isArray(payload?.data)?payload.data:[];
    const next={};
    rows.forEach((row)=>{
      const key=String(row?.suggestion_key||row?.suggestionKey||'').trim();
      const status=String(row?.status||'');
      if(key&&['added','completed','dismissed'].includes(status)){
        next[key]={suggestionKey:key,suggestionTitle:String(row?.suggestion_title||row?.suggestionTitle||''),status,updatedAt:row?.updated_at||row?.updatedAt||''};
      }
    });
    suggestionStatesByKey={...suggestionStatesByKey,...next};
    saveSuggestionStatesToCache();
  }catch(err){
    console.warn('Impossibile caricare stati suggerimenti, uso cache locale:',err);
  }
}
async function persistSuggestionState(title,status){
  const state=setSuggestionStateLocal(title,status);
  if(!state||!currentUser?.id)return state;
  try{
    const res=await fetchApi('/api/v1/suggestion-states',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        userId:currentUser.id,
        dayKey:getCurrentLocalDayKey(),
        suggestionKey:state.suggestionKey,
        suggestionTitle:state.suggestionTitle,
        status
      })
    });
    if(!res.ok)throw new Error(`PUT /suggestion-states fallita (${res.status})`);
    const payload=await res.json();
    const saved=payload?.data;
    if(saved?.suggestion_key){
      suggestionStatesByKey={...suggestionStatesByKey,[saved.suggestion_key]:{suggestionKey:saved.suggestion_key,suggestionTitle:saved.suggestion_title||state.suggestionTitle,status:saved.status||status,updatedAt:saved.updated_at||state.updatedAt}};
      saveSuggestionStatesToCache();
    }
  }catch(err){
    console.warn('Stato suggerimento salvato solo localmente:',err);
  }
  return state;
}
function isSuggestionCompletedOrDismissed(title){
  const status=getSuggestionState(title)?.status;
  return status==='completed'||status==='dismissed'||isSuggestionDismissed(title);
}
function isSuggestionAdded(title){return getSuggestionState(title)?.status==='added'||isSuggestionTaskOpen(title);}
async function completeSuggestionTitle(title,button=null){
  const suggestionTitle=String(title||'').trim();
  if(!suggestionTitle)return;
  dismissSuggestionTitle(suggestionTitle);
  await persistSuggestionState(suggestionTitle,'completed');
  const card=button?.closest?.('.sugg-card');
  const actionButtons=Array.from(card?.querySelectorAll?.('.sugg-actions button')||[]);
  const visibleDoneButton=button||actionButtons.find((candidate)=>candidate.dataset.suggestionDoneTitle===suggestionTitle)||actionButtons.find((candidate)=>candidate.dataset.suggestionTaskTitle===suggestionTitle)||null;
  actionButtons.forEach((candidate)=>{
    if(candidate!==visibleDoneButton)candidate.style.display='none';
  });
  if(button){
    button.textContent='✓ Fatto';
    button.disabled=true;
    button.setAttribute('aria-pressed','true');
  }
  if(visibleDoneButton&&!button){
    visibleDoneButton.textContent='✓ Fatto';
    visibleDoneButton.disabled=true;
    visibleDoneButton.setAttribute('aria-pressed','true');
  }
}
async function completeSuggestionFromButton(title,button=null){
  await completeSuggestionTitle(title,button);
}
function getTaskSuggestionTitle(task){
  const explicit=String(task?.suggestionTitle||task?.sourceSuggestionTitle||'').trim();
  if(explicit)return explicit;
  const label=String(task?.label||'').trim();
  const suffixes=[
    /\s*\(focus\s+45\s+min\)\s*$/i,
    /\s*\(da ripianificare\)\s*$/i,
    /\s*\(riprogrammare pomeriggio\)\s*$/i
  ];
  for(const suffix of suffixes){
    if(suffix.test(label))return label.replace(suffix,'').trim();
  }
  const reminder=label.match(/^Reminder:\s*(.*?)\s*\(entro oggi\)\s*$/i);
  if(reminder?.[1])return reminder[1].trim();
  const checklist=label.match(/^Checklist:\s*(.+?)\s*$/i);
  if(checklist?.[1])return checklist[1].trim();
  const review=label.match(/^Review fine giornata:\s*(.+?)\s*$/i);
  if(review?.[1])return review[1].trim();
  return label;
}
function shouldSyncTaskSuggestionState(task){
  const explicit=String(task?.suggestionTitle||task?.sourceSuggestionTitle||'').trim();
  if(explicit)return true;
  const title=getTaskSuggestionTitle(task);
  return !!(getSuggestionState(title)||isSuggestionDismissed(title));
}
function isSuggestionTaskOpen(title){
  const normalized=normalizeSuggestionTaskTitle(title);
  return !!normalized&&tasks.some(t=>!t.done&&(
    normalizeSuggestionTaskTitle(t.label)===normalized||
    normalizeSuggestionTaskTitle(getTaskSuggestionTitle(t))===normalized
  ));
}
function loadDismissedSuggestionTitles(){
  const key=getSuggestionDismissalsCacheKey();
  if(!key)return [];
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(parsed)?parsed.map(normalizeSuggestionTaskTitle).filter(Boolean):[];
  }catch(e){return [];}
}
function saveDismissedSuggestionTitles(titles){
  const key=getSuggestionDismissalsCacheKey();
  if(!key)return;
  const unique=[...new Set((Array.isArray(titles)?titles:[]).map(normalizeSuggestionTaskTitle).filter(Boolean))];
  try{localStorage.setItem(key,JSON.stringify(unique));}catch(e){}
}
function isSuggestionDismissed(title){const normalized=normalizeSuggestionTaskTitle(title);return !!normalized&&loadDismissedSuggestionTitles().includes(normalized);}
function dismissSuggestionTitle(title){
  const normalized=normalizeSuggestionTaskTitle(title);
  if(!normalized)return;
  const dismissed=loadDismissedSuggestionTitles();
  if(!dismissed.includes(normalized))saveDismissedSuggestionTitles([...dismissed,normalized]);
}
function restoreSuggestionTitle(title){
  const normalized=normalizeSuggestionTaskTitle(title);
  if(!normalized)return;
  saveDismissedSuggestionTitles(loadDismissedSuggestionTitles().filter(t=>t!==normalized));
}
function setSuggestionTaskButtonState(button,added){
  if(!button)return;
  button.textContent=added?'✓ Aggiunto':'+ Aggiungi ai task';
  button.style.color=added?'#0E6B4A':'#6F6A61';
  button.setAttribute('aria-pressed',added?'true':'false');
}
function refreshSuggestionTaskButtons(){
  document.querySelectorAll('[data-suggestion-task-title]').forEach((button)=>{
    const title=button.getAttribute('data-suggestion-task-title')||'';
    if(isSuggestionCompletedOrDismissed(title)){
      button.closest('.sugg-card')?.remove();
      return;
    }
    setSuggestionTaskButtonState(button,isSuggestionAdded(title));
  });
  const container=document.getElementById('suggestions-container');
  const nb=document.getElementById('nb-sugg');
  if(container&&nb){
    const visible=container.querySelectorAll('.sugg-card').length;
    nb.textContent=String(visible);
    if(visible===0)container.innerHTML='<div class="empty-state"><div class="empty-title">Nessun suggerimento</div></div>';
  }
}
function addSuggestionCompletionButtons(container){
  if(!container)return;
  container.querySelectorAll('[data-suggestion-task-title]').forEach((addButton)=>{
    const title=addButton.getAttribute('data-suggestion-task-title')||'';
    const alreadyDoneButton=Array.from(addButton.parentElement?.querySelectorAll?.('[data-suggestion-done-title]')||[]).some((button)=>button.dataset.suggestionDoneTitle===title);
    if(!title||alreadyDoneButton)return;
    const doneButton=document.createElement('button');
    doneButton.type='button';
    doneButton.textContent='✓ Fatto';
    doneButton.dataset.suggestionDoneTitle=title;
    doneButton.setAttribute('aria-label',`Segna come fatto: ${title}`);
    doneButton.style.cssText='font-family:inherit;font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid rgba(14,107,74,0.28);background:#E4F4EE;color:#0E6B4A;cursor:pointer;';
    doneButton.addEventListener('click',()=>completeSuggestionFromButton(title,doneButton));
    addButton.insertAdjacentElement('afterend',doneButton);
  });
}
function buildShareableDayPlan(suggestions=currentDaySuggestionsForShare){
  const list=(Array.isArray(suggestions)?suggestions:[])
    .map((s)=>String(s?.titolo||'').trim())
    .filter(Boolean)
    .slice(0,5);
  if(!list.length)return '';
  return [
    'Oggi Filo mi suggerisce di concentrarmi su:',
    '',
    ...list.map((title,idx)=>`${idx+1}. ${title}`),
    '',
    'Generato con Filo',
    FILO_LANDING_URL
  ].join('\n');
}
async function copyDayPlan(button=null){
  const text=buildShareableDayPlan();
  if(!text)return;
  const originalText=button?.textContent||'Copia piano';
  try{
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard non disponibile');
    await navigator.clipboard.writeText(text);
    if(button){
      button.textContent='✓ Piano copiato';
      button.disabled=true;
      setTimeout(()=>{button.textContent=originalText;button.disabled=false;},2200);
    }
  }catch(err){
    window.prompt('Copia il piano da qui:',text);
    if(button)button.textContent=originalText;
  }
}

function getDayDraftStorageKey(){
  if(!currentUser?.id)return null;
  return `${DAY_ANALYSIS_DRAFT_PREFIX}${currentUser.id}`;
}
function getDayDraftFromInputs(){
  return {
    agenda:document.getElementById('agenda-input')?.value||'',
    pending:document.getElementById('pending-input')?.value||'',
    dayEnd:document.getElementById('day-end-input')?.value||'',
    availability:document.getElementById('day-availability-input')?.value||'',
    dayFocus:document.getElementById('day-focus-input')?.value||''
  };
}
function applyDayDraftToInputs(draft){
  if(!draft||typeof draft!=='object')return;
  const agenda=document.getElementById('agenda-input');
  const pending=document.getElementById('pending-input');
  const dayEnd=document.getElementById('day-end-input');
  const availability=document.getElementById('day-availability-input');
  const dayFocus=document.getElementById('day-focus-input');
  if(agenda&&typeof draft.agenda==='string')agenda.value=draft.agenda;
  if(pending&&typeof draft.pending==='string')pending.value=draft.pending;
  if(dayEnd&&typeof draft.dayEnd==='string')dayEnd.value=draft.dayEnd;
  if(availability&&typeof draft.availability==='string')availability.value=draft.availability;
  if(dayFocus&&typeof draft.dayFocus==='string')dayFocus.value=draft.dayFocus;
}
function saveDayDraft(){
  const key=getDayDraftStorageKey();
  if(!key)return;
  try{localStorage.setItem(key,JSON.stringify(getDayDraftFromInputs()));}catch(e){}
}
function restoreDayDraft(){
  const key=getDayDraftStorageKey();
  if(!key)return;
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return;
    applyDayDraftToInputs(JSON.parse(raw));
  }catch(e){}
}
function initDayDraftAutosave(){
  ['agenda-input','pending-input','day-end-input','day-availability-input','day-focus-input'].forEach((id)=>{
    const el=document.getElementById(id);
    if(!el||el.dataset.draftBound==='1')return;
    el.addEventListener('input',saveDayDraft);
    el.addEventListener('change',saveDayDraft);
    el.dataset.draftBound='1';
  });
}
function getTaskCacheKey(){return currentUser?.id?`${TASKS_CACHE_PREFIX}${currentUser.id}`:null;}
function getSmartSlotAcceptedKey(){return currentUser?.id?`${SMART_SLOT_ACCEPTED_PREFIX}${currentUser.id}`:null;}
function loadSmartSlotAccepted(){const key=getSmartSlotAcceptedKey();if(!key)return {};try{const raw=localStorage.getItem(key);const parsed=raw?JSON.parse(raw):{};return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};}catch(e){return {};}}
function saveSmartSlotAccepted(){const key=getSmartSlotAcceptedKey();if(!key)return;try{localStorage.setItem(key,JSON.stringify(smartSlotAccepted));}catch(e){}}
function saveTasksToCache(){const key=getTaskCacheKey();if(!key)return;try{localStorage.setItem(key,JSON.stringify(tasks));}catch(e){}}
function loadTasksFromCache(){const key=getTaskCacheKey();if(!key)return null;try{const raw=localStorage.getItem(key);const parsed=raw?JSON.parse(raw):null;return Array.isArray(parsed)?parsed:null;}catch(e){return null;}}
function getNotesCacheKey(){return currentUser?.id?`${NOTES_CACHE_PREFIX}${currentUser.id}`:null;}
function getNotesBackfillDoneKey(){return currentUser?.id?`${NOTES_BACKFILL_DONE_PREFIX}${currentUser.id}`:null;}
function saveNotesToCache(){const key=getNotesCacheKey();if(!key)return;try{localStorage.setItem(key,JSON.stringify(notes));}catch(e){}}
function loadNotesFromCache(){const key=getNotesCacheKey();if(!key)return null;try{const raw=localStorage.getItem(key);const parsed=raw?JSON.parse(raw):null;return Array.isArray(parsed)?parsed:null;}catch(e){return null;}}
function getInboxCacheKey(userIdOverride=null){const uid=userIdOverride||currentUser?.id;return uid?`${INBOX_CACHE_PREFIX}${uid}`:null;}
function saveInboxToCache(){const key=getInboxCacheKey();if(!key)return;try{localStorage.setItem(key,JSON.stringify({connected:mailboxConnected,lastSync:mailboxLastSync,messages:INBOX}));}catch(e){}}
function loadInboxFromCache(){const key=getInboxCacheKey();if(!key)return null;try{const raw=localStorage.getItem(key);const parsed=raw?JSON.parse(raw):null;if(!parsed||!Array.isArray(parsed.messages))return null;return parsed;}catch(e){return null;}}
function removeInboxFromCache(userIdOverride=null){const key=getInboxCacheKey(userIdOverride);if(!key)return;try{localStorage.removeItem(key);}catch(e){}}
function clearInboxMessages(){INBOX.length=0;inboxSelectedId=null;}

function getCalendarCacheKey(userIdOverride=null){const uid=userIdOverride||currentUser?.id;return uid?`${CALENDAR_CACHE_PREFIX}${uid}`:null;}
function getSuggestionsCacheKey(){return currentUser?.id?`${SUGGESTIONS_CACHE_PREFIX}${currentUser.id}`:null;}
function getSuggestionDismissalsCacheKey(){return currentUser?.id?`${SUGGESTION_DISMISSALS_PREFIX}${currentUser.id}_${getCurrentLocalDayKey()}`:null;}
function getSuggestionStatesCacheKey(){return currentUser?.id?`${SUGGESTION_STATES_PREFIX}${currentUser.id}_${getCurrentLocalDayKey()}`:null;}
function saveSuggestionStatesToCache(){
  const key=getSuggestionStatesCacheKey();
  if(!key)return;
  try{localStorage.setItem(key,JSON.stringify(suggestionStatesByKey));}catch(e){}
}
function loadSuggestionStatesFromCache(){
  const key=getSuggestionStatesCacheKey();
  if(!key)return {};
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'{}');
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch(e){return {};}
}
function saveCalendarToCache(userIdOverride=null){
  const key=getCalendarCacheKey(userIdOverride);
  if(!key)return;
  try{localStorage.setItem(key,JSON.stringify({connected:calendarConnected,lastSync:calendarLastSync,events:calendarEvents}));}catch(e){}
}

function getCurrentLocalDayKey(){
  const now=new Date();
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,'0');
  const d=String(now.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function saveSuggestionsToCache(suggestions,metadata={}){
  const key=getSuggestionsCacheKey();
  if(!key)return;
  const safeSuggestions=Array.isArray(suggestions)?suggestions:[];
  const source=normalizeSuggestionSource(metadata?.source);
  try{
    localStorage.setItem(key,JSON.stringify({savedAt:new Date().toISOString(),dayKey:getCurrentLocalDayKey(),suggestions:safeSuggestions,source,degraded:Boolean(metadata?.degraded),degradedReason:metadata?.degradedReason||'',degradedHint:metadata?.degradedHint||''}));
  }catch(e){}
}
function loadSuggestionsFromCache(){
  const key=getSuggestionsCacheKey();
  if(!key)return null;
  try{
    const raw=localStorage.getItem(key);
    const parsed=raw?JSON.parse(raw):null;
    if(!parsed)return null;

    // Compatibilità: vecchi formati cache (array puro) o object senza savedAt.
    if(Array.isArray(parsed)){
      return {savedAt:null,suggestions:parsed,source:'unknown',degraded:false,degradedReason:'',degradedHint:''};
    }
    if(!Array.isArray(parsed.suggestions))return null;
    if(!parsed.savedAt){
      return {savedAt:null,suggestions:parsed.suggestions,source:normalizeSuggestionSource(parsed.source),degraded:Boolean(parsed.degraded)||normalizeSuggestionSource(parsed.source)==='local-fallback',degradedReason:parsed.degradedReason||'',degradedHint:parsed.degradedHint||''};
    }
    const savedAtMs=new Date(parsed.savedAt).getTime();
    if(!Number.isFinite(savedAtMs)||savedAtMs<=0)return {savedAt:null,suggestions:parsed.suggestions,source:normalizeSuggestionSource(parsed.source),degraded:Boolean(parsed.degraded)||normalizeSuggestionSource(parsed.source)==='local-fallback',degradedReason:parsed.degradedReason||'',degradedHint:parsed.degradedHint||''};
    const currentDayKey=getCurrentLocalDayKey();
    if(parsed.dayKey&&parsed.dayKey===currentDayKey)return {...parsed,source:normalizeSuggestionSource(parsed.source),degraded:Boolean(parsed.degraded)||normalizeSuggestionSource(parsed.source)==='local-fallback',degradedReason:parsed.degradedReason||'',degradedHint:parsed.degradedHint||''};
    if((Date.now()-savedAtMs)>SUGGESTIONS_CACHE_TTL_MS)return null;
    return {...parsed,source:normalizeSuggestionSource(parsed.source),degraded:Boolean(parsed.degraded)||normalizeSuggestionSource(parsed.source)==='local-fallback',degradedReason:parsed.degradedReason||'',degradedHint:parsed.degradedHint||''};
  }catch(e){return null;}
}
function loadCalendarFromCache(userIdOverride=null){
  const key=getCalendarCacheKey(userIdOverride);
  if(!key)return null;
  try{
    const raw=localStorage.getItem(key);
    const parsed=raw?JSON.parse(raw):null;
    if(!parsed||!Array.isArray(parsed.events))return null;
    return {...parsed,source:normalizeSuggestionSource(parsed.source),degraded:Boolean(parsed.degraded),degradedReason:parsed.degradedReason||'',degradedHint:parsed.degradedHint||''};
  }catch(e){return null;}
}

function getCalendarDiagKey(){
  const userKey =
    currentUser?.id ||
    getCalendarTransient(CALENDAR_OAUTH_USER_ID_KEY) ||
    'global';
  return `${CALENDAR_DIAG_PREFIX}${userKey}`;
}
function setCalendarDiagnostic(status,message){
  calendarDiagnosticStatus=status;
  const text=`Ultimo tentativo connessione: ${status}${message?` · ${message}`:''}`;
  const el=document.getElementById('calendar-diagnostic');
  if(el)el.textContent=text;
  if(calendarDiagnosticTimeoutId){
    clearTimeout(calendarDiagnosticTimeoutId);
    calendarDiagnosticTimeoutId=null;
  }
  if(status==='IN CORSO'){
    calendarDiagnosticTimeoutId=setTimeout(()=>{
      const pending=hasActiveCalendarOAuthPending();
      if(calendarDiagnosticStatus==='IN CORSO'&&pending){
        const reason='timeout callback OAuth (nessuna risposta da Google)';
        calendarConnectionError=reason;
        setCalendarDiagnostic('KO',reason);
        clearCalendarOAuthFlowState();
        renderCalendarControls();
      }
    },20000);
  }
  const key=getCalendarDiagKey();
  if(key){
    try{
      if(status==='IN CORSO'||status==='KO'){
        localStorage.removeItem(key);
      }else{
        localStorage.setItem(key,JSON.stringify({status,message,ts:new Date().toISOString()}));
      }
    }catch(e){}
  }
}
function loadCalendarDiagnostic(){
  const keys=[];
  const primary=getCalendarDiagKey();
  if(primary)keys.push(primary);
  keys.push(`${CALENDAR_DIAG_PREFIX}global`);
  try{
    for(const key of keys){
      const raw=localStorage.getItem(key);
      const parsed=raw?JSON.parse(raw):null;
      if(!parsed)continue;
      if(parsed?.status==='IN CORSO'){
        localStorage.removeItem(key);
        continue;
      }
      if(parsed?.status==='KO'){
        localStorage.removeItem(key);
        continue;
      }
      const parsedTs=parsed?.ts?new Date(parsed.ts).getTime():null;
      const isStale=Number.isFinite(parsedTs)?(Date.now()-parsedTs)>(10*60*1000):false;
      if(isStale){
        localStorage.removeItem(key);
        continue;
      }
      return parsed&&typeof parsed.status==='string'?parsed:null;
    }
    return null;
  }catch(e){return null;}
}
function restorePostOauthPage(){const id=sessionStorage.getItem(POST_OAUTH_PAGE_KEY);if(!id)return;sessionStorage.removeItem(POST_OAUTH_PAGE_KEY);const pageEl=document.getElementById(`page-${id}`);if(!pageEl)return;const navEl=Array.from(document.querySelectorAll('.nav-item')).find(el=>el.getAttribute('onclick')===`showPage('${id}',this)`);showPage(id,navEl||null);}
function getInboxConnectRedirectUri(){return `${window.location.origin}${window.location.pathname}`;}
function getInboxStatePrefix(){return 'mailbox:';}
function isMailboxOauthState(state){return typeof state==='string'&&state.startsWith(getInboxStatePrefix());}
function extractUserIdFromMailboxState(state){if(!isMailboxOauthState(state))return null;const [,userId]=state.split(':');return userId||null;}
function getStoredMailboxOauthPayload(){
  try{
    const raw=sessionStorage.getItem(INBOX_OAUTH_QUERY_STORAGE_KEY);
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function hasPendingMailboxOauthCallback(){
  try{
    const url=new URL(window.location.href);
    const code=getQueryParamPreservePlus(url,'code');
    const state=url.searchParams.get('state');
    if(code&&isMailboxOauthState(state))return true;
  }catch(e){}
  const stored=getStoredMailboxOauthPayload();
  return !!(stored?.code&&isMailboxOauthState(stored?.state));
}
function isUuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function getCalendarConnectRedirectUri(){return `${window.location.origin}${window.location.pathname}`;}
function getCalendarStatePrefix(){return 'calendar:';}
function isCalendarOauthState(state){return typeof state==='string'&&state.startsWith(getCalendarStatePrefix());}
function extractUserIdFromCalendarState(state){if(!isCalendarOauthState(state))return null;const [,userId]=state.split(':');return userId||null;}
function formatInboxTime(ts){if(!ts)return '';const d=new Date(ts);if(Number.isNaN(d.getTime()))return '';return d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});}
function formatCalendarTime(ts){if(!ts)return '';const d=new Date(ts);if(Number.isNaN(d.getTime()))return '';return d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});}
function escapeHtml(str){return String(str??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
function avatarFromSender(sender){const raw=(sender||'').replace(/<[^>]+>/g,'').replace(/["']/g,'').trim();const display=raw||'Sconosciuto';const initials=display.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?';return{display,initials};}
function mapInboxMessageToUi(item){const labels=Array.isArray(item?.labels)?item.labels:[];const unread=labels.includes('UNREAD');const sender=avatarFromSender(item?.sender);return{id:item?.id,from:sender.display,subj:item?.subject||'(Senza oggetto)',prev:item?.snippet||'',time:formatInboxTime(item?.received_at||item?.created_at),source:'Email',initials:sender.initials,bg:'var(--color-primary-soft)',tc:'var(--color-primary-strong)',unread};}
function isMailboxAuthExpiredError(err){
  const message=(err?.message?String(err.message):'').toLowerCase();
  return message.includes('(401)')&&(message.includes('invalid_grant')||message.includes('token has been expired or revoked')||message.includes('refresh token google fallito'));
}
function isCalendarAuthExpiredError(err){
  const message=(err?.message?String(err.message):'').toLowerCase();
  return message.includes('(401)')&&(message.includes('invalid_grant')||message.includes('token has been expired or revoked')||message.includes('refresh token google calendario fallito'));
}
function markMailboxReconnectRequired(){
  setInboxConnectionState(false,null);
  mailboxConnectionError='Sessione Google Mail scaduta. Ricollega la mailbox.';
  // Privacy: svuotiamo messaggi e cache, così non restano email di una sessione precedente.
  saveInboxToCache();
}
function markCalendarReconnectRequired(userIdOverride=null){
  setCalendarConnectionState(false,null);
  calendarConnectionError='Sessione Google Calendar scaduta. Ricollega il calendario.';
  saveCalendarToCache(userIdOverride);
}
async function loadInboxMessages(limit=50){if(!currentUser?.id)return;const res=await fetchApi(`/api/v1/inbox/messages?userId=${encodeURIComponent(currentUser.id)}&limit=${limit}`);if(!res.ok){const txt=await res.text();throw new Error(`GET /inbox/messages fallita (${res.status}): ${txt}`);}const payload=await res.json();const messages=Array.isArray(payload?.data)?payload.data:[];INBOX.length=0;messages.forEach(msg=>INBOX.push(mapInboxMessageToUi(msg)));saveInboxToCache();}
async function loadInboxStatus(){if(!currentUser?.id)return;const res=await fetchApi(`/api/v1/inbox/status?userId=${encodeURIComponent(currentUser.id)}`);if(!res.ok){const txt=await res.text();throw new Error(`GET /inbox/status fallita (${res.status}): ${txt}`);}const payload=await res.json();const data=payload?.data||{};setInboxConnectionState(!!data.connected,data.last_synced_at||null,data.provider||null,data.provider_email||null);}
function setInboxConnectionState(connected,lastSyncedAt,provider=null,providerEmail=null){mailboxConnected=!!connected;mailboxProvider=connected?provider:null;mailboxProviderEmail=connected&&providerEmail?String(providerEmail).trim():null;mailboxLastSync=lastSyncedAt?new Date(lastSyncedAt).getTime():null;if(connected){mailboxConnectionError='';return;}mailboxProviderEmail=null;clearInboxMessages();removeInboxFromCache();}
function setCalendarConnectionState(connected,lastSyncedAt){calendarConnected=!!connected;calendarLastSync=lastSyncedAt?new Date(lastSyncedAt).getTime():null;if(connected)calendarConnectionError='';saveCalendarToCache();}
function mapCalendarEventToUi(item){
  const startRaw=item?.starts_at||item?.start;
  const endRaw=item?.ends_at||item?.end;
  const start=startRaw?new Date(startRaw):null;
  const end=endRaw?new Date(endRaw):null;
  const allDay=!!item?.all_day;
  const description=typeof item?.description==='string'?item.description.trim():'';
  const location=typeof item?.location==='string'?item.location.trim():'';
  const link=typeof item?.html_link==='string'?item.html_link.trim():'';
  return{
    id:item?.id||item?.provider_event_id||`event-${Math.random().toString(36).slice(2)}`,
    title:item?.title||'(Senza titolo)',
    meta:allDay?'Tutto il giorno':(end&&start&&!Number.isNaN(end.getTime())&&!Number.isNaN(start.getTime()))?`${formatCalendarTime(start)} - ${formatCalendarTime(end)}`:formatCalendarTime(start),
    time:allDay?'--:--':formatCalendarTime(start)||'--:--',
    hl:false,
    description:description||'Nessuna descrizione disponibile.',
    location:location||'',
    startsAt:start&&!Number.isNaN(start.getTime())?start.toISOString():null,
    endsAt:end&&!Number.isNaN(end.getTime())?end.toISOString():null,
    allDay,
    htmlLink:link||''
  };
}
function getCalendarEventById(id){const key=String(id);return calendarEvents.find(ev=>String(ev.id)===key)||null;}
function closeCalendarEventModal(){const modal=document.getElementById('calendar-event-modal');if(modal)modal.style.display='none';}
function openCalendarEventModal(id){
  const event=getCalendarEventById(id);
  if(!event)return;
  const modal=document.getElementById('calendar-event-modal');
  const titleEl=document.getElementById('calendar-modal-title');
  const timeEl=document.getElementById('calendar-modal-time');
  const descEl=document.getElementById('calendar-modal-description');
  const locationEl=document.getElementById('calendar-modal-location');
  const linkWrap=document.getElementById('calendar-modal-link-wrap');
  const linkEl=document.getElementById('calendar-modal-link');
  if(!modal||!titleEl||!timeEl||!descEl||!locationEl||!linkWrap||!linkEl)return;
  titleEl.textContent=event.title||'(Senza titolo)';
  if(event.allDay){
    timeEl.textContent='Orario: Tutto il giorno';
  }else{
    const startsLabel=event.startsAt?formatCalendarTime(event.startsAt):event.time||'--:--';
    const endsLabel=event.endsAt?formatCalendarTime(event.endsAt):'';
    timeEl.textContent=`Orario: ${startsLabel}${endsLabel?` - ${endsLabel}`:''}`;
  }
  descEl.textContent=event.description||'Nessuna descrizione disponibile.';
  if(event.location){
    locationEl.textContent=`Luogo: ${event.location}`;
    locationEl.style.display='';
  }else{
    locationEl.style.display='none';
  }
  if(event.htmlLink){
    linkEl.href=event.htmlLink;
    linkWrap.style.display='';
  }else{
    linkWrap.style.display='none';
  }
  modal.style.display='flex';
}
async function loadCalendarEvents(limit=100){
  if(!currentUser?.id)return;
  const now=new Date();
  const from=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const to=new Date(from.getTime()+24*60*60*1000);
  const qs=new URLSearchParams({userId:currentUser.id,from:from.toISOString(),to:to.toISOString(),limit:String(limit)});
  const res=await fetchApi(`/api/v1/calendar/events?${qs.toString()}`);
  if(!res.ok){const txt=await res.text().catch(()=> '');throw new Error(`GET /calendar/events fallita (${res.status}): ${txt}`);}
  const payload=await res.json();
  const events=Array.isArray(payload?.data)?payload.data:[];
  calendarEvents=events.map(mapCalendarEventToUi);
  saveCalendarToCache();
}
async function fetchCalendarApiWithFallback(paths,options={},behavior={}){
  const retryOnHttpError=behavior?.retryOnHttpError!==false;
  let lastErr=null;
  for(const path of paths){
    try{
      const res=await fetchApi(path,options);
      return {res,path};
    }catch(err){
      lastErr=err;
      const msg=err?.message?String(err.message):'';
      const isHttpError=/\bHTTP\s+\d{3}\b/i.test(msg);
      if(isHttpError&&!retryOnHttpError)break;
    }
  }
  throw lastErr||new Error('API calendario non raggiungibile');
}
async function loadCalendarStatus(){
  if(!currentUser?.id)return;
  const statusQuery=`?userId=${encodeURIComponent(currentUser.id)}`;
  const {res,path}=await fetchCalendarApiWithFallback([
    `/api/v1/calendar/google/status${statusQuery}`,
    `/api/v1/calendar/status${statusQuery}`
  ]);
  if(!res.ok){const txt=await res.text().catch(()=> '');throw new Error(`GET ${path.replace('/api/v1','')} fallita (${res.status}): ${txt}`);}
  const payload=await res.json();
  const data=payload?.data||{};
  setCalendarConnectionState(!!data.connected,data.last_synced_at||null);
  if(data.connected)setCalendarDiagnostic('OK','stato backend: collegato');
}
function getJwtExpMs(token){
  try{
    const payloadPart=token.split('.')[1];
    if(!payloadPart)return null;
    const payload=JSON.parse(atob(payloadPart.replace(/-/g,'+').replace(/_/g,'/')));
    if(!payload||typeof payload.exp!=='number')return null;
    return payload.exp*1000;
  }catch(e){
    return null;
  }
}

async function getValidAccessToken(){
  try{
    const { data: { session } } = await supabaseClient.auth.getSession();
    if(!session?.access_token)return null;
    const expMs=getJwtExpMs(session.access_token);
    const now=Date.now();
    const needsRefresh=expMs?expMs<=now+30_000:false;
    if(!needsRefresh)return session.access_token;
    const { data, error } = await supabaseClient.auth.refreshSession();
    if(error){
      console.warn('Refresh session fallito prima della chiamata API:',error);
      return session.access_token;
    }
    return data?.session?.access_token||session.access_token;
  }catch(err){
    console.warn('Impossibile recuperare sessione auth per API:',err);
    return null;
  }
}

async function buildApiAuthHeaders(baseHeaders={}){
  const headers={...baseHeaders};
  try{
    const token=await getValidAccessToken();
    if(token)headers.Authorization=`Bearer ${token}`;
  }catch(err){
    console.warn('Impossibile recuperare token auth per API:',err);
  }
  return headers;
}

async function requestMailboxConnectUrl(userId,state){
  const payload={userId,userEmail:currentUser?.email||'',redirectUri:getInboxConnectRedirectUri(),state};
  let lastDetail='';
  let fatalDetail='';
  for(const base of API_BASES){
    const root=base.replace(/\/$/,'');
    const endpoint=`${root}/api/v1/inbox/google/connect`;
    try{
      const authHeaders=await buildApiAuthHeaders({'Content-Type':'application/json'});
      let res=await fetch(endpoint,{method:'POST',headers:authHeaders,body:JSON.stringify(payload)});
      if(res.status===405){
        const qs=new URLSearchParams(payload);
        const getHeaders=await buildApiAuthHeaders();
        res=await fetch(`${endpoint}?${qs.toString()}`,{method:'GET',headers:getHeaders});
      }
      if(!res.ok){
        const txt=await res.text().catch(()=> '');
        let message=txt;
        try{
          const parsed=JSON.parse(txt);
          message=parsed?.message||parsed?.error||txt;
        }catch(e){}
        lastDetail=`${res.status} ${message}`.trim();
        if(res.status===403){fatalDetail=message||lastDetail;break;}
        continue;
      }
      const ct=(res.headers.get('content-type')||'').toLowerCase();
      if(!ct.includes('application/json')){
        lastDetail=`Risposta non JSON da ${endpoint}`;
        continue;
      }
      const data=await res.json();
      const authUrl=data?.data?.authUrl;
      if(authUrl){
        return {
          authUrl,
          redirectUri: data?.data?.redirectUri || payload.redirectUri
        };
      }
      lastDetail='Risposta JSON senza authUrl';
    }catch(err){
      const msg = err?.message ? String(err.message) : 'Errore rete';
      lastDetail = `${endpoint}: ${msg}`;
    }
    if(fatalDetail)break;
  }
  throw new Error(fatalDetail||lastDetail||'Endpoint mailbox connect non raggiungibile');
}

function getMailboxHostSuggestions(email){
  const domain=String(email||'').split('@')[1]?.toLowerCase()||'';
  return{
    imapHost:domain==='libero.it'?'imapmail.libero.it':(domain?`imap.${domain}`:''),
    smtpHost:domain==='libero.it'?'smtp.libero.it':(domain?`smtp.${domain}`:'')
  };
}
function setOtherMailboxConfigError(message){
  const el=document.getElementById('other-mailbox-config-error');
  if(!el)return;
  el.textContent=message||'';
  el.classList.toggle('active',!!message);
}
function fillOtherMailboxDefaults(email){
  const normalized=String(email||'').trim();
  const username=document.getElementById('other-mailbox-username');
  const imapHost=document.getElementById('other-mailbox-imap-host');
  const smtpHost=document.getElementById('other-mailbox-smtp-host');
  const suggestions=getMailboxHostSuggestions(normalized);
  if(username&&!username.value.trim())username.value=normalized;
  if(imapHost&&(!imapHost.value.trim()||imapHost.dataset.autofilled==='1')){imapHost.value=suggestions.imapHost;imapHost.dataset.autofilled='1';}
  if(smtpHost&&(!smtpHost.value.trim()||smtpHost.dataset.autofilled==='1')){smtpHost.value=suggestions.smtpHost;smtpHost.dataset.autofilled='1';}
}
function collectOtherMailboxConfig(){
  const modal=document.getElementById('other-mailbox-modal');
  const email=document.getElementById('other-mailbox-email');
  const username=document.getElementById('other-mailbox-username');
  const password=document.getElementById('other-mailbox-password');
  const imapHost=document.getElementById('other-mailbox-imap-host');
  const imapPort=document.getElementById('other-mailbox-imap-port');
  const smtpHost=document.getElementById('other-mailbox-smtp-host');
  const smtpPort=document.getElementById('other-mailbox-smtp-port');
  if(!modal||!email||!username||!password||!imapHost||!imapPort||!smtpHost||!smtpPort)return Promise.resolve(null);
  email.value=currentUser?.email||'';
  username.value=email.value;
  password.value='';
  imapPort.value='993';
  smtpPort.value='465';
  imapHost.dataset.autofilled='1';
  smtpHost.dataset.autofilled='1';
  fillOtherMailboxDefaults(email.value);
  setOtherMailboxConfigError('');
  password.type='password';
  const toggle=document.getElementById('other-mailbox-toggle-password');
  if(toggle)toggle.setAttribute('aria-label','Mostra password');
  modal.style.display='flex';
  setTimeout(()=>email.focus(),0);
  email.oninput=()=>fillOtherMailboxDefaults(email.value);
  imapHost.oninput=()=>{imapHost.dataset.autofilled='0';};
  smtpHost.oninput=()=>{smtpHost.dataset.autofilled='0';};
  return new Promise((resolve)=>{otherMailboxConfigResolver=resolve;});
}
function resolveOtherMailboxConfig(value){
  const modal=document.getElementById('other-mailbox-modal');
  if(modal)modal.style.display='none';
  const resolver=otherMailboxConfigResolver;
  otherMailboxConfigResolver=null;
  if(resolver)resolver(value);
}
function cancelOtherMailboxConfig(){resolveOtherMailboxConfig(null);}
function submitOtherMailboxConfig(){
  const email=document.getElementById('other-mailbox-email')?.value.trim()||'';
  const username=document.getElementById('other-mailbox-username')?.value.trim()||email;
  const password=document.getElementById('other-mailbox-password')?.value||'';
  const imapHost=document.getElementById('other-mailbox-imap-host')?.value.trim()||'';
  const smtpHost=document.getElementById('other-mailbox-smtp-host')?.value.trim()||'';
  const imapPort=Number(document.getElementById('other-mailbox-imap-port')?.value||993);
  const smtpPort=Number(document.getElementById('other-mailbox-smtp-port')?.value||465);
  if(!email||!username||!password||!imapHost||!smtpHost){
    setOtherMailboxConfigError('Compila email, username, password e server IMAP/SMTP.');
    return;
  }
  resolveOtherMailboxConfig({email,username,password,imapHost,imapPort,imapSecure:true,imapMailbox:'INBOX',smtpHost,smtpPort,smtpSecure:true});
}
function toggleOtherMailboxPassword(){
  const input=document.getElementById('other-mailbox-password');
  const btn=document.getElementById('other-mailbox-toggle-password');
  if(!input)return;
  const show=input.type==='password';
  input.type=show?'text':'password';
  if(btn)btn.setAttribute('aria-label',show?'Nascondi password':'Mostra password');
}

async function requestOtherMailboxConnect(config){
  const payload={userId:currentUser.id,...config};
  const res=await fetchApi('/api/v1/inbox/imap/connect',{singleAttempt:true,timeoutMs:25000,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok){
    const detail=await readApiErrorMessage(res,'/api/v1/inbox/imap/connect');
    throw new Error(detail);
  }
  return res.json();
}

async function requestCalendarConnectUrl(userId,state){
  const payload={userId,redirectUri:getCalendarConnectRedirectUri(),state};
  let lastDetail='';
  const endpointPaths=['/api/v1/calendar/google/connect'];
  for(const base of API_BASES){
    const root=base.replace(/\/$/,'');
    for(const path of endpointPaths){
      const endpoint=`${root}${path}`;
      try{
        const authHeaders=await buildApiAuthHeaders({'Content-Type':'application/json'});
        let res=await fetch(endpoint,{method:'POST',headers:authHeaders,body:JSON.stringify(payload)});
        if(res.status===405){
          const qs=new URLSearchParams(payload);
          const getHeaders=await buildApiAuthHeaders();
          res=await fetch(`${endpoint}?${qs.toString()}`,{method:'GET',headers:getHeaders});
        }
        if(!res.ok){
          const txt=await res.text().catch(()=> '');
          lastDetail=`${res.status} ${txt}`.trim();
          continue;
        }
        const data=await res.json();
        const authUrl=data?.data?.authUrl;
        if(authUrl)return{authUrl,redirectUri:data?.data?.redirectUri||payload.redirectUri};
        lastDetail='Risposta JSON senza authUrl';
      }catch(err){
        const msg=err?.message?String(err.message):'Errore rete';
        lastDetail=`${endpoint}: ${msg}`;
      }
    }
  }
  throw new Error(lastDetail||'Endpoint calendario connect non raggiungibile');
}


async function readApiErrorMessage(res,url){
  const txt=await res.text().catch(()=> '');
  if(!txt)return `HTTP ${res.status} su ${url}`;
  try{
    const parsed=JSON.parse(txt);
    return parsed?.message||parsed?.error||txt;
  }catch(e){
    return txt;
  }
}

async function fetchApi(path,options={}){
  const { singleAttempt=false, disableAuthRetry=false, timeoutMs=0, ...fetchOptions } = options||{};
  let lastError=null;
  const authHeaders=await buildApiAuthHeaders(fetchOptions.headers||{});
  let requestOptions={...fetchOptions,headers:authHeaders};
  const bases=singleAttempt?[API_BASES[0]].filter(Boolean):API_BASES;
  for(const base of bases){
    const controller=timeoutMs>0?new AbortController():null;
    const timeoutId=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
    try{
      const url=base.replace(/\/$/,'')+path;
      let res=await fetch(url,controller?{...requestOptions,signal:controller.signal}:requestOptions);
      if(res.status===401&&!disableAuthRetry){
        const retryHeaders=await buildApiAuthHeaders(fetchOptions.headers||{});
        const oldAuth=(requestOptions.headers&&requestOptions.headers.Authorization)||'';
        const newAuth=retryHeaders.Authorization||'';
        if(newAuth&&newAuth!==oldAuth){
          requestOptions={...fetchOptions,headers:retryHeaders};
          res=await fetch(url,controller?{...requestOptions,signal:controller.signal}:requestOptions);
        }
      }
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'').toLowerCase();
        if(contentType.includes('text/html')){
          lastError=new Error(`Risposta HTML inattesa da ${url}`);
          continue;
        }
        return res;
      }
      if(res.status===404||res.status===405){
        const detail=await readApiErrorMessage(res,url);
        lastError=new Error(`HTTP ${res.status} su ${url}: ${detail}`);
        continue;
      }
      if(res.status<500)return res;
      const detail=await readApiErrorMessage(res,url);
      lastError=new Error(`HTTP ${res.status} su ${url}: ${detail}`);
    }catch(err){lastError=err?.name==='AbortError'?new Error(`Timeout chiamata API dopo ${Math.round(timeoutMs/1000)}s`):err;}
    finally{if(timeoutId)clearTimeout(timeoutId);}
  }
  throw lastError||new Error('API non raggiungibile');
}

async function loadTasksFromApi(){
  if(!currentUser?.id)return;
  try{
    const res=await fetchApi(`/api/v1/tasks?userId=${encodeURIComponent(currentUser.id)}`);
    const payload=await res.json();
    const apiTasks=Array.isArray(payload?.data)?payload.data:[];
    tasks=apiTasks.map(normalizeApiTask);
    saveTasksToCache();
    const numericIds=tasks.map(t=>parseInt(t.id,10)).filter(n=>Number.isFinite(n));
    nextTaskId=numericIds.length?Math.max(...numericIds)+1:100;
  }catch(err){
    console.warn('Impossibile caricare task da backend, uso cache locale:',err);
    const cached=loadTasksFromCache();
    if(cached){tasks=cached;normalizeCachedTasks();}
    const numericIds=tasks.map(t=>parseInt(t.id,10)).filter(n=>Number.isFinite(n));
    nextTaskId=numericIds.length?Math.max(...numericIds)+1:100;
  }
}
function normalizeApiNote(apiNote){
  return {
    id:String(apiNote?.id||`tmp-${Date.now()}`),
    title:String(apiNote?.title||'Nota senza titolo'),
    body:String(apiNote?.body||''),
    tags:Array.isArray(apiNote?.tags)?apiNote.tags.map(t=>String(t)).filter(Boolean):[]
  };
}
async function loadNotesFromApi(){
  if(!currentUser?.id)return;
  const cached=loadNotesFromCache();
  try{
    const res=await fetchApi(`/api/v1/notes?userId=${encodeURIComponent(currentUser.id)}`);
    const payload=await res.json();
    const apiNotes=Array.isArray(payload?.data)?payload.data:[];
    const apiUiNotes=apiNotes.map(normalizeApiNote);
    if(!apiUiNotes.length&&Array.isArray(cached)&&cached.length){
      notes=cached;
      saveNotesToCache();
      const numericNoteIds=notes.map(n=>parseInt(n.id,10)).filter(n=>Number.isFinite(n));
      nextNoteId=numericNoteIds.length?Math.max(...numericNoteIds)+1:100;
      const backfillKey=getNotesBackfillDoneKey();
      const alreadyBackfilled=backfillKey?localStorage.getItem(backfillKey)==='1':false;
      if(!alreadyBackfilled){
        let createdCount=0;
        for(const n of cached){
          try{
            const noteTitle=String(n?.title||'Nota senza titolo').slice(0,200);
            const noteBody=String(n?.body||'');
            const noteTags=Array.isArray(n?.tags)?n.tags.map(t=>String(t)).filter(Boolean).slice(0,20):[];
            const createRes=await fetchApi('/api/v1/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id,title:noteTitle,body:noteBody,tags:noteTags})});
            if(createRes.ok)createdCount++;
          }catch(err){
            console.warn('Backfill nota locale verso backend fallito:',err);
          }
        }
        if(createdCount>0&&backfillKey)localStorage.setItem(backfillKey,'1');
      }
      return;
    }
    notes=apiUiNotes;
    saveNotesToCache();
    const numericNoteIds=notes.map(n=>parseInt(n.id,10)).filter(n=>Number.isFinite(n));
    nextNoteId=numericNoteIds.length?Math.max(...numericNoteIds)+1:100;
  }catch(err){
    console.warn('Impossibile caricare note da backend, uso cache locale:',err);
    if(cached)notes=cached;
    const numericNoteIds=notes.map(n=>parseInt(n.id,10)).filter(n=>Number.isFinite(n));
    nextNoteId=numericNoteIds.length?Math.max(...numericNoteIds)+1:100;
  }
}

// ── MEMORIA ───────────────────────────────────────────────────────────────────
function mem_get(key){try{return JSON.parse(localStorage.getItem('filo_'+key));}catch(e){return null;}}
function mem_set(key,val){try{localStorage.setItem('filo_'+key,JSON.stringify(val));}catch(e){}}
function upsertCheckinInMemory(date,energy,sleep,stress){let h=mem_get('checkins')||[];h=h.filter(c=>c.date!==date);h.push({date,energy,sleep,stress});if(h.length>30)h=h.slice(-30);mem_set('checkins',h);analyzePatterns();}
function formatLocalDate(date=new Date()){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function normalizeApiCheckinDate(raw){
  if(typeof raw==='string'){
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const parsed=new Date(raw);
    if(Number.isFinite(parsed.getTime()))return formatLocalDate(parsed);
    return null;
  }
  if(raw instanceof Date&&Number.isFinite(raw.getTime()))return formatLocalDate(raw);
  return null;
}
function saveCheckinToMemory(energy,sleep,stress){upsertCheckinInMemory(formatLocalDate(),energy,sleep,stress);}
function hasCheckinForDate(date){const checkins=mem_get('checkins')||[];return checkins.some(c=>c?.date===date);}
function sleepToApiQuality(sleep){const map={'male':'poor','così così':'fair','bene':'good','benissimo':'excellent'};return map[sleep]||'fair';}
function sleepFromApiQuality(sleepQuality){const map={poor:'male',fair:'così così',good:'bene',excellent:'benissimo'};return map[sleepQuality]||'così così';}
async function saveCheckinToApi(energy,sleep,stress){if(!currentUser?.id)return;const today=formatLocalDate();const res=await fetchApi('/api/v1/checkins/daily',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id,checkinDate:today,energyLevel:energy,stressLevel:stress,sleepQuality:sleepToApiQuality(sleep)})});if(!res.ok){const txt=await res.text().catch(()=> '');throw new Error(`PUT /checkins/daily fallita (${res.status}): ${txt}`);}return res.json();}
async function hydrateLatestCheckinFromApi(){if(!currentUser?.id)return;try{const res=await fetchApi(`/api/v1/checkins/latest?userId=${encodeURIComponent(currentUser.id)}`);if(!res.ok)return;const payload=await res.json();const c=payload?.data;if(!c)return;const energy=Number(c.energy_level);const stress=Number(c.stress_level);const sleep=sleepFromApiQuality(c.sleep_quality);const checkinDate=normalizeApiCheckinDate(c.checkin_date);if(!Number.isFinite(energy)||!Number.isFinite(stress)||!checkinDate)return;upsertCheckinInMemory(checkinDate,energy,sleep,stress);todayEnergy=energy;todayStress=stress;todaySleep=sleep;}catch(err){console.warn('Impossibile caricare latest checkin da API:',err);}}
async function saveCheckinToSupabaseProfile(energy,sleep,stress){
  if(!supabaseClient||!currentUser?.id)return false;
  const payload={date:formatLocalDate(),energy,sleep,stress,updatedAt:new Date().toISOString()};
  try{
    const {data,error}=await supabaseClient.auth.updateUser({data:{...currentUser.user_metadata,filo_latest_checkin:payload}});
    if(error)throw error;
    if(data?.user){
      currentUser=data.user;
      return true;
    }
  }catch(err){
    console.warn('Fallback Supabase profile per check-in fallita:',err);
  }
  return false;
}
function hydrateLatestCheckinFromSupabaseProfile(){
  const raw=currentUser?.user_metadata?.filo_latest_checkin;
  if(!raw)return false;
  const checkinDate=normalizeApiCheckinDate(raw.date);
  const energy=Number(raw.energy);
  const stress=Number(raw.stress);
  const sleep=typeof raw.sleep==='string'?raw.sleep:null;
  if(!checkinDate||!Number.isFinite(energy)||!Number.isFinite(stress)||!sleep)return false;
  upsertCheckinInMemory(checkinDate,energy,sleep,stress);
  todayEnergy=energy;
  todayStress=stress;
  todaySleep=sleep;
  return true;
}
function recordTaskCompleted(task){if(!prefs.memoria)return;let h=mem_get('tasks_done')||[];h.push({label:task.label,priorita:task.priorita,ts:Date.now()});if(h.length>200)h=h.slice(-200);mem_set('tasks_done',h);analyzePatterns();}
function recordTaskPostponed(task){if(!prefs.memoria)return;let p=mem_get('tasks_postponed')||{};p[task.label]=(p[task.label]||0)+1;mem_set('tasks_postponed',p);}
function analyzePatterns(){
  if(!prefs.memoria)return;
  const checkins=mem_get('checkins')||[];
  const done=mem_get('tasks_done')||[];
  const postponed=mem_get('tasks_postponed')||{};
  const patterns=[];
  if(checkins.length>=3){
    const avg=checkins.slice(-7).reduce((s,c)=>s+c.energy,0)/Math.min(checkins.length,7);
    if(avg<3)patterns.push({icon:"⚡",label:"Energia sotto la media",sub:`Media: ${avg.toFixed(1)}/5`});
    else if(avg>=4)patterns.push({icon:"🚀",label:"Settimana ad alta energia",sub:`Media: ${avg.toFixed(1)}/5`});
  }
  const chronic=Object.entries(postponed).filter(([k,v])=>v>=3).map(([k,v])=>`"${k}" (${v}x)`);
  if(chronic.length)patterns.push({icon:"🔁",label:"Task rimandati frequentemente",sub:chronic.slice(0,2).join(', ')});
  if(done.length>=5){
    const u=done.filter(t=>t.priorita==='urgente').length;
    patterns.push({icon:"✓",label:`${done.length} task completati`,sub:`${Math.round(u/done.length*100)}% urgenti`});
  }
  mem_set('patterns',patterns);
  return patterns;
}
function getMemoryContext(){const checkins=mem_get('checkins')||[];const patterns=mem_get('patterns')||[];const postponed=mem_get('tasks_postponed')||{};let ctx='';if(checkins.length>0){const last=checkins[checkins.length-1];ctx+=`Dati recenti: energia ${last.energy}/5, sonno "${last.sleep}", stress ${last.stress}/5. `;}if(todayEnergy)ctx+=`Energia oggi: ${todayEnergy}/5. `;const chronic=Object.entries(postponed).filter(([k,v])=>v>=3).map(([k])=>k);if(chronic.length)ctx+=`Task che tende a rimandare: ${chronic.join(', ')}. `;if(patterns.length)ctx+=`Pattern: ${patterns.map(p=>p.label).join('; ')}. `;return ctx;}
function clearMemory(){if(!confirm('Cancellare tutta la memoria?'))return;['checkins','tasks_done','tasks_postponed','patterns'].forEach(k=>localStorage.removeItem('filo_'+k));renderMemoryPage();}

// â”€â”€ CHECK-IN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function selectEnergy(val,el){todayEnergy=val;document.querySelectorAll('.e-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');}
function selectSleep(val,el){todaySleep=val;document.querySelectorAll('.s-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');}
async function saveCheckin(options={}){
  const slider=document.getElementById('stress-slider');
  const sliderStress=parseInt(slider?.value??'3',10);
  todayStress=Number.isFinite(options?.stress)?options.stress:(Number.isFinite(sliderStress)?sliderStress:3);
  const energy=Number.isFinite(options?.energy)?options.energy:(todayEnergy||3);
  const sleep=typeof options?.sleep==='string'&&options.sleep?options.sleep:(todaySleep||'così così');
  todayEnergy=energy;
  todaySleep=sleep;
  saveCheckinToMemory(energy,sleep,todayStress);
  document.getElementById('checkin-overlay').style.display='none';
  updateEnergyDisplay(energy,sleep,todayStress);
  try{
    await saveCheckinToApi(energy,sleep,todayStress);
    await saveCheckinToSupabaseProfile(energy,sleep,todayStress);
  }catch(err){
    console.warn('Persistenza check-in API fallita:',err);
    const fallbackSaved=await saveCheckinToSupabaseProfile(energy,sleep,todayStress);
    if(!fallbackSaved)alert('Check-in salvato solo in locale. Verifica connessione/API.');
  }
}
async function skipCheckin(){
  const confirmed=window.confirm('Vuoi continuare con valori neutrali (energia 3/5, sonno "così così", stress 3/5)?');
  if(!confirmed)return;
  await saveCheckin({energy:3,sleep:'così così',stress:3});
}
function updateEnergyDisplay(energy,sleep,stress){const el=document.getElementById('stat-energy');const sub=document.getElementById('stat-energy-sub');if(el){el.textContent=energy+'/5';el.style.color=ENERGY_COLORS[energy]||'var(--color-text)';}if(sub)sub.textContent=ENERGY_LABELS[energy]||'';const banner=document.getElementById('energy-banner');if(banner){let msg='';if(energy<=2)msg=`<strong>Energia bassa oggi</strong>. Concentrati su 1-2 priorità.`;else if(energy>=4)msg=`<strong>Ottima energia oggi.</strong> E' il momento ideale per attività impegnative.`;else msg=`<strong>Energia nella norma.</strong> Sonno ${sleep}, stress ${stress}/5.`;banner.innerHTML=msg;banner.classList.add('active');}const checkins=mem_get('checkins')||[];const memBanner=document.getElementById('memory-banner');if(memBanner&&checkins.length>=3){const patterns=analyzePatterns()||[];if(patterns.length){memBanner.innerHTML=`<strong>Memoria:</strong> ${patterns[0].label}`;memBanner.classList.add('active');}}}
function initCheckin(){const today=formatLocalDate();const checkins=mem_get('checkins')||[];const checkinToday=checkins.find(c=>c.date===today);const doneToday=!!checkinToday;if(!prefs.checkin||doneToday){document.getElementById('checkin-overlay').style.display='none';if(checkinToday){todayEnergy=checkinToday.energy;todaySleep=checkinToday.sleep;todayStress=checkinToday.stress;updateEnergyDisplay(checkinToday.energy,checkinToday.sleep,checkinToday.stress);}}else{document.getElementById('checkin-overlay').style.display='flex';}}

// â”€â”€ MEMORIA PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderMemoryPage(){
  const checkins=mem_get('checkins')||[];
  const patterns=analyzePatterns()||[];
  const eh=document.getElementById('energy-history');
  if(eh){
    if(!checkins.length){
      eh.innerHTML='<div style="font-size:13px;color:var(--color-muted);font-style:italic;">Nessun dato ancora.</div>';
    }else{
      eh.innerHTML=checkins.slice(-7).reverse().map(c=>`<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,0.05);"><span style="font-size:12px;color:var(--color-muted);width:80px;">${c.date}</span><span class="energy-dot" style="background:${ENERGY_COLORS[c.energy]||'#ccc'};"></span><span style="font-size:13px;">${ENERGY_LABELS[c.energy]||c.energy}</span><span style="margin-left:auto;font-size:12px;color:var(--color-muted);">sonno: ${c.sleep} · stress: ${c.stress}/5</span></div>`).join('');
    }
  }
  const pl=document.getElementById('pattern-list');
  if(pl){
    if(!patterns.length)pl.innerHTML='<div style="font-size:13px;color:var(--color-muted);font-style:italic;">I pattern emergono dopo qualche giorno.</div>';
    else pl.innerHTML=patterns.map(p=>`<div class="mem-item"><div class="mem-icon" style="background:var(--color-subtle);">${p.icon}</div><div><div class="mem-label">${p.label}</div><div class="mem-sub">${p.sub}</div></div></div>`).join('');
  }
  const ch=document.getElementById('checkin-history');
  if(ch)ch.innerHTML=`<div style="font-size:13px;color:var(--color-muted);">${checkins.length} check-in registrati${checkins.length?' · ultimo: '+checkins[checkins.length-1].date:''}.</div>`;
  const sc=document.getElementById('stat-checkins');
  if(sc)sc.textContent=checkins.length;
  const nb=document.getElementById('nb-mem');
  if(nb)nb.style.display=patterns.length?'':'none';
}

// ── NAVIGAZIONE ───────────────────────────────────────────────────────────────
const PAGE_META={suggerimenti:["","Dimmi cosa hai oggi, penso io all'ordine"],calendario:["Calendario","Collega Google Calendar per importare i tuoi eventi"],inbox:["Inbox email","0 messaggi · 0 non letti"],task:["Task",""],note:["Note",""],quickcheck:["Filo Quick Check","Diagnosi del tuo flusso operativo"],memoria:["Memoria adattiva","Pattern e storico"],ricerca:["Ricerca","Cerca in task, note e inbox"],impostazioni:["Impostazioni","Profilo e preferenze"]};
const HELP_CONTENT={
  suggerimenti:{title:"Prossime azioni",intro:"Qui Filo trasforma agenda, sospesi, energia e vincoli in poche azioni ordinate. È il punto da cui partire quando non sai cosa fare per primo.",steps:["Compila agenda, sospesi, disponibilità e focus del giorno.","Premi Analizza la mia giornata.","Trasforma le azioni utili in task o avvia un focus sprint."],tip:"Più contesto dai, più Filo riesce a distinguere urgenze vere, lavoro profondo e attività rimandabili."},
  calendario:{title:"Calendario",intro:"Qui convivono gli eventi Google Calendar e i blocchi Filo. Gli eventi sono impegni reali; i blocchi Filo sono una struttura consigliata per usare meglio il tempo libero.",steps:["Collega Google Calendar per vedere gli eventi reali.","Scegli un template se vuoi dare un ritmo alla giornata o alla settimana.","Premi Applica blocchi per vedere il piano e Crea task di partenza per aggiungere le azioni consigliate alla sezione Task."],tip:"I template non modificano Google Calendar: servono a orientare la giornata e possono convivere con gli eventi importati."},
  inbox:{title:"Inbox email",intro:"Qui Filo raccoglie i messaggi collegati alla mailbox. L'obiettivo non è leggere tutto, ma capire quali comunicazioni richiedono una prossima azione.",steps:["Collega la mailbox.","Sincronizza quando vuoi aggiornare i messaggi.","Apri i messaggi rilevanti e trasformali mentalmente in task se richiedono follow-up."],tip:"Slack è previsto, ma per ora Filo mantiene la promessa operativa sulla mailbox collegata."},
  task:{title:"Task",intro:"Qui tieni le cose da fare in forma operativa. Lista e Board mostrano gli stessi task con due modi diversi di leggerli.",steps:["Usa Lista quando vuoi scorrere velocemente le attività.","Usa Board per distinguere Todo, In progress e Done.","Aggiungi promemoria e ricorrenze solo ai task che devono davvero tornare."],tip:"Un task utile dovrebbe iniziare con un verbo: chiamare, preparare, approvare, rivedere, inviare."},
  note:{title:"Note",intro:"Le note servono a catturare contesto, decisioni e materiali che non sono ancora task. Quando una nota implica un'azione, puoi trasformarla in task.",steps:["Crea una nota per riunioni, decisioni o idee.","Aggiungi tag se vuoi ritrovarla più facilmente.","Crea un task dalla nota quando emerge una prossima azione."],tip:"Tieni separate note e task: la nota conserva il contesto, il task dice cosa fare."},
  quickcheck:{title:"Filo Quick Check",intro:"Quick Check è una diagnosi immediata: individua dispersione, responsabilità poco chiare e follow-up costoso prima di proporre cosa fare.",steps:["Scegli il flusso che vuoi diagnosticare.","Compila le domande su strumenti, visibilità, aggiornamenti e responsabilità.","Genera la diagnosi e trasforma le azioni consigliate in task."],tip:"Usalo quando vuoi capire da dove partire: non sostituisce l'AI, ma ti dà una mappa operativa stabile in due minuti."},
  memoria:{title:"Memoria adattiva",intro:"La memoria raccoglie check-in e pattern nel tempo. Serve a far diventare Filo meno generico e più aderente al tuo modo di lavorare.",steps:["Fai il check-in energia quando entri.","Completa o rimanda task normalmente.","Dopo qualche giorno guarda i pattern che emergono."],tip:"La memoria diventa utile con continuità: pochi dati sinceri ogni giorno valgono più di una configurazione perfetta."},
  ricerca:{title:"Ricerca",intro:"Qui trovi rapidamente task, note e messaggi. È utile quando ricordi un nome, un cliente, un tema o una parola chiave ma non sai dove sia finita.",steps:["Digita una parola chiave.","Controlla i risultati divisi per area.","Apri la sezione giusta per agire sul contenuto."],tip:"Cerca parole concrete: nomi, clienti, budget, scadenze, progetti."},
  impostazioni:{title:"Impostazioni",intro:"Qui gestisci profilo, preferenze e statistiche leggere. È il posto per calibrare Filo, non per lavorare ogni giorno.",steps:["Controlla i dati profilo.","Attiva o disattiva check-in, memoria e suggerimenti AI.","Scegli il tema visivo più comodo."],tip:"Per il primo utilizzo lascia attivi check-in, memoria e suggerimenti AI: sono le parti che rendono Filo più personale."}
};
const HELP_FIRST_RUN=["Fai il check-in energia quando apri Filo.","Collega Google Calendar e mailbox, oppure inizia da un template.","Crea o importa almeno 3 task reali.","Vai su Prossime azioni e premi Analizza."];
const SUPPORT_EMAIL='filo.app.project@gmail.com';
const SUPPORT_MAILTO=`mailto:${SUPPORT_EMAIL}?subject=Feedback%20su%20Filo`;
function getActivePageId(){const active=document.querySelector('.page.active');return active?.id?.replace('page-','')||'suggerimenti';}
function renderHelpPanel(){
  const id=getActivePageId();
  const data=HELP_CONTENT[id]||HELP_CONTENT.suggerimenti;
  const title=document.getElementById('help-panel-title');
  const body=document.getElementById('help-panel-body');
  if(!title||!body)return;
  title.textContent=data.title;
  body.innerHTML=[
    `<section class="help-section"><div class="help-copy">${escapeHtml(data.intro)}</div><div class="help-list">${data.steps.map((step,idx)=>`<div class="help-item"><span class="help-num">${idx+1}</span><span>${escapeHtml(step)}</span></div>`).join('')}</div></section>`,
    `<section class="help-section"><div class="help-section-title">Percorso consigliato</div><div class="help-path">${HELP_FIRST_RUN.map((step,idx)=>`<div class="help-path-step"><span class="help-num">${idx+1}</span><span>${escapeHtml(step)}</span></div>`).join('')}</div></section>`,
    `<section class="help-section"><div class="help-section-title">Da ricordare</div><div class="help-tip">${escapeHtml(data.tip)}</div></section>`,
    `<section class="help-section"><div class="help-section-title">Feedback e bug</div><div class="help-contact"><div>Hai un suggerimento o qualcosa non funziona?</div><a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a><small>Se il link email non si apre, copia questo indirizzo e scrivimi direttamente.</small></div></section>`
  ].join('');
}
function openHelpPanel(){renderHelpPanel();const panel=document.getElementById('help-panel-overlay');if(panel)panel.classList.add('active');}
function closeHelpPanel(){const panel=document.getElementById('help-panel-overlay');if(panel)panel.classList.remove('active');}
function showPage(id,el){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('page-'+id).classList.add('active');if(el)el.classList.add('active');const m=PAGE_META[id];const firstName=currentUser?(currentUser.user_metadata?.full_name||currentUser.email).split(' ')[0]:'';document.getElementById('page-title').textContent=id==='suggerimenti'?'Buongiorno, '+firstName:m[0];document.getElementById('page-sub').textContent=m[1];document.getElementById('topbar-actions').innerHTML='';if(id==='task')updateTaskSubtitle();if(id==='note'){showNoteList();document.getElementById('topbar-actions').innerHTML='<button class="btn-primary" onclick="openNoteEditor(null)">＋ Nuova nota</button>';}if(id==='quickcheck')renderQuickCheckPage();if(id==='memoria')renderMemoryPage();if(id==='impostazioni')updateStatsPage();renderAll();renderHelpPanel();}

// â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function tagBadge(tag,idx){const c=TAG_PALETTE[idx%TAG_PALETTE.length];return `<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:8px;background:${c.bg};color:${c.tc};">${escapeHtml(tag)}</span>`;}
function prioritaBadge(p){const m={urgente:'b-urgente',alta:'b-alta',normale:'b-normale',bassa:'b-bassa'};const l={urgente:'Urgente',alta:'Alta',normale:'Normale',bassa:'Bassa'};return `<span class="badge ${m[p]||'b-normale'}">${l[p]||p}</span>`;}
function ensureSingleSuggestionsContextNote(){
  const page=document.getElementById('page-suggerimenti');
  if(!page)return;
  const notes=Array.from(page.querySelectorAll('.context-note'));
  if(notes.length<=1)return;
  notes.forEach((note,idx)=>{if(idx>0)note.remove();});
}
function renderAll(){ensureSingleSuggestionsContextNote();renderInboxControls();renderInbox();renderCalendarControls();renderTemplates();renderCalendar();renderTasks();renderNotes();updateBadges();}
function openInboxMessage(id){inboxSelectedId=id;const item=INBOX.find(i=>i.id===id);if(!item)return;if(item.unread){item.unread=false;saveInboxToCache();}const modal=document.getElementById('inbox-message-modal');const fromEl=document.getElementById('inbox-modal-from');const subjEl=document.getElementById('inbox-modal-subj');const timeEl=document.getElementById('inbox-modal-time');const bodyEl=document.getElementById('inbox-modal-body');if(fromEl)fromEl.textContent=`Da: ${item.from}`;if(subjEl)subjEl.textContent=item.subj||'(Senza oggetto)';if(timeEl)timeEl.textContent=`Ricevuta alle ${item.time||'--:--'}`;if(bodyEl)bodyEl.textContent=item.prev||'(Nessun contenuto disponibile)';if(modal)modal.style.display='flex';updateBadges();renderInbox();}
function closeInboxMessage(){const modal=document.getElementById('inbox-message-modal');if(modal)modal.style.display='none';inboxSelectedId=null;renderInbox();}
function renderInboxControls(){
  const state=document.getElementById('inbox-connection-state');
  const connectBtn=document.getElementById('inbox-connect-btn');
  const imapBtn=document.getElementById('inbox-imap-connect-btn');
  const syncBtn=document.getElementById('inbox-sync-btn');
  const disconnectBtn=document.getElementById('inbox-disconnect-btn');
  if(!state||!connectBtn||!syncBtn)return;
  if(!mailboxConnected){
    if(disconnectBtn)disconnectBtn.style.display='none';
    if(mailboxBackgroundSyncInProgress){
      state.textContent='Sincronizzazione mailbox in corso... potrebbe richiedere alcuni minuti.';
      state.style.color='var(--color-primary-strong)';
      connectBtn.style.display='';
      connectBtn.textContent='Collega Gmail';
      connectBtn.disabled=true;
      if(imapBtn){
        imapBtn.style.display='';
        imapBtn.textContent='Sincronizzo...';
        imapBtn.disabled=true;
      }
      syncBtn.style.display='none';
      return;
    }
    state.textContent=mailboxConnectionError||'Mailbox non collegata · collega Gmail oppure un account IMAP/SMTP';
    state.style.color=mailboxConnectionError?'#9B2525':'var(--color-muted-strong)';
    connectBtn.style.display='';
    connectBtn.textContent='Collega Gmail';
    connectBtn.disabled=mailboxSyncInProgress;
    if(imapBtn){
      imapBtn.style.display='';
      imapBtn.textContent=mailboxSyncInProgress?'Connessione...':'Altra email';
      imapBtn.disabled=mailboxSyncInProgress;
    }
    syncBtn.style.display='none';
    return;
  }
  const last=mailboxLastSync?new Date(mailboxLastSync).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):'mai';
  const providerLabel=mailboxProvider==='imap_smtp'?'email':'Gmail';
  const accountLabel=mailboxProviderEmail?`${providerLabel==='Gmail'?'Gmail':'Mailbox'} collegata: ${mailboxProviderEmail}`:`Mailbox ${providerLabel} collegata`;
  connectBtn.style.display='none';
  if(imapBtn)imapBtn.style.display='none';
  syncBtn.style.display='';
  if(disconnectBtn){
    disconnectBtn.style.display='';
    disconnectBtn.disabled=mailboxSyncInProgress||mailboxBackgroundSyncInProgress;
    disconnectBtn.textContent='Scollega';
  }
  if(mailboxBackgroundSyncInProgress){
    state.style.color='var(--color-primary-strong)';
    state.textContent=`${accountLabel} · aggiornamento in corso...`;
    syncBtn.disabled=true;
    syncBtn.innerHTML='<span class="spinning">↻</span> Aggiorno...';
    return;
  }
  state.style.color=mailboxConnectionError?'#9B2525':'var(--color-muted-strong)';
  state.textContent=mailboxConnectionError||`${accountLabel} · ultima sync ${last}`;
  syncBtn.disabled=mailboxSyncInProgress;
  syncBtn.innerHTML=mailboxSyncInProgress?'<span class="spinning">↻</span> Sincronizzo...':'Sincronizza';
}
function renderInbox(){const el=document.getElementById('inbox-list');if(!el)return;if(!mailboxConnected){if(mailboxBackgroundSyncInProgress){el.innerHTML='<div class="empty-state"><div class="empty-title"><span class="spinning">↻</span> Sincronizzazione in corso</div><div class="empty-sub">Stiamo collegando la mailbox e recuperando i messaggi. L\'operazione può richiedere qualche minuto.</div></div>';return;}el.innerHTML='<div class="empty-state"><div class="empty-title">Collega la mailbox</div><div class="empty-sub">Puoi collegare Gmail oppure una mailbox IMAP/SMTP come Libero, Aruba, Yahoo o una casella aziendale.</div></div>';return;}if(mailboxBackgroundSyncInProgress&&!INBOX.length){el.innerHTML='<div class="empty-state"><div class="empty-title"><span class="spinning">↻</span> Aggiornamento mailbox in corso</div><div class="empty-sub">Filo sta recuperando i messaggi della mailbox collegata. Può richiedere qualche minuto.</div></div>';return;}if(!INBOX.length){el.innerHTML='<div class="empty-state"><div class="empty-title">Nessun messaggio sincronizzato</div><div class="empty-sub">Premi "Sincronizza" per aggiornare la inbox.</div></div>';return;}el.innerHTML=INBOX.map(item=>`<div class="inbox-item" onclick="openInboxMessage('${item.id}')" style="cursor:pointer;${inboxSelectedId===item.id?'background:#F7FAFF;':''}"><div style="width:7px;height:7px;border-radius:50%;background:${item.unread?'var(--color-primary)':'transparent'};margin-top:6px;flex-shrink:0;"></div><div class="av" style="background:${item.bg};color:${item.tc};">${item.initials}</div><div class="inbox-body"><div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:13px;font-weight:500;">${escapeHtml(item.from)}</span><span style="font-size:11px;color:var(--color-muted);">${item.time}</span></div><div style="font-size:13px;margin-bottom:2px;">${escapeHtml(item.subj)}</div><div style="font-size:12px;color:var(--color-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.prev)}</div></div><span class="badge ${item.source==='Slack'?'b-slack':'b-blue'}">${item.source}</span></div>`).join('');}
function renderCalendarControls(){
  const stateEl=document.getElementById('calendar-connection-state');
  const connectBtn=document.getElementById('calendar-connect-btn');
  const syncBtn=document.getElementById('calendar-sync-btn');
  if(!stateEl||!connectBtn||!syncBtn)return;
  if(calendarConnected){
    const syncLabel=calendarLastSync?` · sync ${new Date(calendarLastSync).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`:'';
    stateEl.textContent=`Google Calendar collegato${syncLabel}`;
    connectBtn.style.display='none';
    syncBtn.style.display='';
  }else{
    stateEl.textContent=calendarConnectionError||'Google Calendar non collegato';
    connectBtn.style.display='';
    syncBtn.style.display='none';
  }
  connectBtn.disabled=calendarSyncInProgress;
  syncBtn.disabled=calendarSyncInProgress;
}
function getTemplateById(id){return DAY_TEMPLATES.find(t=>t.id===id)||DAY_TEMPLATES[0];}
function getEnergyAwareTemplate(){
  if(todayEnergy&&todayEnergy<=2)return getTemplateById('light');
  return getTemplateById(selectedTemplateId);
}
function renderTemplates(){
  const el=document.getElementById('template-grid');
  if(!el)return;
  el.innerHTML=DAY_TEMPLATES.map(t=>`<button class="template-card ${t.id===selectedTemplateId?'active':''}" onclick="selectTemplate('${t.id}')"><div class="template-title">${escapeHtml(t.name)}</div><div class="template-sub">${escapeHtml(t.sub)}</div></button>`).join('');
  updateTemplateTaskActionButton();
}
function selectTemplate(id){
  selectedTemplateId=id;
  const fb=document.getElementById('template-feedback');
  if(fb){fb.textContent='';fb.className='template-feedback';}
  renderTemplates();
}
function getMissingTemplateTaskLabels(tpl){
  const existing=new Set(tasks.map(t=>String(t.label||'').trim().toLowerCase()));
  return tpl.tasks.filter(label=>!existing.has(label.toLowerCase()));
}
function updateTemplateTaskActionButton(){
  const btn=document.getElementById('template-create-tasks-btn');
  if(!btn)return;
  const tpl=getEnergyAwareTemplate();
  const missing=getMissingTemplateTaskLabels(tpl);
  btn.dataset.mode=missing.length?'create':'open';
  btn.textContent=missing.length?'Crea task di partenza':'Apri task di partenza';
}
function setTemplateFeedback(message,tone='info',actionHtml=''){
  const fb=document.getElementById('template-feedback');
  if(!fb)return;
  fb.className=`template-feedback ${tone}`;
  fb.innerHTML=`<span>${escapeHtml(message)}</span>${actionHtml}`;
}
function openTemplateTasksPage(){
  const item=Array.from(document.querySelectorAll('.nav-item')).find((el)=>String(el.getAttribute('onclick')||'').includes("showPage('task'"));
  showPage('task',item||null);
}
function applySelectedTemplate(){
  const tpl=getEnergyAwareTemplate();
  templateEvents=tpl.blocks.map((block,idx)=>({
    id:`template-${tpl.id}-${idx}`,
    time:block.time,
    title:block.title,
    meta:block.meta,
    template:true,
    week:tpl.id==='week',
    hl:false
  }));
  const adjusted=todayEnergy&&todayEnergy<=2&&selectedTemplateId!=='light';
  const message=adjusted
    ? 'Energia bassa: ho usato la giornata leggera. I blocchi sono una preview locale nel calendario di Filo.'
    : `${tpl.name} applicato come preview nel calendario di Filo. Google Calendar non è stato modificato.`;
  setTemplateFeedback(message,'info');
  renderCalendar();
}
async function createTemplateTask(label,priority='normale',dueInput='Oggi'){
  const parsedDueDate=dueInput==='Oggi'?new Date():parseTaskDueDate(dueInput);
  const dueDateIso=parsedDueDate&&!Number.isNaN(parsedDueDate.getTime())?parsedDueDate.toISOString():null;
  const fallbackTask={id:nextTaskId++,label,done:false,status:'todo',priorita:priority,scadenza:dueInput,dueDateIso,reminderAt:null,recurrence:'none',energyCost:3,stressImpact:3};
  const apiPriorityMap={bassa:'low',normale:'medium',alta:'high',urgente:'urgent'};
  const userId=currentUser?.id||'11111111-1111-1111-1111-111111111111';
  try{
    const res=await fetchApi('/api/v1/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,title:label,priority:apiPriorityMap[priority]||'medium',dueDate:dueDateIso,reminderAt:null,recurrence:'none'})});
    if(!res.ok)throw new Error(`POST /tasks fallita (${res.status})`);
    const payload=await res.json();
    tasks.unshift(payload?.data?normalizeApiTask(payload.data):fallbackTask);
  }catch(err){
    console.warn('Errore creazione task da template:',err);
    tasks.unshift(fallbackTask);
  }
}
async function createTasksFromTemplate(){
  const tpl=getEnergyAwareTemplate();
  const items=getMissingTemplateTaskLabels(tpl);
  const btn=document.getElementById('template-create-tasks-btn');
  const openTasksAction='<button class="btn-ghost template-feedback-action" onclick="openTemplateTasksPage()">Apri Task</button>';
  if(!items.length){
    openTemplateTasksPage();
    return;
  }
  if(btn){btn.disabled=true;btn.textContent='Creo task...';}
  try{
    for(const label of items)await createTemplateTask(label,tpl.id==='focus'?'alta':'normale',tpl.id==='week'?'Questa settimana':'Oggi');
    saveTasksToCache();
    renderTasks();
    updateBadges();
    const noun=items.length===1?'task creato':'task creati';
    setTemplateFeedback(`${items.length} ${noun} di partenza da ${tpl.name}. I blocchi orari restano una preview nel calendario.`,'success',openTasksAction);
    updateTemplateTaskActionButton();
  }finally{
    if(btn){btn.disabled=false;updateTemplateTaskActionButton();}
  }
}
function renderCalendar(){
  const el=document.getElementById('cal-events');if(!el)return;
  const source=[...calendarEvents,...templateEvents].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''),'it',{numeric:true}));
  if(!source.length){
    el.innerHTML=calendarConnected
      ? '<div class="empty-state"><div class="empty-title">Nessun evento Google Calendar per oggi</div><div class="empty-sub">Prova "Sincronizza" oppure applica un template per costruire un ritmo di lavoro.</div></div>'
      : '<div class="empty-state"><div class="empty-title">Google Calendar non collegato</div><div class="empty-sub">Collega il tuo account oppure applica un template per vedere i blocchi consigliati da Filo.</div></div>';
    return;
  }
  el.innerHTML=source.map(ev=>{
    const isTemplate=!!ev.template;
    const safeId=String(ev.id).replace(/'/g,"\\'");
    const attrs=isTemplate?'':`role="button" tabindex="0" onclick="openCalendarEventModal('${safeId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCalendarEventModal('${safeId}');}"`;
    return `<div class="cal-slot"><div class="cal-time">${escapeHtml(ev.time||'--:--')}</div><div class="cal-block ${ev.hl?'hl':''} ${isTemplate?'template':''} ${ev.week?'week':''}" ${attrs}><div style="font-size:13px;font-weight:500;color:${ev.hl?'var(--color-primary-strong)':'var(--color-text)'};margin-bottom:3px;">${escapeHtml(ev.title||'(Senza titolo)')}</div><div style="font-size:12px;color:${ev.hl?'#185FA5':'var(--color-muted)'};">${escapeHtml(ev.meta||'')}</div></div></div>`;
  }).join('');
  const activeCalendarPage=document.getElementById('page-calendario').classList.contains('active');
  if(activeCalendarPage){
    const eventCount=calendarEvents.length;
    const templateCount=templateEvents.length;
    PAGE_META.calendario[1]=calendarConnected?`${eventCount} eventi Google Calendar oggi${templateCount?` · ${templateCount} blocchi Filo`:''}`:(templateCount?`${templateCount} blocchi Filo applicati`:'Collega Google Calendar per importare i tuoi eventi');
    document.getElementById('page-sub').textContent=PAGE_META.calendario[1];
  }
}
function renderTaskMeta(t){
  const chips=[];
  if(t.scadenza)chips.push(`<span class="task-chip">Scad. ${escapeHtml(t.scadenza)}</span>`);
  const reminder=formatReminderLabel(t.reminderAt);
  if(reminder)chips.push(`<span class="task-chip reminder">Promemoria ${escapeHtml(reminder)}</span>`);
  const recur=recurrenceLabel(t.recurrence);
  if(recur)chips.push(`<span class="task-chip recur">${escapeHtml(recur)}</span>`);
  return chips.length?`<div class="task-meta">${chips.join('')}</div>`:'';
}
function taskActionButtons(t){
  const id=String(t.id).replace(/'/g,"\\'");
  const status=getTaskStatus(t);
  const buttons=[];
  if(status!=='todo')buttons.push(`<button class="btn-ghost" onclick="moveTaskStatus('${id}','todo')">Riapri</button>`);
  if(status!=='in_progress')buttons.push(`<button class="btn-ghost" onclick="moveTaskStatus('${id}','in_progress')">In corso</button>`);
  if(status!=='done'){
    if(getAcceptedSmartSlot(t))buttons.push('<button class="btn-ghost" disabled>Slot segnato</button>');
    else buttons.push(`<button class="btn-ghost" onclick="suggestSmartSlot('${id}',this)">Proponi slot oggi</button>`);
  }
  if(status!=='done')buttons.push(`<button class="btn-primary" onclick="moveTaskStatus('${id}','done')">Completa</button>`);
  buttons.push(`<button class="btn-icon" onclick="deleteTask('${id}')">✕</button>`);
  return buttons.join('');
}
function taskStatusBadge(t){
  const status=getTaskStatus(t);
  const map={todo:['Da fare','b-bassa'],in_progress:['In corso','b-blue'],done:['Completato','b-green']};
  const [label,cls]=map[status]||map.todo;
  return `<span class="badge ${cls}">${label}</span>`;
}

function getTaskByUiId(id){const key=String(id);return tasks.find(t=>String(t.id)===key)||null;}
function inferSmartSlotDuration(task){
  const title=String(task?.label||'').toLowerCase();
  if(/\b(chiam|telefon|call|zoom|meet|teams)\w*/i.test(title))return 15;
  if(/\b(email|mail|rispond|messaggio|whatsapp)\w*/i.test(title))return 15;
  if(Number(task?.energyCost||3)<=2)return 15;
  if(Number(task?.energyCost||3)>=4)return 60;
  return 30;
}
function buildTodayWorkWindow(){
  const start=new Date();start.setHours(9,0,0,0);
  const end=new Date();end.setHours(21,30,0,0);
  return{from:start,to:end,date:formatLocalDate(start),workStartHour:9,workEndHour:22};
}
function formatSmartSlotRange(startIso,endIso){
  const start=new Date(startIso);const end=new Date(endIso);
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return 'Orario da definire';
  return `${start.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})} – ${end.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`;
}
function smartSlotFitLabel(score){
  const value=Number(score);
  if(!Number.isFinite(value))return 'Compatibilità buona';
  if(value>=85)return 'Compatibilità alta';
  if(value>=70)return 'Compatibilità buona';
  return 'Compatibilità possibile';
}
function getAcceptedSmartSlot(task){return smartSlotAccepted[String(task?.id||'')]||null;}
function acceptSmartSlot(taskId,start,end){
  const key=String(taskId);
  if(!key||!start||!end)return;
  smartSlotAccepted[key]={start,end,acceptedAt:new Date().toISOString(),mode:'local_preview'};
  saveSmartSlotAccepted();
  renderTasks();
}
function renderSmartSlotPanel(t){
  const accepted=getAcceptedSmartSlot(t);
  if(accepted){
    return `<div class="smart-slot-panel"><div class="smart-slot-head"><div><div class="smart-slot-title">Slot segnato</div><div class="smart-slot-time">Oggi ${escapeHtml(formatSmartSlotRange(accepted.start,accepted.end))}</div></div><span class="badge b-green">Preview</span></div><div class="smart-slot-reason">Filo lo considera pianificato solo in questa vista. Non ha creato, spostato o modificato eventi nel Calendar.</div></div>`;
  }
  const state=smartSlotState[String(t.id)];
  if(!state)return '';
  if(state.loading)return '<div class="smart-slot-panel"><div class="smart-slot-empty"><span class="spinning">↻</span> Cerco una proposta leggera in calendario per oggi…</div></div>';
  if(state.error)return `<div class="smart-slot-panel"><div class="smart-slot-title">Auto-scheduling leggero</div><div class="smart-slot-empty">${escapeHtml(state.error)}</div></div>`;
  const suggestions=Array.isArray(state.suggestions)?state.suggestions:[];
  if(!suggestions.length)return `<div class="smart-slot-panel"><div class="smart-slot-title">Auto-scheduling leggero</div><div class="smart-slot-empty">${escapeHtml(state.message||'Oggi non vedo uno slot abbastanza sano per questo task.')}</div></div>`;
  const best=suggestions[0];
  const alternatives=suggestions.slice(1).map(s=>formatSmartSlotRange(s.start,s.end)).join(' · ');
  const safeTaskId=String(t.id).replace(/'/g,"\\'");
  const safeStart=String(best.start||'').replace(/'/g,"\\'");
  const safeEnd=String(best.end||'').replace(/'/g,"\\'");
  return `<div class="smart-slot-panel"><div class="smart-slot-head"><div><div class="smart-slot-title">${escapeHtml(best.label||'Slot proposto')}</div><div class="smart-slot-time">Oggi ${escapeHtml(formatSmartSlotRange(best.start,best.end))}</div></div><span class="badge b-green" title="Valutazione interna basata su calendario, energia, stress e durata del task">${escapeHtml(smartSlotFitLabel(best.score))}</span></div><div class="smart-slot-reason">${escapeHtml(best.reason||state.message||'Slot libero compatibile con energia e stress di oggi.')} Filo non scrive nel Calendar: resta una proposta da confermare manualmente.</div><div class="task-card-actions"><button class="btn-primary" onclick="acceptSmartSlot('${safeTaskId}','${safeStart}','${safeEnd}')">Segna come fissato</button></div>${alternatives?`<div class="smart-slot-alt">Alternative: ${escapeHtml(alternatives)}</div>`:''}</div>`;
}
async function suggestSmartSlot(taskId,button=null){
  const task=getTaskByUiId(taskId);
  if(!task||!currentUser?.id)return;
  const key=String(task.id);
  smartSlotState[key]={loading:true};
  if(button){button.disabled=true;button.textContent='Cerco…';}
  renderTasks();
  try{
    const win=buildTodayWorkWindow();
    const payload={
      userId:currentUser.id,
      durationMinutes:inferSmartSlotDuration(task),
      date:win.date,
      from:win.from.toISOString(),
      to:win.to.toISOString(),
      workStartHour:win.workStartHour,
      workEndHour:win.workEndHour,
      mode:'preview',
      writeToCalendar:false,
      task:{title:task.label,energyCost:task.energyCost||3,stressImpact:task.stressImpact||3}
    };
    if(isPersistedTaskId(task.id))payload.taskId=task.id;
    const res=await fetchApi('/api/v1/scheduling/smart-slot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok){const txt=await res.text().catch(()=> '');throw new Error(`POST /scheduling/smart-slot fallita (${res.status}): ${txt}`);}
    const data=await res.json();
    const result=data?.data||{};
    smartSlotState[key]={loading:false,suggestions:Array.isArray(result.suggestions)?result.suggestions:[],message:result.message||''};
  }catch(err){
    console.warn('Smart Slot Suggestion fallita:',err);
    smartSlotState[key]={loading:false,error:'Non riesco a calcolare lo slot ora. Verifica calendario collegato e riprova.'};
  }finally{
    if(button){button.disabled=false;button.textContent='Proponi slot oggi';}
    renderTasks();
  }
}

function taskListActions(t){
  const id=String(t.id).replace(/'/g,"\\'");
  const status=getTaskStatus(t);
  const actions=[];
  if(status==='todo')actions.push(`<button class="btn-ghost" onclick="moveTaskStatus('${id}','in_progress')">In corso</button>`);
  if(status==='in_progress')actions.push(`<button class="btn-ghost" onclick="moveTaskStatus('${id}','todo')">Da fare</button>`);
  if(status!=='done'){
    if(getAcceptedSmartSlot(t))actions.push('<button class="btn-ghost" disabled>Slot segnato</button>');
    else actions.push(`<button class="btn-ghost" onclick="suggestSmartSlot('${id}',this)">Proponi slot oggi</button>`);
  }
  if(status!=='done')actions.push(`<button class="btn-primary" onclick="moveTaskStatus('${id}','done')">Completa</button>`);
  actions.push(`<button class="btn-icon" onclick="deleteTask('${id}')">✕</button>`);
  return `<div class="task-list-actions">${actions.join('')}</div>`;
}
function taskListRow(t,done=false){
  const id=String(t.id).replace(/'/g,"\\'");
  return `<div class="task-row" data-task-id="${id}"><div class="checkbox ${done?'done':''}" onclick="toggleTask('${id}')">${done?'<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>':''}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;color:${done?'var(--color-muted)':'var(--color-text)'};text-decoration:${done?'line-through':'none'};">${escapeHtml(t.label)}</div>${renderTaskMeta(t)}</div>${taskStatusBadge(t)}${prioritaBadge(t.priorita)}${done?`<button class="btn-icon" onclick="deleteTask('${id}')">✕</button>`:taskListActions(t)}</div>${done?'':renderSmartSlotPanel(t)}`;
}
function taskBoardCard(t){
  return `<div class="task-card" data-task-id="${String(t.id).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><div class="task-card-title">${escapeHtml(t.label)}</div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${prioritaBadge(t.priorita)}</div>${renderTaskMeta(t)}<div class="task-card-actions">${taskActionButtons(t)}</div>${renderSmartSlotPanel(t)}</div>`;
}
function renderTaskBoard(){
  const board=document.getElementById('task-board-view');
  if(!board)return;
  const columns=[['todo','Da fare'],['in_progress','In corso'],['done','Completati']];
  board.innerHTML=columns.map(([status,label])=>{
    const items=tasks.filter(t=>getTaskStatus(t)===status);
    return `<div class="task-board-col"><div class="task-board-head"><div class="task-board-title">${label}</div><span class="badge b-normale">${items.length}</span></div>${items.length?items.map(taskBoardCard).join(''):'<div class="empty-sub" style="padding:12px 0;">Nessun task</div>'}</div>`;
  }).join('');
}
function renderTasks(){
  const todo=tasks.filter(t=>getTaskStatus(t)==='todo');
  const inProgress=tasks.filter(t=>getTaskStatus(t)==='in_progress');
  const open=[...todo,...inProgress];
  const done=tasks.filter(t=>getTaskStatus(t)==='done');
  const listView=document.getElementById('task-list-view');
  const boardView=document.getElementById('task-board-view');
  const listBtn=document.getElementById('task-list-view-btn');
  const boardBtn=document.getElementById('task-board-view-btn');
  if(listView)listView.style.display=taskViewMode==='list'?'':'none';
  if(boardView)boardView.style.display=taskViewMode==='board'?'grid':'none';
  if(listBtn)listBtn.classList.toggle('active',taskViewMode==='list');
  if(boardBtn)boardBtn.classList.toggle('active',taskViewMode==='board');
  const ol=document.getElementById('open-tasks-list');
  const dl=document.getElementById('done-tasks-list');
  const dc=document.getElementById('done-tasks-card');
  if(ol){
    document.getElementById('open-tasks-label').textContent=`Aperti (${open.length}) · Da fare ${todo.length} · In corso ${inProgress.length}`;
    if(open.length===0){
      ol.innerHTML='<div style="font-size:13px;color:var(--color-muted);padding:8px 0;font-style:italic;">Nessun task aperto!</div>';
    }else{
      const todoHtml=todo.length?`<div class="task-list-section">Da fare (${todo.length})</div>${todo.map(t=>taskListRow(t,false)).join('')}`:'';
      const progressHtml=inProgress.length?`<div class="task-list-section">In corso (${inProgress.length})</div>${inProgress.map(t=>taskListRow(t,false)).join('')}`:'';
      ol.innerHTML=`${todoHtml}${progressHtml}`;
    }
  }
  if(dc&&dl){
    if(done.length>0){dc.style.display='';document.getElementById('done-tasks-label').textContent=`Completati (${done.length})`;dl.innerHTML=done.map(t=>taskListRow(t,true)).join('');}
    else dc.style.display='none';
  }
  renderTaskBoard();
  updateTaskSubtitle();
  updateBadges();
  refreshSuggestionTaskButtons();
}

function dismissTaskReminderToast(){
  const toast=document.getElementById('task-reminder-toast');
  if(toast)toast.classList.remove('active');
  activeReminderTaskId=null;
}
function openReminderTask(){
  const id=activeReminderTaskId;
  dismissTaskReminderToast();
  showPage('task',document.querySelectorAll('.nav-item')[3]);
  setTaskViewMode('list');
  if(id){
    setTimeout(()=>{
      const row=document.querySelector(`[data-task-id="${CSS.escape(String(id))}"]`);
      if(row)row.scrollIntoView({behavior:'smooth',block:'center'});
    },50);
  }
}
function showTaskReminder(task){
  activeReminderTaskId=String(task.id);
  const sub=document.getElementById('task-reminder-toast-sub');
  const toast=document.getElementById('task-reminder-toast');
  if(sub)sub.textContent=`${task.label} · ${formatReminderLabel(task.reminderAt)}`;
  if(toast)toast.classList.add('active');
  if('Notification' in window){
    if(Notification.permission==='granted')new Notification('Promemoria Filo',{body:task.label});
    else if(Notification.permission==='default')Notification.requestPermission().catch(()=>{});
  }
}
function checkDueTaskReminders(){
  if(!currentUser?.id)return;
  const now=Date.now();
  tasks.forEach(task=>{
    if(getTaskStatus(task)==='done'||!task.reminderAt)return;
    const reminder=getTaskReminderDate(task);
    if(!reminder)return;
    const key=`${currentUser.id}:${task.id}:${task.reminderAt}`;
    if(remindedTaskKeys.has(key))return;
    const ts=reminder.getTime();
    if(ts<=now&&ts>=now-15*60*1000){
      remindedTaskKeys.add(key);
      showTaskReminder(task);
    }
  });
}

function renderNotes(){
  const el=document.getElementById('notes-container');
  if(!el)return;
  if(!notes.length){
    el.innerHTML='<div class="empty-state"><div class="empty-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-muted)" stroke-width="1.4"><rect x="3" y="2" width="14" height="16" rx="2"/><line x1="7" y1="7" x2="13" y2="7"/><line x1="7" y1="10" x2="13" y2="10"/><line x1="7" y1="13" x2="10" y2="13"/></svg></div><div class="empty-title">Nessuna nota ancora</div></div>';
    return;
  }
  el.innerHTML=notes.map(n=>{
    const id=String(n.id).replace(/'/g,"\\'");
    const alreadyTask=hasOpenTaskForNote(n);
    return `<div class="note-card" onclick="openNoteEditor('${id}')">
      <div class="note-card-head">
        <div class="note-card-title">${escapeHtml(n.title)}</div>
        <button class="btn-ghost note-task-btn ${alreadyTask?'done':''}" onclick="event.stopPropagation();createTaskFromNote('${id}',this)">${alreadyTask?'Task creato':'Trasforma in task'}</button>
      </div>
      <div class="note-card-body">${escapeHtml(n.body)}</div>
      <div class="note-card-tags">${n.tags.map((t,j)=>tagBadge(t,j)).join('')}</div>
    </div>`;
  }).join('');
}
function updateBadges(){
  const open=tasks.filter(t=>!t.done).length;
  const inboxCount=mailboxConnected?INBOX.length:0;
  const unread=mailboxConnected?INBOX.filter(i=>i.unread).length:0;
  const noteCount=notes.length;
  const calendarCount=calendarConnected?calendarEvents.length:0;
  const nb=document.getElementById('nb-task');
  if(nb){nb.textContent=open;nb.style.display='';}
  const noteBadge=document.getElementById('nb-note');
  if(noteBadge){noteBadge.textContent=noteCount;noteBadge.style.display='';}
  const calendarBadge=document.getElementById('nb-calendar');
  if(calendarBadge){calendarBadge.textContent=calendarCount;calendarBadge.style.display='';}
  const inboxBadge=document.getElementById('nb-inbox');
  if(inboxBadge){
    inboxBadge.textContent=unread;
    inboxBadge.dataset.loaded=String(inboxCount);
    inboxBadge.title=`${unread} email non lette`;
    inboxBadge.setAttribute('aria-label',`${unread} email non lette`);
  }
  document.getElementById('stat-inbox').textContent=unread;
  document.getElementById('stat-tasks').textContent=open;
  const dueToday=document.getElementById('stat-tasks-due-today');
  if(dueToday)dueToday.textContent=dueTodayLabel(tasks.filter(isTaskDueToday).length);
  updateInboxSubtitle();
}
function updateInboxSubtitle(){const inboxCount=mailboxConnected?INBOX.length:0;const unread=mailboxConnected?INBOX.filter(i=>i.unread).length:0;PAGE_META.inbox[1]=mailboxConnected?(mailboxBackgroundSyncInProgress?`${unread} email non lette · aggiornamento in corso...`:`${unread} email non lette · ${inboxCount} messaggi caricati`):'Mailbox non collegata';const sub=document.getElementById('page-sub');if(sub&&document.getElementById('page-inbox').classList.contains('active'))sub.textContent=PAGE_META.inbox[1];}
function updateTaskSubtitle(){const todo=tasks.filter(t=>getTaskStatus(t)==='todo').length;const progress=tasks.filter(t=>getTaskStatus(t)==='in_progress').length;const done=tasks.filter(t=>getTaskStatus(t)==='done').length;const el=document.getElementById('page-sub');if(el&&document.getElementById('page-task').classList.contains('active'))el.textContent=`${todo+progress} aperti · ${progress} in corso · ${done} completati`;}
function updateStatsPage(){document.getElementById('stat-total-tasks').textContent=tasks.length;document.getElementById('stat-total-notes').textContent=notes.length;document.getElementById('stat-checkins').textContent=(mem_get('checkins')||[]).length;}
async function connectMailbox(){if(!currentUser?.id||mailboxSyncInProgress)return;mailboxConnectionError='';mailboxSyncInProgress=true;renderInboxControls();try{const state=`${getInboxStatePrefix()}${currentUser.id}:${Date.now()}`;sessionStorage.setItem('filo_inbox_oauth_state',state);sessionStorage.setItem(POST_OAUTH_PAGE_KEY,'inbox');saveNotesToCache();const mailboxAuth=await requestMailboxConnectUrl(currentUser.id,state);const authUrl=typeof mailboxAuth==='string'?mailboxAuth:mailboxAuth?.authUrl;const redirectUri=typeof mailboxAuth==='object'&&mailboxAuth?.redirectUri?mailboxAuth.redirectUri:getInboxConnectRedirectUri();if(!authUrl)throw new Error('URL autorizzazione mailbox non disponibile');sessionStorage.setItem(MAILBOX_REDIRECT_URI_KEY,redirectUri);window.location.assign(authUrl);}catch(err){const reason=err?.message?String(err.message):'errore sconosciuto';console.warn('Errore collegamento mailbox:',reason,err);mailboxConnectionError=`Connessione mailbox non riuscita: ${reason}`;showError(mailboxConnectionError);mailboxSyncInProgress=false;renderInboxControls();}}
async function connectOtherMailbox(){if(!currentUser?.id||mailboxSyncInProgress)return;const config=await collectOtherMailboxConfig();if(!config)return;mailboxConnectionError='';mailboxSyncInProgress=true;renderInboxControls();try{const payload=await requestOtherMailboxConnect(config);setInboxConnectionState(true,null,'imap_smtp',payload?.data?.account?.provider_email||config.email||null);clearInboxMessages();showSuccess('Mailbox collegata. Premi "Sincronizza" per importare i messaggi.');}catch(err){const reason=err?.message?String(err.message):'errore sconosciuto';console.warn('Errore collegamento altra mailbox:',reason,err);mailboxConnectionError=`Connessione altra email non riuscita: ${reason}`;showError(mailboxConnectionError);}finally{mailboxSyncInProgress=false;renderAll();}}
async function syncMailbox(){if(!currentUser?.id||!mailboxConnected||mailboxSyncInProgress)return;mailboxSyncInProgress=true;renderInboxControls();try{const endpoint=mailboxProvider==='imap_smtp'?'/api/v1/inbox/imap/sync':'/api/v1/inbox/google/sync';const res=await fetchApi(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id})});if(!res.ok){const txt=await res.text();throw new Error(`POST ${endpoint} fallita (${res.status}): ${txt}`);}const payload=await res.json();const syncedAt=payload?.data?.account?.last_synced_at||new Date().toISOString();setInboxConnectionState(true,syncedAt,mailboxProvider||'google',payload?.data?.account?.provider_email||mailboxProviderEmail);await loadInboxMessages();}catch(err){console.warn('Errore sync mailbox:',err);if(currentUser?.id){if(isMailboxAuthExpiredError(err)){markMailboxReconnectRequired();}else{mailboxConnectionError='Sincronizzazione mailbox non riuscita.';}}}finally{mailboxSyncInProgress=false;renderAll();}}
async function disconnectMailbox(){if(!currentUser?.id||!mailboxConnected||mailboxSyncInProgress||mailboxBackgroundSyncInProgress)return;const ok=window.confirm('Vuoi scollegare questa mailbox da Filo? Le credenziali e i messaggi sincronizzati verranno eliminati per rispettare la tua privacy.');if(!ok)return;mailboxConnectionError='';mailboxSyncInProgress=true;renderInboxControls();try{const res=await fetchApi('/api/v1/inbox/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id})});if(!res.ok){const txt=await res.text();throw new Error(`DELETE /inbox/account fallita (${res.status}): ${txt}`);}setInboxConnectionState(false,null);closeInboxMessage();showSuccess('Mailbox scollegata. Messaggi sincronizzati eliminati da Filo.');}catch(err){console.warn('Errore scollegamento mailbox:',err);mailboxConnectionError='Scollegamento mailbox non riuscito. Riprova.';showError(mailboxConnectionError);}finally{mailboxSyncInProgress=false;renderAll();}}
async function connectCalendar(){
  if(!currentUser?.id||calendarSyncInProgress)return;
  if(!isUuid(currentUser.id)){
    const reason=`userId non UUID valido (${currentUser.id})`;
    calendarConnectionError=reason;
    setCalendarDiagnostic('KO',reason);
    showError('Impossibile collegare Google Calendar: utente non valido.');
    renderCalendarControls();
    return;
  }
  calendarConnectionError='';
  calendarSyncInProgress=true;
  setCalendarDiagnostic('IN CORSO','reindirizzamento a Google');
  renderCalendarControls();
  try{
    const state=`${getCalendarStatePrefix()}${currentUser.id}:${Date.now()}`;
    removeCalendarTransient(CALENDAR_OAUTH_QUERY_STORAGE_KEY);
    setCalendarTransient('filo_calendar_oauth_state',state);
    markCalendarOAuthPending(currentUser.id);
    sessionStorage.setItem(POST_OAUTH_PAGE_KEY,'calendario');
    const calendarAuth=await requestCalendarConnectUrl(currentUser.id,state);
    const authUrl=typeof calendarAuth==='string'?calendarAuth:calendarAuth?.authUrl;
    const redirectUri=typeof calendarAuth==='object'&&calendarAuth?.redirectUri?calendarAuth.redirectUri:getCalendarConnectRedirectUri();
    if(!authUrl)throw new Error('URL autorizzazione calendario non disponibile');
    setCalendarTransient(CALENDAR_REDIRECT_URI_KEY,redirectUri);
    setCalendarDiagnostic('IN CORSO',`redirect ${redirectUri}`);
    window.location.assign(authUrl);
  }catch(err){
    let reason=err?.message?String(err.message):'errore sconosciuto';
    if(reason.toLowerCase()==='failed to fetch'){
      reason=`Failed to fetch (API base: ${API_BASES.join(', ')||'n/d'})`;
    }
    if(reason.includes('Autenticazione richiesta'))reason='Sessione scaduta: effettua di nuovo il login.';
    if(reason.includes('API bootstrap failed'))reason='Servizio backend non pronto (deploy). Riprova tra poco.';
    calendarConnectionError=`Connessione calendario non riuscita: ${reason}`;
    setCalendarDiagnostic('KO',reason);
    clearCalendarOAuthFlowState();
    showError('Impossibile collegare Google Calendar.');
    calendarSyncInProgress=false;
    renderCalendarControls();
  }
}
async function syncCalendar(){
  if(!currentUser?.id){
    calendarConnectionError='Sessione utente non disponibile per la sincronizzazione.';
    renderCalendarControls();
    return;
  }
  if(!calendarConnected){
    calendarConnectionError='Google Calendar non collegato.';
    renderCalendarControls();
    return;
  }
  if(calendarSyncInProgress){
    setCalendarDiagnostic('IN CORSO','sincronizzazione già in corso');
    return;
  }
  calendarSyncInProgress=true;
  setCalendarDiagnostic('IN CORSO','sincronizzazione calendario');
  renderCalendarControls();
  try{
    const {res,path}=await fetchCalendarApiWithFallback(
      ['/api/v1/calendar/google/sync','/api/v1/calendar/sync'],
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id})}
    );
    if(!res.ok){
      const txt=await res.text();
      throw new Error(`POST ${path.replace('/api/v1','')} fallita (${res.status}): ${txt}`);
    }
    const payload=await res.json();
    const syncedAt=payload?.data?.account?.last_synced_at||new Date().toISOString();
    setCalendarConnectionState(true,syncedAt);
    await loadCalendarStatus();
    await loadCalendarEvents();
    setCalendarDiagnostic('OK','sincronizzazione completata');
  }catch(err){
    const reason=err?.message?String(err.message):'errore sconosciuto';
    console.warn('Errore sync calendario:',reason,err);
    if(isCalendarAuthExpiredError(err)){
      markCalendarReconnectRequired();
      setCalendarDiagnostic('KO','sessione Google Calendar scaduta');
    }else{
      calendarConnectionError=`Sincronizzazione calendario non riuscita: ${reason}`;
      setCalendarDiagnostic('KO',reason);
    }
  }finally{
    calendarSyncInProgress=false;
    renderAll();
  }
}

// ── TASK CRUD ─────────────────────────────────────────────────────────────────
function toggleTaskForm(){const f=document.getElementById('task-form');const b=document.getElementById('task-form-toggle');const open=f.style.display==='none';f.style.display=open?'':'none';b.textContent=open?'Annulla':'+ Nuovo task';b.style.background=open?'var(--color-subtle)':'var(--color-primary)';b.style.color=open?'var(--color-muted-strong)':'#fff';if(open)document.getElementById('new-task-label').focus();}
async function persistTaskStatus(task,status){
  if(!currentUser?.id||!isPersistedTaskId(task.id))return null;
  const res=await fetchApi(`/api/v1/tasks/${encodeURIComponent(task.id)}/status`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:currentUser.id,status})
  });
  if(!res.ok){const txt=await res.text().catch(()=> '');throw new Error(`PATCH /tasks/${task.id}/status fallita (${res.status}): ${txt}`);}
  const payload=await res.json();
  return payload?.data?normalizeApiTask(payload.data):null;
}
async function createRecurringFollowUp(sourceTask){
  const recurrence=sourceTask?.recurrence||'none';
  if(!['daily','weekly','monthly'].includes(recurrence))return;
  const baseDue=getTaskDueDate(sourceTask)||new Date();
  const nextDue=addRecurrenceInterval(baseDue,recurrence);
  const currentReminder=getTaskReminderDate(sourceTask);
  const nextReminder=currentReminder?addRecurrenceInterval(currentReminder,recurrence):null;
  const apiPriorityMap={bassa:'low',normale:'medium',alta:'high',urgente:'urgent'};
  const fallback={
    id:nextTaskId++,
    label:sourceTask.label,
    done:false,
    status:'todo',
    priorita:sourceTask.priorita||'normale',
    scadenza:formatDueForUi(nextDue),
    dueDateIso:nextDue.toISOString(),
    reminderAt:nextReminder?nextReminder.toISOString():null,
    recurrence,
    energyCost:3,
    stressImpact:3
  };
  try{
    if(currentUser?.id){
      const res=await fetchApi('/api/v1/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id,title:sourceTask.label,priority:apiPriorityMap[sourceTask.priorita]||'medium',dueDate:nextDue.toISOString(),reminderAt:nextReminder?nextReminder.toISOString():null,recurrence})});
      if(res.ok){const payload=await res.json();tasks.unshift(payload?.data?normalizeApiTask(payload.data):fallback);return;}
    }
  }catch(err){console.warn('Creazione ricorrenza su backend fallita:',err);}
  tasks.unshift(fallback);
}
async function moveTaskStatus(id,status){
  const idKey=String(id);
  const t=tasks.find(task=>String(task.id)===idKey);
  if(!t)return;
  const previousStatus=getTaskStatus(t);
  if(previousStatus===status)return;
  const shouldCreateRecurrence=status==='done'&&previousStatus!=='done';
  const shouldSyncSuggestionState=shouldSyncTaskSuggestionState(t);
  setTaskStatusLocal(t,status);
  if(shouldCreateRecurrence){
    if(shouldSyncSuggestionState){
      dismissSuggestionTitle(getTaskSuggestionTitle(t));
      await persistSuggestionState(getTaskSuggestionTitle(t),'completed');
    }
    recordTaskCompleted(t);
  }else if(status!=='done'&&previousStatus==='done'&&shouldSyncSuggestionState){
    restoreSuggestionTitle(getTaskSuggestionTitle(t));
    await persistSuggestionState(getTaskSuggestionTitle(t),'added');
  }
  saveTasksToCache();
  renderTasks();
  try{
    const updated=await persistTaskStatus(t,status);
    const merged=updated?{
      ...t,
      ...updated,
      dueDateIso:updated.dueDateIso||t.dueDateIso,
      scadenza:updated.scadenza||t.scadenza,
      reminderAt:updated.reminderAt||t.reminderAt,
      recurrence:updated.recurrence||t.recurrence,
      suggestionTitle:updated.suggestionTitle||t.suggestionTitle
    }:t;
    if(updated){tasks=tasks.map(task=>String(task.id)===idKey?merged:task);}
    if(shouldCreateRecurrence)await createRecurringFollowUp(merged);
    saveTasksToCache();
    renderTasks();
  }catch(err){
    console.warn('Cambio stato task salvato localmente ma non sincronizzato col backend:',err);
    // Mantieni l'aggiornamento ottimistico: tornare allo stato precedente crea un rimbalzo visivo
    // quando l'API è lenta, non ancora deployata o il DB non ha ancora applicato la migration.
    if(shouldCreateRecurrence)await createRecurringFollowUp(t);
    saveTasksToCache();
    renderTasks();
  }
}
async function addTask() {
  const label = document.getElementById('new-task-label').value.trim();
  const priority = document.getElementById('new-task-pri').value;
  const dueInput = document.getElementById('new-task-scad').value.trim();
  const reminderInput = document.getElementById('new-task-reminder').value;
  const recurrence = document.getElementById('new-task-recur').value || 'none';
  const apiPriorityMap = { bassa: 'low', normale: 'medium', alta: 'high', urgente: 'urgent' };
  const userId = currentUser?.id || '11111111-1111-1111-1111-111111111111';

  if (!label) return;

  const parsedDueDate = dueInput ? parseTaskDueDate(dueInput) : null;
  const dueDateIso = parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? parsedDueDate.toISOString() : null;
  const parsedReminder = parseDateTimeLocalInput(reminderInput);
  const reminderAt = parsedReminder ? parsedReminder.toISOString() : null;
  const fallbackTask = {
    id: nextTaskId++,
    label,
    done: false,
    status: 'todo',
    priorita: priority,
    scadenza: dueInput,
    dueDateIso,
    reminderAt,
    recurrence,
    energyCost:3,
    stressImpact:3
  };

  try {
    const res = await fetchApi('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: label,
        priority: apiPriorityMap[priority] || 'medium',
        dueDate: dueDateIso,
        reminderAt,
        recurrence
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`POST /tasks fallita (${res.status}): ${errorText}`);
    }

    const payload = await res.json();
    const created = payload?.data;
    tasks.unshift(created?normalizeApiTask(created):fallbackTask);
  } catch (err) {
    console.error('Errore creazione task:', err);
    tasks.unshift(fallbackTask);
  }

  saveTasksToCache();
  renderTasks();
  document.getElementById('new-task-label').value = '';
  document.getElementById('new-task-pri').value = 'normale';
  document.getElementById('new-task-scad').value = '';
  document.getElementById('new-task-reminder').value = '';
  document.getElementById('new-task-recur').value = 'none';
  toggleTaskForm();
}
function toggleTaskImport(){
  const panel=document.getElementById('task-import-panel');
  const btn=document.getElementById('task-import-toggle');
  if(!panel||!btn)return;
  const open=panel.style.display==='none';
  panel.style.display=open?'':'none';
  btn.textContent=open?'Chiudi import':'Importa';
  if(open){
    const form=document.getElementById('task-form');
    if(form&&form.style.display!=='none')toggleTaskForm();
    document.getElementById('task-import-text')?.focus();
  }
}
function clearTaskImport(){
  const text=document.getElementById('task-import-text');
  const file=document.getElementById('task-import-file');
  if(text)text.value='';
  if(file)file.value='';
  clearTaskImportPreview();
}
function fillTaskImportExample(){
  const text=document.getElementById('task-import-text');
  if(!text)return;
  text.value=[
    'titolo,scadenza,priorita,note',
    'Chiamare cliente Rossi,oggi,alta,Confermare avanzamento proposta',
    'Preparare budget Q2,domani,urgente,Portare bozza alla review interna',
    'Rispondere a email fornitore,2026-06-08,normale,Verificare tempi di consegna',
    'Fare backup documenti progetto,,bassa,Task senza scadenza'
  ].join('\n');
  previewTaskImport();
}
function clearTaskImportPreview(){
  taskImportRows=[];
  resetTaskImportPreviewUi();
}
function resetTaskImportPreviewUi(){
  const preview=document.getElementById('task-import-preview');
  const actions=document.getElementById('task-import-actions');
  const message=document.getElementById('task-import-message');
  if(preview){preview.classList.remove('active');preview.innerHTML='';}
  if(actions)actions.style.display='none';
  if(message){message.textContent='';message.style.color='#6F6A61';}
}
function taskImportDedupKey(title,dueDateIso){
  const normalizedTitle=String(title||'').trim().replace(/\s+/g,' ').toLowerCase();
  const normalizedDate=dueDateIso?new Date(dueDateIso).toISOString().slice(0,10):'';
  return `${normalizedTitle}::${normalizedDate}`;
}
function normalizeImportPriority(value){
  const normalized=String(value||'').trim().toLowerCase();
  if(['urgente','urgent','u','4'].includes(normalized))return { ui:'urgente', api:'urgent' };
  if(['alta','alto','high','h','3'].includes(normalized))return { ui:'alta', api:'high' };
  if(['bassa','basso','low','l','1'].includes(normalized))return { ui:'bassa', api:'low' };
  return { ui:'normale', api:'medium' };
}
function parseTaskImportDueDate(value){
  const raw=String(value||'').trim();
  if(!raw)return { label:'', iso:null };
  const parsed=parseTaskDueDate(raw);
  if(parsed&&!Number.isNaN(parsed.getTime()))return { label:raw, iso:parsed.toISOString() };
  return { label:raw, iso:null };
}
function parseDelimitedRows(text,delimiter=null){
  const rows=[];
  let row=[];
  let cell='';
  let inQuotes=false;
  const source=String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const detectDelimiter=(line)=>{
    if(delimiter)return delimiter;
    const candidates=['\t',';',','];
    return candidates
      .map(value=>({value,count:line.split(value).length}))
      .sort((a,b)=>b.count-a.count)[0].value;
  };
  let activeDelimiter=delimiter;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    const next=source[i+1];
    if(ch==='"'){
      if(inQuotes&&next==='"'){cell+='"';i+=1;}
      else inQuotes=!inQuotes;
      continue;
    }
    if(!inQuotes&&ch==='\n'){
      row.push(cell.trim());
      if(row.some(Boolean))rows.push(row);
      row=[];
      cell='';
      activeDelimiter=null;
      continue;
    }
    if(!activeDelimiter){
      const lineEnd=source.indexOf('\n',i);
      const line=lineEnd>=0?source.slice(i,lineEnd):source.slice(i);
      activeDelimiter=detectDelimiter(line);
    }
    if(!inQuotes&&ch===activeDelimiter){
      row.push(cell.trim());
      cell='';
      continue;
    }
    cell+=ch;
  }
  row.push(cell.trim());
  if(row.some(Boolean))rows.push(row);
  return rows;
}
function looksLikeTaskImportHeader(row){
  const headers=(Array.isArray(row)?row:[]).map(v=>String(v||'').trim().toLowerCase());
  return headers.some(h=>['title','titolo','task','attivita','attività'].includes(h)) ||
    headers.some(h=>['due','due_date','scadenza','data','date'].includes(h));
}
function taskImportHeaderIndex(headers,names){
  return headers.findIndex(h=>names.includes(String(h||'').trim().toLowerCase()));
}
function mapTaskImportRow(row,headers=null){
  const safe=Array.isArray(row)?row:[];
  let title='',dueRaw='',priorityRaw='',notes='';
  if(headers){
    const normalized=headers.map(h=>String(h||'').trim().toLowerCase());
    const titleIdx=taskImportHeaderIndex(normalized,['title','titolo','task','attivita','attività']);
    const dueIdx=taskImportHeaderIndex(normalized,['due','due_date','scadenza','data','date']);
    const priorityIdx=taskImportHeaderIndex(normalized,['priority','priorita','priorità']);
    const notesIdx=taskImportHeaderIndex(normalized,['notes','note','description','descrizione']);
    title=titleIdx>=0?safe[titleIdx]:'';
    dueRaw=dueIdx>=0?safe[dueIdx]:'';
    priorityRaw=priorityIdx>=0?safe[priorityIdx]:'';
    notes=notesIdx>=0?safe[notesIdx]:'';
  }else{
    [title,dueRaw,priorityRaw,notes]=safe;
  }
  const due=parseTaskImportDueDate(dueRaw);
  const priority=normalizeImportPriority(priorityRaw);
  return {
    title:String(title||'').trim().replace(/\s+/g,' ').slice(0,200),
    description:String(notes||'').trim().slice(0,2000),
    dueLabel:due.label,
    dueDateIso:due.iso,
    priorityUi:priority.ui,
    priorityApi:priority.api,
    status:'ok',
    reason:''
  };
}
function parseTaskImportInput(raw){
  const text=String(raw||'').trim();
  if(!text)return [];
  const hasDelimited=/[;\t,]/.test(text);
  if(!hasDelimited){
    return text.split(/\n+/).map(line=>mapTaskImportRow([line.trim()])).filter(row=>row.title);
  }
  const rows=parseDelimitedRows(text);
  if(!rows.length)return [];
  const hasHeader=looksLikeTaskImportHeader(rows[0]);
  const headers=hasHeader?rows.shift():null;
  return rows.map(row=>mapTaskImportRow(row,headers)).filter(row=>row.title);
}
function decorateTaskImportRows(rows){
  const existing=new Set(tasks.map(t=>taskImportDedupKey(t.label,t.dueDateIso)));
  const seen=new Set();
  return rows.map((row)=>{
    const key=taskImportDedupKey(row.title,row.dueDateIso);
    if(!row.title)return {...row,status:'skip',reason:'titolo mancante'};
    if(existing.has(key))return {...row,status:'skip',reason:'duplicato esistente'};
    if(seen.has(key))return {...row,status:'skip',reason:'duplicato nel file'};
    seen.add(key);
    return row;
  });
}
function renderTaskImportPreview(){
  const preview=document.getElementById('task-import-preview');
  const actions=document.getElementById('task-import-actions');
  const message=document.getElementById('task-import-message');
  if(!preview||!actions||!message)return;
  const importable=taskImportRows.filter(row=>row.status==='ok');
  const skipped=taskImportRows.length-importable.length;
  if(!taskImportRows.length){
    preview.classList.remove('active');
    preview.innerHTML='';
    actions.style.display='none';
    message.textContent='Nessun task valido trovato.';
    message.style.color='#9B2525';
    return;
  }
  preview.innerHTML=[
    '<div class="task-import-preview-row head"><div>Task</div><div>Scadenza</div><div>Priorita</div><div>Esito</div></div>',
    ...taskImportRows.map(row=>`<div class="task-import-preview-row ${row.status==='skip'?'skip':''}"><div>${escapeHtml(row.title)}</div><div>${escapeHtml(row.dueLabel||'-')}</div><div>${escapeHtml(row.priorityUi)}</div><div><span class="task-import-status ${row.status==='skip'?'skip':'ok'}">${row.status==='skip'?'Saltato':'Importa'}</span>${row.reason?` <span style="color:var(--color-muted);">${escapeHtml(row.reason)}</span>`:''}</div></div>`)
  ].join('');
  preview.classList.add('active');
  actions.style.display=importable.length?'flex':'none';
  message.textContent=`Anteprima: ${importable.length} task da importare${skipped?`, ${skipped} saltati`:''}.`;
  message.style.color=importable.length?'#0E6B4A':'#8A5C00';
}
function previewTaskImport(){
  const raw=document.getElementById('task-import-text')?.value||'';
  taskImportRows=decorateTaskImportRows(parseTaskImportInput(raw));
  renderTaskImportPreview();
}
function handleTaskImportFile(input){
  const file=input?.files?.[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const text=document.getElementById('task-import-text');
    if(text)text.value=String(reader.result||'');
    previewTaskImport();
  };
  reader.readAsText(file);
}
async function confirmTaskImport(){
  const importable=taskImportRows.filter(row=>row.status==='ok');
  if(!importable.length)return;
  const btn=document.getElementById('task-import-confirm-btn');
  const message=document.getElementById('task-import-message');
  const apiPayload=importable.map(row=>({
    title:row.title,
    description:row.description||'',
    priority:row.priorityApi,
    dueDate:row.dueDateIso,
    reminderAt:null,
    recurrence:'none'
  }));
  let finalMessage=`Import completato: ${importable.length} task aggiunti.`;
  let finalColor='#0E6B4A';
  if(btn){btn.disabled=true;btn.textContent='Importo...';}
  try{
    if(currentUser?.id){
      const res=await fetchApi('/api/v1/tasks/import',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:currentUser.id,tasks:apiPayload})
      });
      if(!res.ok){
        const txt=await res.text().catch(()=> '');
        throw new Error(`POST /tasks/import fallita (${res.status}): ${txt}`);
      }
      const payload=await res.json();
      const created=Array.isArray(payload?.data?.created)?payload.data.created:[];
      tasks.unshift(...created.map(normalizeApiTask));
      const skipped=Number(payload?.data?.skipped?.length||0);
      finalMessage=`Import completato: ${created.length} task salvati${skipped?`, ${skipped} duplicati saltati`:''}.`;
    }else{
      throw new Error('Utente non disponibile');
    }
  }catch(err){
    console.warn('Import task salvato localmente:',err);
    const fallback=importable.map(row=>({
      id:nextTaskId++,
      label:row.title,
      done:false,
      status:'todo',
      priorita:row.priorityUi,
      scadenza:row.dueLabel,
      dueDateIso:row.dueDateIso,
      reminderAt:null,
      recurrence:'none',
      energyCost:3,
      stressImpact:3
    }));
    tasks.unshift(...fallback);
    finalMessage=`Backend non raggiungibile: ${fallback.length} task importati in locale.`;
    finalColor='#8A5C00';
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Importa task';}
    saveTasksToCache();
    taskImportRows=[];
    resetTaskImportPreviewUi();
    if(message){
      message.textContent=finalMessage;
      message.style.color=finalColor;
    }
    const panel=document.getElementById('task-import-panel');
    const toggle=document.getElementById('task-import-toggle');
    if(panel)panel.style.display='none';
    if(toggle)toggle.textContent='Importa';
    renderTasks();
    updateBadges();
  }
}
async function createTaskFromNote(noteId,button=null){
  const note=notes.find(n=>String(n.id)===String(noteId));
  if(!note)return;
  if(hasOpenTaskForNote(note)){
    renderNotes();
    return;
  }
  const label=String(note.title||'Nota senza titolo').trim().slice(0,200)||'Task da nota';
  const tagLine=Array.isArray(note.tags)&&note.tags.length?`\n\nTag nota: ${note.tags.join(', ')}`:'';
  const description=`Da nota Filo:\n${String(note.body||'').trim()}${tagLine}`.trim().slice(0,2000);
  const fallbackTask={id:nextTaskId++,label,done:false,status:'todo',priorita:'normale',scadenza:'',dueDateIso:null,reminderAt:null,recurrence:'none',energyCost:3,stressImpact:3,sourceNoteId:String(note.id)};

  if(button){
    button.disabled=true;
    button.textContent='Creo task…';
  }

  try{
    if(currentUser?.id){
      const res=await fetchApi('/api/v1/tasks',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          userId:currentUser.id,
          title:label,
          description,
          priority:'medium',
          dueDate:null,
          reminderAt:null,
          recurrence:'none'
        })
      });
      if(!res.ok){
        const txt=await res.text().catch(()=> '');
        throw new Error(`POST /tasks da nota fallita (${res.status}): ${txt}`);
      }
      const payload=await res.json();
      const created=payload?.data?normalizeApiTask(payload.data):fallbackTask;
      created.sourceNoteId=String(note.id);
      tasks.unshift(created);
    }else{
      tasks.unshift(fallbackTask);
    }
  }catch(err){
    console.warn('Creazione task da nota salvata localmente:',err);
    tasks.unshift(fallbackTask);
  }

  saveTasksToCache();
  renderNotes();
  renderTasks();
  updateBadges();
}
function hasOpenTaskForNote(note){
  const noteId=String(note?.id||'');
  const title=String(note?.title||'').trim();
  return tasks.some(t=>getTaskStatus(t)!=='done'&&(String(t?.sourceNoteId||'')===noteId||String(t?.label||'').trim()===title));
}
async function addTaskFromSuggestion(titolo,button=null,sourceTitle=null){
  const label=String(titolo||'Azione').trim()||'Azione';
  const suggestionTitle=String(sourceTitle||button?.getAttribute?.('data-suggestion-task-title')||label).trim()||label;
  restoreSuggestionTitle(suggestionTitle);
  await persistSuggestionState(suggestionTitle,'added');
  if(!isSuggestionTaskOpen(suggestionTitle)){
    const fallbackTask={id:nextTaskId++,label,done:false,status:'todo',priorita:'urgente',scadenza:'Oggi',dueDateIso:new Date().toISOString(),reminderAt:null,recurrence:'none',energyCost:3,stressImpact:3,suggestionTitle};
    try{
      if(currentUser?.id){
        const res=await fetchApi('/api/v1/tasks',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({userId:currentUser.id,title:label,priority:'urgent',dueDate:fallbackTask.dueDateIso,reminderAt:null,recurrence:'none',sourceSuggestionTitle:suggestionTitle})
        });
        if(res.ok){
          const payload=await res.json();
          tasks.push(payload?.data?normalizeApiTask(payload.data):fallbackTask);
        }else{
          throw new Error(`POST /tasks fallita (${res.status})`);
        }
      }else{
        tasks.push(fallbackTask);
      }
    }catch(err){
      console.warn('Task da suggerimento salvato solo localmente:',err);
      tasks.push(fallbackTask);
    }
    saveTasksToCache();
  }
  renderTasks();
  if(button)setSuggestionTaskButtonState(button,true);
  refreshSuggestionTaskButtons();
  showPage('task',document.querySelectorAll('.nav-item')[3]);
}
async function toggleTask(id){
  const idKey=String(id);
  const t=tasks.find(task=>String(task.id)===idKey);
  if(!t)return;
  await moveTaskStatus(idKey,getTaskStatus(t)==='done'?'todo':'done');
}
async function deleteTask(id){
  const idKey=String(id);
  const previous=tasks.slice();
  const removed=tasks.find(t=>String(t.id)===idKey);
  const removedSuggestionTitle=removed?getTaskSuggestionTitle(removed):'';
  const wasSuggestionDismissed=removed?isSuggestionDismissed(removedSuggestionTitle):false;
  const shouldSyncRemovedSuggestionState=removed&&shouldSyncTaskSuggestionState(removed);
  if(shouldSyncRemovedSuggestionState){
    dismissSuggestionTitle(removedSuggestionTitle);
    await persistSuggestionState(removedSuggestionTitle,'dismissed');
  }
  tasks=tasks.filter(t=>String(t.id)!==idKey);
  saveTasksToCache();
  renderTasks();

  if(!currentUser?.id||!isPersistedTaskId(idKey))return;

  try{
    const res=await fetchApi(`/api/v1/tasks/${encodeURIComponent(idKey)}`,{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:currentUser.id})
    });
    if(res.status===204||res.status===200||res.status===404)return;

    const txt=await res.text().catch(()=> '');
    console.warn(`DELETE /tasks/${idKey} fallita (${res.status}):`,txt);
    tasks=previous;
    if(shouldSyncRemovedSuggestionState&&!wasSuggestionDismissed)restoreSuggestionTitle(removedSuggestionTitle);
    if(shouldSyncRemovedSuggestionState)await persistSuggestionState(removedSuggestionTitle,getTaskStatus(removed)==='done'?'completed':'added');
    saveTasksToCache();
    renderTasks();
  }catch(err){
    console.warn('Errore delete task su backend:',err);
    tasks=previous;
    if(shouldSyncRemovedSuggestionState&&!wasSuggestionDismissed)restoreSuggestionTitle(removedSuggestionTitle);
    if(shouldSyncRemovedSuggestionState)await persistSuggestionState(removedSuggestionTitle,getTaskStatus(removed)==='done'?'completed':'added');
    saveTasksToCache();
    renderTasks();
  }
}

// â”€â”€ NOTE CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showNoteList(){document.getElementById('note-list-view').style.display='';document.getElementById('note-editor-view').style.display='none';document.getElementById('page-sub').textContent=notes.length+' note';document.getElementById('topbar-actions').innerHTML='<button class="btn-primary" onclick="openNoteEditor(null)">＋ Nuova nota</button>';renderNotes();updateBadges();}
function openNoteEditor(id){currentNoteId=id?String(id):null;const n=currentNoteId?notes.find(n=>String(n.id)===currentNoteId):null;document.getElementById('note-edit-title').value=n?n.title:'';document.getElementById('note-edit-body').value=n?n.body:'';document.getElementById('note-edit-tags').value=n?n.tags.join(', '):'';document.getElementById('note-list-view').style.display='none';document.getElementById('note-editor-view').style.display='';document.getElementById('page-sub').textContent=currentNoteId?'Modifica e salva':'Nuova nota';document.getElementById('topbar-actions').innerHTML=`<div style="display:flex;gap:8px;"><button class="btn-primary" onclick="saveNote()">Salva</button><button class="btn-ghost" onclick="showNoteList()">Annulla</button>${currentNoteId?`<button class="btn-danger" onclick="deleteNote('${currentNoteId.replace(/'/g,"\\'")}')">Elimina</button>`:''}</div>`;}
async function saveNote(){const title=document.getElementById('note-edit-title').value.trim()||'Nota senza titolo';const body=document.getElementById('note-edit-body').value.trim();const tags=document.getElementById('note-edit-tags').value.split(',').map(t=>t.trim()).filter(Boolean);if(currentNoteId){const idKey=String(currentNoteId);const n=notes.find(n=>String(n.id)===idKey);if(n){n.title=title;n.body=body;n.tags=tags;}try{if(currentUser?.id){const res=await fetchApi(`/api/v1/notes/${encodeURIComponent(idKey)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id,title,body,tags})});if(res.ok){const payload=await res.json();const updated=normalizeApiNote(payload?.data);notes=notes.map(note=>String(note.id)===idKey?updated:note);}else{const txt=await res.text().catch(()=> '');console.warn(`PATCH /notes/${idKey} fallita (${res.status}):`,txt);}}}catch(err){console.warn('Errore update nota su backend:',err);}}else{const fallback={id:String(nextNoteId++),title,body,tags};notes.unshift(fallback);try{if(currentUser?.id){const res=await fetchApi('/api/v1/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id,title,body,tags})});if(res.ok){const payload=await res.json();const created=normalizeApiNote(payload?.data);notes=notes.map(n=>n.id===fallback.id?created:n);}else{const txt=await res.text().catch(()=> '');console.warn(`POST /notes fallita (${res.status}):`,txt);}}}catch(err){console.warn('Errore creazione nota su backend:',err);}}saveNotesToCache();showNoteList();updateBadges();}
async function deleteNote(id){const idKey=String(id);const previous=notes.slice();notes=notes.filter(n=>String(n.id)!==idKey);saveNotesToCache();showNoteList();updateBadges();try{if(currentUser?.id){const res=await fetchApi(`/api/v1/notes/${encodeURIComponent(idKey)}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUser.id})});if(!(res.status===204||res.status===200)){const txt=await res.text().catch(()=> '');console.warn(`DELETE /notes/${idKey} fallita (${res.status}):`,txt);notes=previous;saveNotesToCache();showNoteList();updateBadges();}}}catch(err){console.warn('Errore delete nota su backend:',err);notes=previous;saveNotesToCache();showNoteList();updateBadges();}}

// ── RICERCA ───────────────────────────────────────────────────────────────────
function doSearch(q){const el=document.getElementById('search-results');if(!q.trim()){el.innerHTML='<div class="empty-state"><div class="empty-title">Inizia a digitare</div></div>';return;}const ql=q.toLowerCase();const rt=tasks.filter(t=>t.label.toLowerCase().includes(ql));const rn=notes.filter(n=>n.title.toLowerCase().includes(ql)||n.body.toLowerCase().includes(ql));const ri=INBOX.filter(i=>i.from.toLowerCase().includes(ql)||i.subj.toLowerCase().includes(ql));if(!rt.length&&!rn.length&&!ri.length){el.innerHTML=`<div style="text-align:center;padding:32px;color:var(--color-muted);font-size:13px;">Nessun risultato per "${q}"</div>`;return;}let html='';if(rt.length)html+=`<div class="card"><div class="sec-label">Task (${rt.length})</div>${rt.map(t=>`<div class="task-row"><span style="font-size:13px;flex:1;color:${t.done?'var(--color-muted)':'var(--color-text)'};text-decoration:${t.done?'line-through':'none'};">${t.label}</span>${prioritaBadge(t.priorita)}</div>`).join('')}</div>`;if(rn.length)html+=`<div class="card"><div class="sec-label">Note (${rn.length})</div>${rn.map(n=>`<div style="padding:9px 0;border-bottom:1px solid rgba(0,0,0,0.05);cursor:pointer;" onclick="showPage('note');openNoteEditor('${String(n.id).replace(/'/g,"\\'")}')"><div style="font-size:13px;font-weight:500;margin-bottom:2px;">${n.title}</div><div style="font-size:12px;color:var(--color-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.body}</div></div>`).join('')}</div>`;if(ri.length)html+=`<div class="card"><div class="sec-label">Email (${ri.length})</div>${ri.map(item=>`<div style="display:flex;gap:10px;padding:9px 0;"><div class="av" style="width:28px;height:28px;font-size:10px;background:${item.bg};color:${item.tc};">${item.initials}</div><div><div style="font-size:13px;font-weight:500;">${item.from}</div><div style="font-size:12px;color:var(--color-muted);">${item.subj}</div></div></div>`).join('')}</div>`;el.innerHTML=html;}

// â”€â”€ IMPOSTAZIONI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toggleEditProfile(){const v=document.getElementById('profile-view');const f=document.getElementById('profile-form');const b=document.getElementById('edit-profile-btn');const editing=f.style.display!=='none';v.style.display=editing?'':'none';f.style.display=editing?'none':'';b.textContent=editing?'Modifica':'Annulla';}
function saveProfile(){const name=document.getElementById('pf-name').value.trim();document.getElementById('pv-name').textContent=name;document.getElementById('profile-name-disp').textContent=name;const ini=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();document.getElementById('profile-av-big').textContent=ini;document.getElementById('sidebar-initials').textContent=ini;document.getElementById('sidebar-name').textContent=name;toggleEditProfile();}
function togglePref(key){prefs[key]=!prefs[key];const on=prefs[key];document.getElementById('toggle-'+key).style.background=on?'var(--color-primary)':'#D0CCC6';document.getElementById('knob-'+key).style.left=on?'19px':'3px';savePrefs();}

function savePrefs(){try{localStorage.setItem('filo_prefs',JSON.stringify(prefs));}catch(e){}}
function normalizeColorSet(value){return value==='salvia'?'salvia':'classic';}
function applyColorSet(colorSet){
  const normalized=normalizeColorSet(colorSet);
  prefs.colorSet=normalized;
  document.body.dataset.colorSet=normalized;
}
function selectColorSet(colorSet){
  applyColorSet(colorSet);
  renderColorSetOptions();
  renderPrefs();
  savePrefs();
}
function loadPrefs(){
  try{
    const raw=localStorage.getItem('filo_prefs');
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==='object'){
        prefs={...prefs,...parsed};
      }
    }
  }catch(e){}
  applyColorSet(prefs.colorSet);
}
function renderColorSetOptions(){
  ['classic','salvia'].forEach((colorSet)=>{
    const el=document.getElementById(`color-set-${colorSet}`);
    if(!el)return;
    const active=prefs.colorSet===colorSet;
    el.classList.toggle('active',active);
    el.setAttribute('aria-checked',active?'true':'false');
  });
}
function renderPrefs(){
  Object.entries(prefs).forEach(([key,on])=>{
    if(typeof on!=='boolean')return;
    const t=document.getElementById('toggle-'+key);
    const k=document.getElementById('knob-'+key);
    if(!t||!k)return;
    t.style.background=on?'var(--color-primary)':'#D0CCC6';
    k.style.left=on?'19px':'3px';
  });
  renderColorSetOptions();
}

// â”€â”€ AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function appendGuidedInput(targetId,label){
  const input=document.getElementById(targetId);
  if(!input)return;
  const value=input.value.trim();
  const entry=label.endsWith(':')?label:`${label}: `;
  input.value=value?`${value}, ${entry}`:entry;
  saveDayDraft();
  input.focus();
  input.selectionStart=input.selectionEnd=input.value.length;
}
function fillExample(){
  document.getElementById('agenda-input').value="Call con il cliente Rossi alle 10:30, revisione roadmap Q2 alle 14:30, riepilogo team alle 17:00.";
  document.getElementById('pending-input').value="Rispondere a Bianchi sul contratto, approvare budget Q2 entro venerdì, 3 email non lette di Rossi.";
  document.getElementById('day-end-input').value='18:30';
  document.getElementById('day-availability-input').value='2-4 ore';
  document.getElementById('day-focus-input').value='Chiudere il budget Q2 senza rimandare le urgenze clienti';
  saveDayDraft();
}
function fmtFocusTime(totalSeconds){
  const minutes=Math.floor(totalSeconds/60);
  const seconds=totalSeconds%60;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function renderFocusSession(){
  const timerEl=document.getElementById('focus-session-timer');
  const subEl=document.getElementById('focus-session-sub');
  const runningActions=document.getElementById('focus-session-running-actions');
  const doneActions=document.getElementById('focus-session-actions');
  if(timerEl)timerEl.textContent=fmtFocusTime(Math.max(0,focusSessionSeconds));
  if(subEl)subEl.textContent=`Stai lavorando su: ${focusSessionTitle||'-'}`;
  const completed=focusSessionSeconds<=0;
  if(runningActions)runningActions.style.display=completed?'none':'';
  if(doneActions)doneActions.style.display=completed?'':'none';
}
function openFocusSession(title,minutes=15){
  focusSessionTitle=title||'Attività prioritaria';
  focusSessionSeconds=Math.max(60,Math.round(minutes*60));
  const modal=document.getElementById('focus-session-modal');
  if(focusSessionIntervalId){
    clearInterval(focusSessionIntervalId);
    focusSessionIntervalId=null;
  }
  renderFocusSession();
  if(modal)modal.style.display='flex';
  focusSessionIntervalId=setInterval(()=>{
    focusSessionSeconds=Math.max(0,focusSessionSeconds-1);
    renderFocusSession();
    if(focusSessionSeconds<=0&&focusSessionIntervalId){
      clearInterval(focusSessionIntervalId);
      focusSessionIntervalId=null;
    }
  },1000);
}
function closeFocusSession(){
  const modal=document.getElementById('focus-session-modal');
  if(modal)modal.style.display='none';
}
function resetFocusActionButtons(mode='default'){
  if(focusSessionActionBtn){
    const original=focusSessionActionBtn.dataset.originalLabel||'Inizia ora (15 min)';
    if(mode==='completed'){
      focusSessionActionBtn.textContent='Completato';
      focusSessionActionBtn.disabled=true;
    }else if(mode==='postponed'){
      focusSessionActionBtn.textContent='Rimandato';
      focusSessionActionBtn.disabled=true;
    }else{
      focusSessionActionBtn.textContent=original;
      focusSessionActionBtn.disabled=false;
    }
  }
  if(focusSessionSiblingBtn){
    const originalSibling=focusSessionSiblingBtn.dataset.originalLabel||focusSessionSiblingBtn.textContent;
    if(mode==='postponed'){
      focusSessionSiblingBtn.textContent='Rimandato';
      focusSessionSiblingBtn.disabled=true;
    }else{
      focusSessionSiblingBtn.textContent=originalSibling;
      focusSessionSiblingBtn.disabled=false;
    }
  }
  if(mode!=='default'){
    focusSessionActionBtn=null;
    focusSessionSiblingBtn=null;
  }
}
function cancelFocusSession(resetButtons=true){
  if(focusSessionIntervalId){
    clearInterval(focusSessionIntervalId);
    focusSessionIntervalId=null;
  }
  if(resetButtons)resetFocusActionButtons('default');
  closeFocusSession();
}
function extendFocusSession(extraMinutes=10){
  const extra=Math.max(1,Number(extraMinutes)||10);
  focusSessionSeconds+=Math.round(extra*60);
  if(!focusSessionIntervalId){
    focusSessionIntervalId=setInterval(()=>{
      focusSessionSeconds=Math.max(0,focusSessionSeconds-1);
      renderFocusSession();
      if(focusSessionSeconds<=0&&focusSessionIntervalId){
        clearInterval(focusSessionIntervalId);
        focusSessionIntervalId=null;
      }
    },1000);
  }
  renderFocusSession();
}
function completeFocusSession(){
  resetFocusActionButtons('completed');
  cancelFocusSession(false);
  showPage('task',document.querySelectorAll('.nav-item')[3]);
}
function postponeFocusSession(){
  resetFocusActionButtons('postponed');
  addTaskFromSuggestion(`${focusSessionTitle} (riprogrammare pomeriggio)`);
  cancelFocusSession(false);
}
async function handleSuggestionAction(actionLabel,suggestionTitle,btn){
  const action=(actionLabel||'').trim().toLowerCase();
  if(action.startsWith('inizia ora')){
    if(btn){
      btn.dataset.originalLabel=btn.dataset.originalLabel||btn.textContent;
      const sibling=btn.nextElementSibling;
      if(sibling&&sibling.tagName==='BUTTON'){
        sibling.dataset.originalLabel=sibling.dataset.originalLabel||sibling.textContent;
        sibling.disabled=true;
      }
      focusSessionActionBtn=btn;
      focusSessionSiblingBtn=sibling||null;
    }
    addTaskFromSuggestion(suggestionTitle||'Attività prioritaria',null,suggestionTitle||'Attività prioritaria');
    openFocusSession(suggestionTitle||'Attività prioritaria',15);
    if(btn){btn.textContent='Timer avviato';btn.disabled=true;}
    return;
  }
  if(action.includes('blocca 45 minuti')){
    addTaskFromSuggestion(`${suggestionTitle||'Attività'} (focus 45 min)`,null,suggestionTitle||'Attività');
    openFocusSession(suggestionTitle||'Attività prioritaria',45);
    if(btn){btn.textContent='Focus 45m avviato';btn.disabled=true;}
    return;
  }
  if(action.includes('rimanda')){
    addTaskFromSuggestion(`${suggestionTitle||'Attività'} (da ripianificare)`,null,suggestionTitle||'Attività');
    if(btn){btn.textContent='Rimandato';btn.disabled=true;}
    return;
  }
  if(action.includes('prepara checklist')){
    addTaskFromSuggestion(`Checklist: ${suggestionTitle||'attività'}`,null,suggestionTitle||'attività');
    if(btn){btn.textContent='Checklist creata';btn.disabled=true;}
    return;
  }
  if(action.includes('aggiungi reminder')){
    addTaskFromSuggestion(`Reminder: ${suggestionTitle||'attività'} (entro oggi)`,null,suggestionTitle||'attività');
    if(btn){btn.textContent='Reminder creato';btn.disabled=true;}
    return;
  }
  if(action.includes('rivedi a fine giornata')){
    addTaskFromSuggestion(`Review fine giornata: ${suggestionTitle||'priorità'}`,null,suggestionTitle||'priorità');
    if(btn){btn.textContent='Review pianificata';btn.disabled=true;}
    return;
  }
  if(action.includes('seleziona top 3')){
    addTaskFromSuggestion('Seleziona top 3 obiettivi della giornata');
    if(btn){btn.textContent='Top 3 creati';btn.disabled=true;}
    return;
  }
  if(action.includes('sposta il resto')){
    addTaskFromSuggestion('Sposta attività non prioritarie a domani');
    if(btn){btn.textContent='Attività spostate';btn.disabled=true;}
    return;
  }
  await completeSuggestionTitle(suggestionTitle,btn);
}
function splitLocalItems(raw){
  return String(raw||'').split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean).slice(0,8);
}
function buildLocalDayFallback(input){
  const agendaItems=splitLocalItems(input?.agenda);
  const pendingItems=splitLocalItems(input?.pending);
  const focus=(input?.dayFocus||'').trim();
  const nowMs=Date.now();
  const upcomingCalendarEvents=(Array.isArray(calendarEvents)?calendarEvents:[])
    .map((ev)=>{
      const startsAtMs=ev?.startsAt?new Date(ev.startsAt).getTime():NaN;
      return {ev,startsAtMs};
    })
    .filter(({ev,startsAtMs})=>ev&&Number.isFinite(startsAtMs)&&startsAtMs>=nowMs-15*60*1000)
    .sort((a,b)=>a.startsAtMs-b.startsAtMs)
    .slice(0,2)
    .map(({ev})=>ev);
  const out=[];
  if(pendingItems.length){
    out.push({titolo:`Sblocca subito: ${pendingItems[0]}`,perche:'Chiudere il principale punto aperto riduce il carico mentale e libera attenzione per il resto della giornata.',priorita:'urgente',azioni:['Inizia ora (15 min)','Rimanda al pomeriggio']});
  }
  if(agendaItems.length){
    out.push({titolo:`Prepara il prossimo impegno: ${agendaItems[0]}`,perche:'Una preparazione rapida evita frizioni e rende più efficace il prossimo blocco in agenda.',priorita:'alta',azioni:['Prepara checklist','Aggiungi reminder']});
  }
  if(upcomingCalendarEvents.length){
    const nextEvent=upcomingCalendarEvents[0];
    if(prefs?.celebrations!==false){
      const celebrationEvent=upcomingCalendarEvents.find((ev)=>/\bcompleann|\bbirthday|\bonomastic|\banniversar/i.test(String(ev?.title||'')));
      if(celebrationEvent){
        out.push({titolo:`Celebrazione in agenda: ${celebrationEvent.title||'evento speciale'}`,perche:'Un messaggio di auguri breve ma personale rafforza la relazione e previene dimenticanze importanti nella giornata.',priorita:'alta',azioni:['Invia auguri ora','Aggiungi reminder']});
      }
    }
    out.push({titolo:`Calendario: preparati a ${nextEvent.title||'prossimo evento'}`,perche:'Hai un evento in agenda oggi: anticipare i materiali o il contesto riduce ritardi e stress prima dell\'inizio.',priorita:'alta',azioni:['Prepara checklist','Aggiungi reminder']});
    if(upcomingCalendarEvents.length>1){
      const laterEvent=upcomingCalendarEvents[1];
      out.push({titolo:`Pianifica transizione: ${laterEvent.title||'evento successivo'}`,perche:'Proteggi 10-15 minuti di buffer tra gli impegni per evitare sovrapposizioni e arrivare puntuale.',priorita:'normale',azioni:['Blocca 45 minuti','Rivedi a fine giornata']});
    }
  }
  if(focus){
    out.push({titolo:`Proteggi la priorità del giorno: ${focus}`,perche:'Dedica un blocco concentrato alla priorità principale prima che venga frammentata da urgenze minori.',priorita:'alta',azioni:['Blocca 45 minuti','Rivedi a fine giornata']});
  }
  out.push({titolo:'Definisci 3 obiettivi realistici per oggi',perche:'Un limite chiaro alle priorità aumenta la probabilità di chiudere le attività davvero importanti.',priorita:'normale',azioni:['Seleziona top 3','Sposta il resto']});
  return out.slice(0,5);
}

function ensureCelebrationSuggestion(suggestions){
  const list=Array.isArray(suggestions)?suggestions.slice():[];
  if(prefs?.celebrations===false)return list;
  const hasCelebrationAlready=list.some((s)=>/compleann|birthday|onomastic|anniversar|augur/i.test(String(s?.titolo||'')+' '+String(s?.perche||'')));
  if(hasCelebrationAlready)return list;
  const celebrationEvent=(Array.isArray(calendarEvents)?calendarEvents:[])
    .find((ev)=>/compleann|birthday|onomastic|anniversar/i.test(String(ev?.title||'')));
  if(!celebrationEvent)return list;
  const suggestion={titolo:`Celebrazione in agenda: ${celebrationEvent.title||'evento speciale'}`,perche:'Hai una ricorrenza oggi: inviare un messaggio di auguri adesso evita dimenticanze e rafforza la relazione.',priorita:'alta',azioni:['Invia auguri ora','Aggiungi reminder']};
  return [suggestion,...list].slice(0,5);
}

function normalizeSuggestionSource(source){
  const value=String(source||'').trim();
  if(['ai','local-fallback','cache'].includes(value))return value;
  return 'unknown';
}
function getSuggestionSourceLabel(source,{degraded=false,originalSource='unknown'}={}){
  const normalized=normalizeSuggestionSource(source);
  if(normalized==='ai')return 'Fonte: IA';
  if(normalized==='local-fallback')return 'Fonte: fallback locale (generazione gratuita)';
  if(normalized==='cache'){
    const original=normalizeSuggestionSource(originalSource);
    const originalLabel=original==='ai'?'origine IA':original==='local-fallback'?'origine fallback locale':'origine non disponibile';
    return `Fonte: cache (${originalLabel})`;
  }
  return degraded?'Fonte: fallback locale (generazione gratuita)':'Fonte: non disponibile';
}
function getSuggestionFallbackReasonLabel({degradedReason='',degradedHint=''}={}){
  const reason=String(degradedReason||'').trim();
  const labels={
    AI_DISABLED:'Analisi IA disattivata da configurazione.',
    AI_API_KEY_MISSING:'Provider IA non configurato: manca la chiave API.',
    AI_EMPTY_RESPONSE:'Il provider IA non ha restituito suggerimenti utilizzabili.',
    AI_PROVIDER_TIMEOUT:'Il provider IA non ha risposto entro i tempi previsti.',
    AI_PROVIDER_AUTH_ERROR:'Chiave API Anthropic non valida o non autorizzata: aggiorna ANTHROPIC_API_KEY nell’ambiente di deploy e ridistribuisci.',
    AI_PROVIDER_MODEL_UNAVAILABLE:'Il modello Anthropic configurato non risulta disponibile: verifica ANTHROPIC_MODEL o usa il modello predefinito.',
    AI_PROVIDER_RATE_LIMITED:'Il provider IA ha limitato temporaneamente le richieste: riprova più tardi o verifica quota e billing del provider.',
    AI_PROVIDER_SERVER_ERROR:'Il provider IA è temporaneamente sovraccarico o non disponibile. Filo mostra suggerimenti locali: riprova tra qualche minuto.',
    AI_RESPONSE_PARSE_FAILED:'Il provider IA ha risposto, ma il contenuto non era nel formato JSON atteso.',
    AI_PROVIDER_UNAVAILABLE:'Il provider IA non è raggiungibile o non ha completato la richiesta: controlla rete, configurazione provider e log backend.',
    FRONTEND_LOCAL_FALLBACK:'Il frontend ha generato suggerimenti locali perché il servizio analisi non era disponibile.'
  };
  if(labels[reason])return labels[reason];
  const hint=String(degradedHint||'').trim();
  if(!hint)return '';
  return hint
    .replace(/Anthropic API error \(\d{3}\):.*$/i,'Errore provider IA: controlla configurazione e log backend.')
    .replace(/request_id[\s\S]*$/i,'')
    .trim();
}
function setSuggestionsUpdatedAtLabel(updatedAt,source='unknown',options={}){
  const el=document.getElementById('suggestions-updated-at');
  if(!el)return;
  const dt=updatedAt?new Date(updatedAt):new Date();
  if(Number.isNaN(dt.getTime())){
    el.style.display='none';
    el.textContent='';
    return;
  }
  const hhmm=dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  const normalized=normalizeSuggestionSource(source);
  const originalSource=normalizeSuggestionSource(options?.originalSource);
  const fallbackOrigin=Boolean(options?.degraded)||normalized==='local-fallback'||(normalized==='cache'&&originalSource==='local-fallback');
  const sourceLabel=getSuggestionSourceLabel(normalized,{degraded:fallbackOrigin,originalSource});
  const explicitReason=fallbackOrigin?getSuggestionFallbackReasonLabel({degradedReason:options?.degradedReason,degradedHint:options?.degradedHint}):'';
  const reasonLabel=explicitReason||((normalized==='cache'&&originalSource==='local-fallback')?'Motivo non disponibile: suggerimento fallback salvato prima della tracciatura del motivo. Dalla prossima analisi verrà mostrata la causa precisa.':'');
  const reasonSuffix=reasonLabel?` · Motivo: ${reasonLabel}`:'';
  const cacheSuffix=normalized==='cache'?' · Ripristinato da cache':'';
  el.textContent=`Suggerimenti aggiornati alle ${hhmm} · ${sourceLabel}${reasonSuffix}${cacheSuffix}`;
  el.style.display='';
  el.style.color=fallbackOrigin?'#8A5C00':'#0E6B4A';
}
function renderDaySuggestions(suggestions,options={}){
  const source=normalizeSuggestionSource(options?.source);
  const degraded=Boolean(options?.degraded)||source==='local-fallback';
  const degradedReason=options?.degradedReason||'';
  const degradedHint=options?.degradedHint||'';
  const enrichedSuggestions=ensureCelebrationSuggestion(suggestions).filter(s=>!isSuggestionCompletedOrDismissed(s?.titolo));
  const container=document.getElementById('suggestions-container');
  if(!container)return;
  if(!Array.isArray(enrichedSuggestions)||!enrichedSuggestions.length){
    container.innerHTML='<div class="empty-state"><div class="empty-title">Nessun suggerimento</div></div>';
    const nb=document.getElementById('nb-sugg');
    if(nb){nb.textContent='0';nb.style.display='';}
    const updatedEl=document.getElementById('suggestions-updated-at');
    if(updatedEl){updatedEl.style.display='none';updatedEl.textContent='';}
    return;
  }
  const nb=document.getElementById('nb-sugg');
  nb.textContent=enrichedSuggestions.length;
  nb.style.display='';
  currentDaySuggestionsForShare=enrichedSuggestions;
  const PBADGE={urgente:'b-urgente',alta:'b-alta',normale:'b-normale',bassa:'b-bassa'};
  const PLBL={urgente:'Urgente',alta:'Alta priorità',normale:'Normale',bassa:'Bassa'};
  const sharePanel='<div class="share-plan-card"><div><div class="share-plan-title">Condividi il piano della giornata</div><div class="share-plan-copy">Copia il piano generato da Filo per inviarlo a un collega, al tuo team o tenerlo nei tuoi appunti.</div></div><button class="btn-ghost share-plan-btn" type="button" onclick="copyDayPlan(this)">Copia piano</button></div>';
  container.innerHTML=sharePanel+enrichedSuggestions.map((s,i)=>{
    const title=String(s.titolo||'Azione');
    const titleForHandler=title.replace(/'/g,"\\'");
    const added=isSuggestionAdded(title);
    return `<div class="sugg-card ${s.priorita||'normale'}" style="animation-delay:${i*0.1}s"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;"><div class="sugg-title">${escapeHtml(title)}</div><span class="badge ${PBADGE[s.priorita]||'b-normale'}">${PLBL[s.priorita]||s.priorita}</span></div><div class="sugg-why">${escapeHtml(s.perche||'')}</div><div class="sugg-actions">${(Array.isArray(s.azioni)?s.azioni:[]).map((a,j)=>`<button onclick="handleSuggestionAction('${String(a||'').replace(/'/g,"\\'")}','${titleForHandler}',this)" style="font-family:inherit;font-size:12px;padding:5px 12px;border-radius:8px;border:${j===0?'none':'1px solid rgba(0,0,0,0.12)'};background:${j===0?'var(--color-primary)':'transparent'};color:${j===0?'#fff':'var(--color-muted-strong)'};cursor:pointer;">${escapeHtml(a)}</button>`).join('')}<button data-suggestion-task-title="${escapeHtml(title)}" aria-pressed="${added?'true':'false'}" onclick="addTaskFromSuggestion('${titleForHandler}',this)" style="margin-left:auto;font-family:inherit;font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.1);background:transparent;color:${added?'#0E6B4A':'#6F6A61'};cursor:pointer;">${added?'✓ Aggiunto':'+ Aggiungi ai task'}</button></div></div>`;
  }).join('');
  addSuggestionCompletionButtons(container);
  const shouldPersist=options?.persist!==false;
  if(shouldPersist)saveSuggestionsToCache(suggestions,{source,degraded,degradedReason,degradedHint});
  setSuggestionsUpdatedAtLabel(options?.updatedAt||(shouldPersist?new Date().toISOString():null),source,{degraded,originalSource:options?.originalSource,degradedReason,degradedHint});
}
function updateAnalyzeQuotaHint(limit){
  const hint=document.getElementById('analyze-quota-hint');
  if(!hint)return;
  if(Number.isFinite(limit)&&limit>=5){
    hint.textContent='Ottimo: hai dato abbastanza contesto per ricevere analisi più articolate.';
    hint.style.color='#0E6B4A';
    return;
  }
  hint.textContent='Aggiungi dettagli in agenda e sospesi: Filo potrà darti riscontri più articolati e fino a 5 analisi oggi.';
  hint.style.color='#6F6A61';
}
function updateAnalyzeQuotaLabel(limit,remaining){
  const el=document.getElementById('analyze-quota');
  updateAnalyzeQuotaHint(limit);
  if(!el)return;
  if(Number.isFinite(limit)&&Number.isFinite(remaining)){
    el.textContent=`Analisi rimanenti oggi: ${remaining}/${limit}`;
    el.style.color=remaining<=1?'#8A5C00':'var(--color-muted)';
    return;
  }
  el.textContent='Analisi rimanenti oggi: --';
  el.style.color='var(--color-muted)';
}
function setAnalyzeRequestDebug(message){
  if(!message)return;
  console.debug('[DayAnalysis]',message);
}
function setAnalyzeFallbackStatus(isActive,message){
  const errBox=document.getElementById('ai-error');
  if(!errBox)return;
  errBox.dataset.analyzeFallback=isActive?'1':'0';
  if(!isActive){
    if(errBox.dataset.cooldownMessage==='1')return;
    if((errBox.textContent||'').includes('suggerimenti locali.')){
      errBox.textContent='';
      errBox.classList.remove('active');
    }
    return;
  }
  if(message){
    errBox.textContent=message;
    errBox.classList.add('active');
  }
}
function consumeAnalyzeQuotaEstimate(){
  const quotaEl=document.getElementById('analyze-quota');
  const fallback={limit:5,remaining:4};
  if(!quotaEl)return fallback;
  const text=(quotaEl.textContent||'').trim();
  const match=text.match(/(\d+)\s*\/\s*(\d+)/);
  if(!match)return fallback;
  const remaining=Math.max(0,Number(match[1])-1);
  const limit=Number(match[2])||fallback.limit;
  return {limit,remaining};
}
function shouldUseLocalAnalyzeFallbackFromStatus(status){
  return status===404 || status===502 || status===503 || status===504;
}
function shouldUseLocalAnalyzeFallbackFromErrorMessage(message){
  const msg=String(message||'');
  return (
    msg.includes('/api/v1/assistant/day-analysis') ||
    msg.includes('HTTP 404') ||
    msg.includes('HTTP 502') ||
    msg.includes('HTTP 503') ||
    msg.includes('HTTP 504')
  );
}
function applyLocalAnalyzeFallbackState(input,requestId,message,options={}){
  const errBox=document.getElementById('ai-error');
  if(!errBox)return;
  errBox.textContent=message||'Analisi AI temporaneamente non disponibile. Ti mostro suggerimenti locali.';
  errBox.classList.add('active');
  const fallbackSuggestions=ensureCelebrationSuggestion(buildLocalDayFallback(input));
  const estimated=consumeAnalyzeQuotaEstimate();
  updateAnalyzeQuotaLabel(estimated.limit,estimated.remaining);
  setAnalyzeFallbackStatus(true,errBox.textContent);
  setAnalyzeRequestDebug(`Errore risposta (#${requestId})`);
  renderDaySuggestions(fallbackSuggestions,{source:'local-fallback',degraded:true,degradedReason:'FRONTEND_LOCAL_FALLBACK',degradedHint:errBox.textContent});
}
function markAnalyzeRemoteUnavailable(status){
  const multiplier=status===404?12:1;
  analyzeRemoteBackoffUntilMs=Date.now()+(ANALYZE_REMOTE_BACKOFF_MS*multiplier);
}
function isAnalyzeRemoteInBackoff(){
  return analyzeRemoteBackoffUntilMs>Date.now();
}
function setAnalyzeButtonAvailability(remaining){
  const btn=document.getElementById('analyze-btn');
  if(!btn)return;
  if(analyzeCooldownTimeoutId)return;
  const canAnalyze=Number.isFinite(remaining)?remaining>0:true;
  btn.disabled=!canAnalyze;
}
function applyAnalyzeQuotaState(quota){
  if(!quota)return;
  const limit=Number(quota.limit);
  const remaining=Number(quota.remaining);
  if(Number.isFinite(limit)&&Number.isFinite(remaining)){
    updateAnalyzeQuotaLabel(limit,remaining);
    setAnalyzeButtonAvailability(remaining);
  }
}
async function refreshAnalyzeQuota(){
  try{
    const agenda=(document.getElementById('agenda-input')?.value||'').trim();
    const pending=(document.getElementById('pending-input')?.value||'').trim();
    const res=await fetchApi('/api/v1/assistant/day-analysis/quota',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        userId:currentUser?.id||null,
        agenda,
        pending
      })
    });
    const payload=await res.json().catch(()=>null);
    if(!res.ok){
      setAnalyzeRequestDebug(`Quota sync fallita (${res.status})`);
      setAnalyzeButtonAvailability(Number.NaN);
      return;
    }
    const quota=payload?.data?.quota||payload?.quota||null;
    if(quota){
      applyAnalyzeQuotaState(quota);
      return;
    }
    setAnalyzeRequestDebug('Quota sync risposta senza quota');
    setAnalyzeButtonAvailability(Number.NaN);
  }catch(err){
    setAnalyzeRequestDebug(`Quota sync errore: ${err?.message||err}`);
    setAnalyzeButtonAvailability(Number.NaN);
  }
}
function scheduleAnalyzeQuotaRefresh(){
  setAnalyzeButtonAvailability(Number.NaN);
  if(analyzeQuotaRefreshTimeoutId){
    clearTimeout(analyzeQuotaRefreshTimeoutId);
    analyzeQuotaRefreshTimeoutId=null;
  }
  analyzeQuotaRefreshTimeoutId=setTimeout(()=>{
    analyzeQuotaRefreshTimeoutId=null;
    refreshAnalyzeQuota();
  },250);
}
function bindAnalyzeQuotaWatchers(){
  if(analyzeQuotaWatchersBound)return;
  const agendaEl=document.getElementById('agenda-input');
  const pendingEl=document.getElementById('pending-input');
  if(agendaEl)agendaEl.addEventListener('input',scheduleAnalyzeQuotaRefresh);
  if(pendingEl)pendingEl.addEventListener('input',scheduleAnalyzeQuotaRefresh);
  analyzeQuotaWatchersBound=true;
}
function startAnalyzeCooldown(seconds){
  const btn=document.getElementById('analyze-btn');
  const errBox=document.getElementById('ai-error');
  if(!btn)return;
  if(analyzeCooldownTimeoutId){
    clearInterval(analyzeCooldownTimeoutId);
    analyzeCooldownTimeoutId=null;
  }
  let left=Math.max(1,Math.ceil(Number(seconds)||0));
  analyzeCooldownUntilMs=Date.now()+(left*1000);
  const originalHtml=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1l1.1 2.2 2.4.35-1.75 1.7.42 2.4L6.5 6.6 4.33 7.65l.42-2.4L3 3.55l2.4-.35z" fill="white"/></svg>Analizza la mia giornata`;

  const renderCooldownMessage=()=>{
    if(!errBox)return;
    errBox.textContent=`Attendi ${left}s prima di una nuova richiesta.`;
    errBox.classList.add('active');
    errBox.dataset.cooldownMessage='1';
  };

  btn.disabled=true;
  btn.innerHTML=`Attendi ${left}s`;
  renderCooldownMessage();

  analyzeCooldownTimeoutId=setInterval(()=>{
    left-=1;
    if(left<=0){
      clearInterval(analyzeCooldownTimeoutId);
      analyzeCooldownTimeoutId=null;
      analyzeCooldownUntilMs=0;
      btn.innerHTML=originalHtml;
      if(errBox?.dataset?.cooldownMessage==='1'){
        errBox.textContent='';
        errBox.classList.remove('active');
        delete errBox.dataset.cooldownMessage;
      }
      refreshAnalyzeQuota();
      return;
    }
    btn.innerHTML=`Attendi ${left}s`;
    renderCooldownMessage();
  },1000);
}

async function analyzeDay(){
  if(analyzeRequestInFlight)return;
  const agenda=document.getElementById('agenda-input').value.trim();
  const pending=document.getElementById('pending-input').value.trim();
  const dayEnd=document.getElementById('day-end-input')?.value||'';
  const availability=document.getElementById('day-availability-input')?.value||'';
  const dayFocus=document.getElementById('day-focus-input')?.value.trim()||'';
  const inboxContext=buildAnalyzeInboxContext();
  const userTimeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  const localNow=new Date();
  const calendarFrom=new Date(localNow.getFullYear(),localNow.getMonth(),localNow.getDate()).toISOString();
  const calendarTo=new Date(new Date(calendarFrom).getTime()+24*60*60*1000).toISOString();
  if(!agenda&&!pending)return;
  const now=Date.now();
  if(analyzeCooldownUntilMs>now){
    const left=Math.ceil((analyzeCooldownUntilMs-now)/1000);
    startAnalyzeCooldown(left);
    return;
  }
  if(analyzeRequestInFlight){
    setAnalyzeRequestDebug('Richiesta già in corso (#in-flight)');
    return;
  }
  analyzeRequestInFlight=true;
  const btn=document.getElementById('analyze-btn');
  const loader=document.getElementById('ai-loader');
  const errBox=document.getElementById('ai-error');
  const container=document.getElementById('suggestions-container');
  analyzeRequestInFlight=true;
  btn.disabled=true;
  loader.classList.add('active');
  errBox.classList.remove('active');
  delete errBox.dataset.cooldownMessage;
  container.innerHTML='';
  setAnalyzeFallbackStatus(false);
  const requestId=++analyzeRequestSeq;
  analyzeCooldownUntilMs=Date.now()+ANALYZE_MIN_INTERVAL_MS;
  setAnalyzeRequestDebug(`Richiesta partita (#${requestId})`);
  startAnalyzeCooldown(Math.ceil(ANALYZE_MIN_INTERVAL_MS/1000));
  if(isAnalyzeRemoteInBackoff()){
    loader.classList.remove('active');
    setAnalyzeButtonAvailability(Number.NaN);
    applyLocalAnalyzeFallbackState(
      {agenda,pending,dayFocus},
      requestId,
      'Servizio analisi temporaneamente non disponibile: uso suggerimenti locali.'
    );
    analyzeRequestInFlight=false;
    return;
  }
  try{
    const res=await fetchApi('/api/v1/assistant/day-analysis',{
      singleAttempt:true,
      disableAuthRetry:true,
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        userId:currentUser?.id||null,
        agenda,pending,dayEnd,availability,dayFocus,
        memoryContext:getMemoryContext(),sleep:todaySleep,energy:todayEnergy,stress:todayStress,
        inboxContext,userTimeZone,calendarFrom,calendarTo,
        includeCelebrationSuggestions:prefs.celebrations!==false
      })
    });
    const payload=await res.json().catch(()=>null);
    const aiAttemptCounter=Number(payload?.data?.diagnostics?.aiAttemptCounter);
    const responseDebugSuffix=Number.isFinite(aiAttemptCounter)?` · AI=${aiAttemptCounter}`:'';
    if(!res.ok){
      if(shouldUseLocalAnalyzeFallbackFromStatus(res.status)){
        markAnalyzeRemoteUnavailable(res.status);
        loader.classList.remove('active');
        setAnalyzeButtonAvailability(Number.NaN);
        applyLocalAnalyzeFallbackState(
          {agenda,pending,dayFocus},
          requestId,
          res.status===404
            ? 'Endpoint analisi non disponibile: uso suggerimenti locali.'
            : 'Servizio analisi temporaneamente non disponibile: uso suggerimenti locali.'
        );
        setAnalyzeRequestDebug(`Risposta fallback (#${requestId})${responseDebugSuffix}`);
        analyzeRequestInFlight=false;
        return;
      }
      if(res.status===429&&payload){
        const message=payload?.message||'Limite analisi raggiunto.';
        errBox.textContent=message;
        errBox.classList.add('active');
        updateAnalyzeQuotaLabel(Number(payload?.limit),Number(payload?.remaining));
        setAnalyzeButtonAvailability(Number(payload?.remaining));
        const cachedSuggestions=loadSuggestionsFromCache();
        if(cachedSuggestions?.suggestions?.length){
          renderDaySuggestions(cachedSuggestions.suggestions,{
            persist:false,
            updatedAt:cachedSuggestions.savedAt,
            source:'cache',
            originalSource:cachedSuggestions.source,
            degraded:cachedSuggestions.degraded,
            degradedReason:cachedSuggestions.degradedReason,
            degradedHint:cachedSuggestions.degradedHint
          });
        }else{
          const fallbackSuggestions=buildLocalDayFallback({agenda,pending,dayFocus});
          renderDaySuggestions(fallbackSuggestions,{persist:false,source:'local-fallback',degraded:true,degradedReason:'FRONTEND_LOCAL_FALLBACK',degradedHint:'Limite analisi raggiunto: mostro suggerimenti locali gratuiti.'});
        }
        if(Number(payload?.retryAfterSeconds)>0)startAnalyzeCooldown(payload.retryAfterSeconds);
        loader.classList.remove('active');
        if(!analyzeCooldownTimeoutId)setAnalyzeButtonAvailability(Number(payload?.remaining));
        analyzeRequestInFlight=false;
        return;
      }
      const fallbackMsg=payload?.message||`POST /assistant/day-analysis fallita (${res.status})`;
      throw new Error(fallbackMsg);
    }
    const suggestions=Array.isArray(payload?.data?.suggerimenti)?payload.data.suggerimenti:[];
    const quota=payload?.data?.quota||null;
    if(quota)applyAnalyzeQuotaState(quota);
    loader.classList.remove('active');
    if(!quota)setAnalyzeButtonAvailability(Number.NaN);
    const responseSource=normalizeSuggestionSource(payload?.data?.source);
    const responseDegraded=Boolean(payload?.data?.degraded)||responseSource==='local-fallback';
    if(responseDegraded){
      const reasonLabel=getSuggestionFallbackReasonLabel({degradedReason:payload?.data?.degradedReason,degradedHint:payload?.data?.degradedHint});
      setAnalyzeFallbackStatus(true,`Suggerimenti generati dal fallback locale gratuito: non sono una risposta dell'IA.${reasonLabel?` Motivo: ${reasonLabel}`:''}`);
    }
    renderDaySuggestions(ensureCelebrationSuggestion(suggestions),{source:responseSource,degraded:responseDegraded,degradedReason:payload?.data?.degradedReason,degradedHint:payload?.data?.degradedHint});
    analyzeRequestInFlight=false;
  }catch(e){
    loader.classList.remove('active');
    setAnalyzeButtonAvailability(Number.NaN);
    const msg=String(e?.message||'');
    if(shouldUseLocalAnalyzeFallbackFromErrorMessage(msg)){
      const fallbackReason=msg || 'motivo non specificato';
      console.info(`Analisi AI non disponibile, uso fallback locale. Motivo: ${fallbackReason}`);
      const statusMatch=msg.match(/HTTP\s+(404|502|503|504)/);
      markAnalyzeRemoteUnavailable(statusMatch?Number(statusMatch[1]):503);
      applyLocalAnalyzeFallbackState(
        {agenda,pending,dayFocus},
        requestId,
        'Servizio analisi temporaneamente non disponibile: uso suggerimenti locali.'
      );
      analyzeRequestInFlight=false;
      return;
    }
    console.warn('Errore analisi giornata:',e);
    errBox.textContent='Errore nell\'analisi. Riprova.';
    errBox.classList.add('active');
    analyzeRequestInFlight=false;
  }
}
function buildAnalyzeInboxContext(){
  if(!mailboxConnected||!Array.isArray(INBOX)||!INBOX.length)return '';
  const topMessages=INBOX.slice(0,8).map((item,idx)=>{
    const status=item?.unread?'non letta':'letta';
    const from=String(item?.from||'').trim();
    const subject=String(item?.subj||'').trim();
    const preview=String(item?.prev||'').trim();
    if(!from&&!subject&&!preview)return null;
    return `${idx+1}) [${status}] da ${from||'mittente sconosciuto'} — oggetto: ${subject||'(senza oggetto)'}${preview?` — anteprima: ${preview}`:''}`;
  }).filter(Boolean);
  return topMessages.join('\n');
}

// â”€â”€ START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Quick Check: diagnosi stabile a regole, senza consumare quota AI.
function getQuickCheckCacheKey(){return currentUser?.id?`${QUICKCHECK_CACHE_PREFIX}${currentUser.id}`:`${QUICKCHECK_CACHE_PREFIX}guest`;}
function saveQuickCheckCache(payload){try{localStorage.setItem(getQuickCheckCacheKey(),JSON.stringify(payload));}catch(e){}}
function loadQuickCheckCache(){try{return JSON.parse(localStorage.getItem(getQuickCheckCacheKey())||'null');}catch(e){return null;}}
function getQuickCheckValue(id){return document.getElementById(id)?.value||'';}
function setQuickCheckValue(id,value){const el=document.getElementById(id);if(el)el.value=value;}
function collectQuickCheckInput(){return {process:getQuickCheckValue('qc-process'),tools:getQuickCheckValue('qc-tools'),visibility:getQuickCheckValue('qc-visibility'),updates:getQuickCheckValue('qc-updates'),ownership:getQuickCheckValue('qc-ownership'),followup:getQuickCheckValue('qc-followup'),notes:getQuickCheckValue('qc-notes').trim()};}
function getQuickCheckLevel(score){
  if(score<=25)return {label:'Dispersione bassa',tone:'Il flusso sembra già leggibile: il valore di Filo è renderlo più replicabile.'};
  if(score<=50)return {label:'Dispersione media',tone:'Il flusso funziona, ma dipende ancora da passaggi manuali e memoria individuale.'};
  if(score<=74)return {label:'Dispersione alta',tone:'Il processo regge, ma costa più energia del necessario: informazioni e responsabilità sono distribuite.'};
  return {label:'Dispersione critica',tone:'Il rischio principale non è solo perdere tempo, ma perdere contesto e controllo operativo.'};
}
function getQuickCheckTemplate(input,dominantKey){
  const process=input.process||'giornata personale';
  if(process.includes('clienti')||process.includes('richieste'))return {name:'Gestione richieste operative',sub:'Una vista unica per richiesta, owner, stato, priorità e prossima risposta.'};
  if(process.includes('commerciale'))return {name:'Follow-up commerciale',sub:'Pipeline leggera per non perdere contatti, scadenze e prossime mosse.'};
  if(process.includes('onboarding'))return {name:'Onboarding cliente',sub:'Checklist condivisa per passaggi, responsabilità e documenti mancanti.'};
  if(process.includes('progetto'))return {name:'Hub progetto',sub:'Stato, blocchi, decisioni e prossime azioni in un punto solo.'};
  if(dominantKey==='ownership')return {name:'Responsabilità e passaggi',sub:'Una mappa semplice di chi fa cosa, entro quando e con quale output.'};
  if(dominantKey==='manual')return {name:'Rituale operativo settimanale',sub:'Routine minima per aggiornare stato, priorità e follow-up senza rincorrere tutto.'};
  return {name:'Hub operativo personale',sub:'Una vista leggera per centralizzare agenda, sospesi, priorità e follow-up.'};
}
function buildQuickCheckProblems(input){
  const problems=[];
  const tools=Number(input.tools)||1;
  if(tools>=2&&input.visibility!=='dashboard')problems.push({key:'scattered',weight:tools===3?30:22,title:'Informazioni disperse',why:'Il flusso attraversa più strumenti, ma non ha ancora una vista unica abbastanza affidabile.'});
  if(input.visibility==='chat'||input.visibility==='unclear')problems.push({key:'visibility',weight:input.visibility==='unclear'?28:22,title:'Stato poco visibile',why:'Per capire a che punto sei devi ricostruire il contesto da chat, email o memoria personale.'});
  if(input.updates==='giornaliero'||input.updates==='irregolare'||input.followup==='alto')problems.push({key:'manual',weight:input.followup==='alto'?26:20,title:'Manutenzione manuale e follow-up',why:"Una parte rilevante dell'energia va nel chiedere aggiornamenti o riallineare informazioni già note."});
  if(input.ownership==='parziale'||input.ownership==='assente')problems.push({key:'ownership',weight:input.ownership==='assente'?27:19,title:'Responsabilità poco chiare',why:"Quando l'owner non è evidente, il lavoro resta aperto più a lungo e aumenta il rischio di rimbalzi."});
  const notes=(input.notes||'').toLowerCase();
  if(notes.includes('priorit')||notes.includes('urgente')||notes.includes('tutto importante'))problems.push({key:'priority',weight:18,title:'Priorità non governate',why:'Le urgenze sembrano competere tra loro: serve un criterio visibile per decidere cosa viene prima.'});
  if(!problems.length)problems.push({key:'clarity',weight:8,title:'Flusso abbastanza ordinato',why:'Non emergono blocchi forti: il passo utile è rendere il metodo più esplicito e riusabile.'});
  return problems.sort((a,b)=>b.weight-a.weight).slice(0,3);
}
function buildQuickCheckActions(problemKey,input){
  const actionsByProblem={
    scattered:['Crea una vista unica con richiesta, stato, owner e prossima azione.','Sposta nel flusso solo i dati che servono a decidere cosa fare dopo.','Definisci un punto di raccolta unico per nuovi input e aggiornamenti.'],
    visibility:['Scegli una sola vista come fonte di verità dello stato.','Aggiungi tre stati semplici: da chiarire, in corso, bloccato.','Rivedi la vista ogni giorno per due minuti, non quando il caos esplode.'],
    manual:['Trasforma il follow-up ricorrente in un task o promemoria fisso.','Prepara un riepilogo settimanale con aperti, blocchi e decisioni attese.','Automatizza solo dopo aver standardizzato cosa deve essere aggiornato.'],
    ownership:['Assegna sempre un owner e una prossima azione a ogni elemento aperto.','Separa chi decide da chi esegue quando il passaggio non è evidente.','Crea un controllo rapido sugli elementi senza owner.'],
    priority:['Definisci una regola di priorità basata su impatto, scadenza e blocchi generati.','Limita le priorità alte a massimo tre elementi visibili.','Rivedi cosa può aspettare prima di aggiungere nuovo lavoro.'],
    clarity:['Trasforma il flusso attuale in un template leggero.','Misura quali passaggi tornano ogni settimana.','Usa Filo per rendere replicabile il modo in cui già lavori.']
  };
  if((input.process||'').includes('giornata'))return ['Porta agenda e sospesi nella stessa vista prima di iniziare.','Scegli una priorità del giorno e proteggi un blocco di focus.','Trasforma le interruzioni ricorrenti in task visibili.'];
  return actionsByProblem[problemKey]||actionsByProblem.clarity;
}
function analyzeQuickCheck(input){
  const scoreMap={tools:{'1':0,'2':13,'3':22},visibility:{dashboard:0,sheet:10,chat:20,unclear:24},updates:{automatico:0,settimanale:8,giornaliero:15,irregolare:20},ownership:{chiaro:0,parziale:12,assente:18},followup:{basso:0,medio:12,alto:18}};
  let score=0;
  score+=scoreMap.tools[input.tools]||0;score+=scoreMap.visibility[input.visibility]||0;score+=scoreMap.updates[input.updates]||0;score+=scoreMap.ownership[input.ownership]||0;score+=scoreMap.followup[input.followup]||0;
  if((input.notes||'').length>120)score+=4;
  score=Math.min(100,score);
  const problems=buildQuickCheckProblems(input);
  const dominant=problems[0];
  return {score,level:getQuickCheckLevel(score),dominant,problems,actions:buildQuickCheckActions(dominant.key,input),template:getQuickCheckTemplate(input,dominant.key),createdAt:new Date().toISOString()};
}
function renderQuickCheckPage(){
  const resultEl=document.getElementById('quickcheck-result');
  if(!resultEl)return;
  const cached=loadQuickCheckCache();
  if(cached?.input)Object.entries(cached.input).forEach(([key,value])=>setQuickCheckValue(`qc-${key}`,value));
  if(cached?.input){
    const result=analyzeQuickCheck(cached.input);
    saveQuickCheckCache({input:cached.input,result});
    renderQuickCheckResult(result);
  }
  else if(cached?.result)renderQuickCheckResult(cached.result);
  else renderQuickCheckEmpty();
}
function renderQuickCheckEmpty(){
  const resultEl=document.getElementById('quickcheck-result');
  if(resultEl)resultEl.innerHTML='<div class="quickcheck-empty"><div class="quickcheck-empty-title">La diagnosi apparira qui</div><div class="quickcheck-copy">Compila il check: Filo ti restituisce punteggio, problema dominante, azioni e template consigliato.</div></div>';
}
function renderQuickCheckResult(result){
  const resultEl=document.getElementById('quickcheck-result');
  if(!resultEl)return;
  const meter=Math.max(4,Math.min(100,result.score||0));
  resultEl.innerHTML=`
    <div class="quickcheck-report">
      <div class="quickcheck-report-head"><div class="quickcheck-report-top"><div><div class="quickcheck-level">${escapeHtml(result.level.label)}</div><div class="quickcheck-level-sub">${escapeHtml(result.level.tone)}</div></div><div class="quickcheck-score">${result.score}<span>/100</span></div></div><div class="quickcheck-meter"><div class="quickcheck-meter-fill" style="width:${meter}%"></div></div></div>
      <div class="quickcheck-block"><div class="quickcheck-block-title">Problema dominante</div><div class="quickcheck-dominant">${escapeHtml(result.dominant.title)}</div><div class="quickcheck-copy">${escapeHtml(result.dominant.why)}</div></div>
      <div class="quickcheck-block"><div class="quickcheck-block-title">Segnali rilevati</div><div class="quickcheck-list">${result.problems.map((p,idx)=>`<div class="quickcheck-list-item"><span class="quickcheck-list-index">${idx+1}</span><span><strong>${escapeHtml(p.title)}</strong><br>${escapeHtml(p.why)}</span></div>`).join('')}</div></div>
      <div class="quickcheck-block"><div class="quickcheck-block-title">Azioni consigliate</div><div class="quickcheck-list">${result.actions.map((a,idx)=>`<div class="quickcheck-list-item"><span class="quickcheck-list-index">${idx+1}</span><span>${escapeHtml(a)}</span></div>`).join('')}</div></div>
      <div class="quickcheck-block"><div class="quickcheck-block-title">Template Filo consigliato</div><div class="quickcheck-template"><div><div class="quickcheck-template-name">${escapeHtml(result.template.name)}</div><div class="quickcheck-template-sub">${escapeHtml(result.template.sub)}</div></div><button class="btn-ghost" onclick="copyQuickCheckSummary()">Copia sintesi</button></div></div>
      <div class="quickcheck-actions"><button class="btn-primary" onclick="createQuickCheckTasks()">Crea 3 task</button><button class="btn-ghost" onclick="openQuickCheckTasksPage()">Apri Task</button></div>
      <div class="quickcheck-action-feedback" id="quickcheck-feedback"></div>
    </div>`;
}
function runQuickCheck(){const input=collectQuickCheckInput();const result=analyzeQuickCheck(input);saveQuickCheckCache({input,result});renderQuickCheckResult(result);}
function fillQuickCheckExample(){setQuickCheckValue('qc-process','richieste clienti');setQuickCheckValue('qc-tools','3');setQuickCheckValue('qc-visibility','chat');setQuickCheckValue('qc-updates','giornaliero');setQuickCheckValue('qc-ownership','parziale');setQuickCheckValue('qc-followup','alto');setQuickCheckValue('qc-notes','Le richieste arrivano in email, alcune finiscono in chat e spesso devo chiedere a che punto siamo o chi deve rispondere al cliente.');}
function resetQuickCheck(){['qc-process','qc-tools','qc-visibility','qc-updates','qc-ownership','qc-followup','qc-notes'].forEach((id)=>{const el=document.getElementById(id);if(!el)return;if(id==='qc-notes')el.value='';else el.selectedIndex=0;});try{localStorage.removeItem(getQuickCheckCacheKey());}catch(e){}renderQuickCheckEmpty();}
function getCurrentQuickCheckResult(){const cached=loadQuickCheckCache();return cached?.input?analyzeQuickCheck(cached.input):(cached?.result||analyzeQuickCheck(collectQuickCheckInput()));}
function createQuickCheckTasks(){
  const result=getCurrentQuickCheckResult();
  const created=result.actions.slice(0,3).map((action,idx)=>({id:nextTaskId++,label:action,done:false,status:'todo',priorita:idx===0?'alta':'normale',scadenza:idx===0?'Oggi':'Questa settimana',dueDateIso:null,reminderAt:null,recurrence:'none',energyCost:3,stressImpact:idx===0?2:3}));
  tasks.unshift(...created);saveTasksToCache();renderTasks();updateBadges();
  const feedback=document.getElementById('quickcheck-feedback');if(feedback){feedback.textContent='Task creati: li trovi nella sezione Task.';feedback.classList.add('active');}
}
function openQuickCheckTasksPage(){const item=Array.from(document.querySelectorAll('.nav-item')).find((el)=>String(el.getAttribute('onclick')||'').includes("showPage('task'"));showPage('task',item||null);}
function buildQuickCheckSummary(result){return [`Filo Quick Check - ${result.level.label} (${result.score}/100)`,`Problema dominante: ${result.dominant.title}`,`Template consigliato: ${result.template.name}`,'Azioni:',...result.actions.map((a,idx)=>`${idx+1}. ${a}`)].join('\n');}
function copyQuickCheckSummary(){
  const result=getCurrentQuickCheckResult();
  const text=buildQuickCheckSummary(result);
  navigator.clipboard?.writeText(text).then(()=>{const feedback=document.getElementById('quickcheck-feedback');if(feedback){feedback.textContent='Sintesi copiata negli appunti.';feedback.classList.add('active');}}).catch(()=>{const feedback=document.getElementById('quickcheck-feedback');if(feedback){feedback.textContent=text;feedback.classList.add('active');}});
}

async function init() {
  loadPrefs();
  renderPrefs();
  const bm=document.getElementById('build-marker');
  if(bm)bm.textContent=`Build: ${APP_BUILD_ID} · ${APP_BUILD_DATE}`;
  initDayDraftAutosave();
  document.getElementById('login-password').value = '';
  clearCorruptedPasswordAutofill();
  let isAuthBootstrapping = true;
  const pwd = document.getElementById('login-password');
  if (pwd) {
    pwd.addEventListener('focus', clearCorruptedPasswordAutofill);
    setTimeout(clearCorruptedPasswordAutofill, 250);
    setTimeout(clearCorruptedPasswordAutofill, 1000);
  }
  window.addEventListener('pageshow',handleCalendarOAuthPageShow);

  await tryExchangeGoogleLoginCode();
  await tryExchangeSupabaseCodeSession();
  await trySetSupabaseSessionFromHash();
  handleSupabaseAuthErrorInQuery();

  // Ascolta eventi auth
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&currentUser?.id){
      refreshAnalyzeQuota();
      checkDueTaskReminders();
    }
  });
  setInterval(checkDueTaskReminders,60000);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, session ? 'session ok' : 'no session');
    if (event === 'SIGNED_IN' && session) {
      window.history.replaceState({}, document.title, window.location.pathname);
      loginSuccess(session.user);
      isAuthBootstrapping = false;
    }
    if (event === 'SIGNED_OUT') {
      isAuthBootstrapping = false;
      showLoginScreen();
    }
    if (event === 'INITIAL_SESSION') {
      if (session) loginSuccess(session.user);
      else if (!isAuthBootstrapping) showLoginScreen();
    }
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  console.log('Existing session:', session ? 'yes' : 'no');
  if (session) {
    loginSuccess(session.user);
  } else {
    clearCalendarOAuthFlowState();
    showLoginScreen();
  }
  isAuthBootstrapping = false;
}

init().catch((err) => {
  console.error('Init fallita:', err);
  const shell = document.getElementById('app-shell');
  if (shell) shell.classList.remove('active');
  const login = document.getElementById('login-screen');
  if (login) login.style.display = 'flex';
  const errorBox = document.getElementById('login-error');
  if (errorBox) {
    errorBox.textContent = 'Errore inizializzazione app. Ricarica la pagina.';
    errorBox.classList.add('active');
  }
});
