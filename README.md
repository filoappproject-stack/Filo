# Filo — Il tuo capo di stato maggiore digitale

> Unifica email, task, note e calendario in un'unica superficie. Usa l'intelligenza artificiale per suggerire proattivamente l'azione giusta al momento giusto.

🌐 **Demo live:** [filo-new.vercel.app](https://filo-new.vercel.app)

---

## Il problema

Il professionista moderno usa in media 6-8 strumenti digitali ogni giorno: email, task manager, note, calendario, messaggi. Ogni app gestisce un frammento della giornata, ma nessuna li unisce davvero. Il risultato è un costante senso di dispersione — si sa cosa c'è, ma non si sa cosa fare.

## La soluzione

Filo non è un'altra app di produttività. È un assistente che osserva il contesto, capisce le priorità e dice al manager esattamente cosa fare adesso e perché.

---

## Funzionalità principali

### Suggerimenti AI contestuali
Descrivi la tua agenda e le cose in sospeso. Filo analizza il contesto e restituisce 3-5 suggerimenti prioritizzati con spiegazione del perché farlo adesso.

### Check-in energia mattutino
All'accesso, Filo chiede come stai — energia, sonno, stress. I suggerimenti vengono calibrati in base al tuo stato: se sei a pezzi, meno attività e più focalizzate.

### Memoria adattiva
Filo registra i tuoi pattern nel tempo: energia media, task che tendi a rimandare, abitudini produttive. I suggerimenti diventano sempre più precisi.

### Inbox unificata
Email e messaggi Slack in un unico flusso, con classificazione automatica per fonte.

### Gestione task
Crea task manualmente o direttamente dai suggerimenti AI. Priorità, scadenze, stato completato.

### Note con tag
Editor integrato con titolo, contenuto e tag personalizzabili. Ricercabili globalmente.

### Calendario integrato
Vista giornaliera con evidenziazione degli appuntamenti che hanno email o task collegati.

### Ricerca globale
Cerca in tempo reale tra task, note e inbox.

---

## Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Frontend | HTML / CSS / JavaScript vanilla |
| Backend (nuovo) | Node.js + Express |
| Database (nuovo) | PostgreSQL |
| Autenticazione | Supabase Auth + Google OAuth 2.0 |
| AI | Anthropic Claude API (claude-sonnet) |
| Hosting | Vercel (frontend) + Node hosting |
| Version control | GitHub |

---

## Nuova struttura backend (bootstrap)

È stato aggiunto un backend iniziale in `backend/` con:

- API Express v1 (`/api/v1/tasks`, `/api/v1/checkins`, `/api/v1/health`)
- Validazione input con Zod
- Connessione PostgreSQL tramite `pg`
- Schema SQL iniziale con tabelle `users`, `tasks`, `daily_checkins`

Dettagli architetturali: [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md).

---

## Sviluppo locale frontend

Il frontend attuale è ancora un singolo file HTML.

1. Clona il repository
```bash
git clone https://github.com/filoappproject-stack/Filo.git
```

2. Apri `index.html` nel browser

---

## Sviluppo locale backend

1. Vai nella cartella backend:
```bash
cd backend
```

2. Installa dipendenze:
```bash
npm install
```

3. Configura variabili ambiente:
```bash
cp .env.example .env
```

4. Crea schema DB:
```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

5. Avvia server:
```bash
npm run dev
```

API disponibile su `http://localhost:4000`.

---


## Checklist "pronto per amici e parenti" (alpha privata)

Prima di invitare una cerchia ristretta, completa questi controlli minimi:

- **Affidabilità**: smoke test giornaliero su `/api/v1/health` e su `/api/v1/assistant/day-analysis` con monitoraggio errori 5xx e timeout.
- **Sicurezza**: verifica RLS/permessi dati utente, rotazione chiavi API e assenza di segreti nel frontend.
- **Qualità UX**: onboarding iniziale chiaro (1-2 minuti), stati di errore leggibili e fallback quando l'AI non risponde.
- **Protezione dati**: privacy notice essenziale (quali dati salvi, per quanto tempo, come cancellarli).
- **Operatività**: canale feedback unico (es. form) e processo triage bug con priorità P0/P1/P2.

**Regola pratica**: se per 7 giorni consecutivi i flussi core (check-in, suggerimenti AI, creazione task, note, calendario) funzionano senza bug bloccanti, Filo è pronto per una beta privata con 5-15 persone.

### Come eseguire i test della checklist (passo-passo)

> Obiettivo: avere un rituale giornaliero semplice (15-20 minuti) e sempre uguale.

1. **Avvia backend locale**
```bash
cd backend
npm install
npm run dev
```

2. **Smoke test affidabilità API**
```bash
curl -sS http://localhost:4000/api/v1/health
curl -sS -X POST http://localhost:4000/api/v1/assistant/day-analysis \
  -H "Content-Type: application/json" \
  --data '{"agenda":"call cliente 11:00","pending":"chiudere preventivo"}'
```
Criterio PASS: `health` risponde `status: ok` e `day-analysis` restituisce risposta non vuota in meno di ~10s.

3. **Controllo sicurezza minimo**
- Verifica che ogni utente veda solo i propri dati (test con due account diversi).
- Conferma che non ci siano chiavi/API token nel frontend (ispeziona sorgente e variabili esposte).
- Se ruoti una chiave, verifica che il deploy continui a funzionare dopo redeploy.

4. **Controllo UX minimo**
- Esegui onboarding da zero (utente nuovo): deve richiedere massimo 1-2 minuti.
- Simula errore AI (es. chiave mancante in ambiente di test): l'app deve mostrare messaggio chiaro e fallback non bloccante.

5. **Controllo privacy operativo**
- Verifica che sia documentato: quali dati salvi, retention e come chiedere cancellazione.
- Esegui una cancellazione test e conferma che i dati non siano più accessibili.

6. **Raccolta evidenze giornaliera**
- Compila un log (Notion/Sheet) con: data, esito test, bug trovati, severità (`P0`,`P1`,`P2`), fix e stato.

Template rapido:
```text
Data: YYYY-MM-DD
Health API: PASS/FAIL
AI day-analysis: PASS/FAIL
Bug P0: n
Bug P1: n
Bug P2: n
Note: ...
```

**Go/No-Go**: invita amici/parenti solo quando hai 7 giorni consecutivi con `P0 = 0` e nessun bug bloccante nei flussi core.

## Licenza

Progetto privato — tutti i diritti riservati.

---

*Filo è in sviluppo attivo. Versione corrente: 0.8.0*

## Verifica integrazione Anthropic su Vercel

Dopo aver aggiunto la variabile ambiente (es. `ANTHROPIC_API_KEY`) in Vercel, verifica in questo ordine:

1. **Redeploy dopo la modifica env**  
   In Vercel, ogni cambiamento alle environment variables richiede un nuovo deploy del progetto (o "Redeploy" dell'ultimo commit).

2. **Controllo presenza variabile nel runtime**  
   Aggiungi un endpoint di health interno che non esponga la chiave, ma confermi la presenza della variabile (es. `hasAnthropicKey: true/false`).

3. **Test end-to-end endpoint AI**  
   Esegui una chiamata reale all'endpoint backend che usa Claude (con un prompt minimo) e verifica:
   - status HTTP 200;
   - risposta testuale non vuota;
   - latenza ragionevole;
   - assenza di errori `401`/`403` (chiave errata), `429` (rate limit), `5xx` (upstream).

4. **Verifica log Vercel Functions**  
   In caso di errore, leggi i log runtime per distinguere problemi di:
   - env mancante;
   - timeout funzione;
   - payload non valido verso Anthropic.

5. **Smoke test da UI**  
   Prova il flusso reale in frontend (es. "Suggerimenti AI") e conferma che l'utente riceve risposta senza fallback/placeholder.

Suggerimento pratico: usa una chiave distinta per `Preview` e `Production`, così puoi validare i deploy in anteprima senza impattare l'ambiente live.

### Esempio pratico: chiamata `GET /api/v1/health`

### Dove eseguire il comando

Lancia il comando in un **terminale del tuo computer** (macOS Terminal, Windows PowerShell, Linux shell), non dentro Vercel dashboard.

- Se usi **URL Vercel** (`https://...vercel.app/api/v1/health`), puoi lanciarlo da qualunque terminale con internet.
- Se usi **localhost** (`http://localhost:4000/api/v1/health`), devi essere sulla macchina dove gira il backend locale (`npm run dev`).

Con il backend locale attivo su porta 4000:

```bash
curl -sS http://localhost:4000/api/v1/health | jq
```

Su deploy Vercel (sostituisci il dominio):

```bash
curl -sS https://filo-new.vercel.app/api/v1/health | jq
```

Se non hai `jq` installato:

```bash
curl -sS https://filo-new.vercel.app/api/v1/health
```

Output atteso (esempio):

```json
{
  "status": "ok",
  "service": "filo-backend",
  "timestamp": "2026-05-09T12:34:56.789Z",
  "ai": {
    "enabled": true,
    "hasAnthropicKey": true,
    "model": "claude-sonnet-4-20250514"
  }
}
```

Se `hasAnthropicKey` è `false`, la variabile ambiente non è disponibile nel runtime del deployment corrente.


### Interpretazione rapida risposta `/api/v1/health`

Se la risposta contiene:

- `"status": "ok"`
- `"ai.enabled": true`
- `"ai.hasAnthropicKey": true`

allora il runtime backend è sano e la chiave Anthropic è caricata correttamente.

In quel caso, eventuali fallback locali non dipendono dalla chiave mancante ma da errori su `/api/v1/assistant/day-analysis` (es. route/import, quota, timeout provider).


### Test `POST /api/v1/assistant/day-analysis` (senza errori in Console)

Se in DevTools Console scrivi solo `POST /api/...`, JavaScript interpreta `POST` come variabile e mostra `ReferenceError: POST is not defined`.

Usa uno di questi due metodi:

1. **Da terminale (consigliato)**

```bash
curl -sS -X POST "https://filo-new.vercel.app/api/v1/assistant/day-analysis" \
  -H "Content-Type: application/json" \
  --data '{
    "agenda":"review clienti 11:00",
    "pending":"chiudere preventivo"
  }'
```

2. **Da DevTools Console (con `fetch`)**

```js
fetch('/api/v1/assistant/day-analysis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agenda: 'review clienti 11:00',
    pending: 'chiudere preventivo'
  })
}).then(r => r.json()).then(console.log)
```

Se la risposta contiene `data.suggerimenti`, la chiamata POST è andata a buon fine.


### Perché ricevi `401 Unauthorized` su `POST /api/v1/assistant/day-analysis`

`/api/v1/assistant/day-analysis` è protetto da autenticazione backend. Se chiami la POST senza token, la risposta è `401` con messaggio `Autenticazione richiesta`.

Per test rapido da DevTools (utente già loggato):

```js
fetch('/api/v1/assistant/day-analysis', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agenda: 'review clienti 11:00',
    pending: 'chiudere preventivo'
  })
}).then(r => r.json()).then(console.log)
```



> Nota importante: nel codice frontend normale (`fetchApi`) il token `Authorization: Bearer ...` viene aggiunto automaticamente. Se testi manualmente con `fetch(...)` in Console, devi aggiungerlo tu.

Esempio DevTools completo con token Supabase:

```js
const { data: { session } } = await supabaseClient.auth.getSession();
const token = session?.access_token;

fetch('/api/v1/assistant/day-analysis', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    agenda: 'review clienti 11:00',
    pending: 'chiudere preventivo'
  })
}).then(r => r.json()).then(console.log)
```

Per test da terminale devi passare un Bearer token valido:

```bash
curl -sS -X POST "https://filo-new.vercel.app/api/v1/assistant/day-analysis" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"agenda":"review clienti 11:00","pending":"chiudere preventivo"}'
```


### Quando la POST risponde con fallback locale (`degraded`)

Se vedi il messaggio `Analisi AI temporaneamente non disponibile: mostrati suggerimenti locali.`, la chiamata è autenticata e funziona, ma il backend è andato in modalità degradata (fallback locale).

Per vedere il motivo preciso, usa questo snippet in Console:

```js
const { data: { session } } = await supabaseClient.auth.getSession();
const token = session?.access_token;

const res = await fetch('/api/v1/assistant/day-analysis', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    agenda: 'review clienti 11:00',
    pending: 'chiudere preventivo'
  })
});

const json = await res.json();
console.log('HTTP', res.status);
console.log('message', json?.message);
console.log('degraded', json?.data?.degraded);
console.log('degradedStage', json?.data?.degradedStage);
console.log('degradedReason', json?.data?.degradedReason);
console.log('degradedHint', json?.data?.degradedHint);
console.log('diagnosticId', json?.data?.diagnosticId);
```

Poi cerca `diagnosticId` nei log Vercel Functions per trovare l'errore originale (provider AI, timeout, quota service, ecc.).


### Interpretazione `degradedStage: quota`

Se la risposta mostra:

- `degraded: true`
- `degradedStage: quota`
- `degradedReason: QUOTA_SERVICE_UNAVAILABLE`

allora il problema è nel servizio quota (non nella chiave Anthropic).

Controlli consigliati su Vercel:

1. Verifica che `DATABASE_URL` sia valorizzata in **Environment Variables** (Production/Preview corretto).
2. Verifica che nel database esista la tabella `ai_usage_limits` (schema migrato).
3. Cerca nei log Functions il `diagnosticId` stampato in risposta e il relativo errore SQL/connessione.

Dopo la correzione, ripeti la POST: `degraded` deve diventare `false` e i suggerimenti devono arrivare dal provider AI (quando disponibile).


### Fix rapido: errore `relation "ai_usage_limits" does not exist`

Se nei log Vercel compare `relation "ai_usage_limits" does not exist`, devi applicare lo schema DB nell'ambiente usato da Vercel (tipicamente Supabase Postgres).

Puoi eseguire in SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS ai_usage_limits (
  actor_key TEXT NOT NULL,
  day_key DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT TO_TIMESTAMP(0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_key, day_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_day_key ON ai_usage_limits(day_key);
```

Poi rilancia la POST ` /api/v1/assistant/day-analysis `: il campo `degradedStage` non deve più essere `quota`.


### Popup Supabase su RLS (`Run without RLS` vs `Run and enable RLS`)

Se appare il popup per la tabella `ai_usage_limits`, scegli **Run and enable RLS**.

Motivo: è l'opzione più sicura di default. La tabella quota viene usata dal backend server-side (non dal client anon) e non hai bisogno di esporla pubblicamente.

Dopo aver confermato, riesegui il test POST e verifica che `degradedStage` non sia più `quota`.


### Dopo la query SQL: come rilanciare `/api/v1/assistant/day-analysis`

Sì: il modo più semplice è cliccare in Filo il bottone **"Analizza la mia giornata"**.

Quel bottone esegue la chiamata `POST /api/v1/assistant/day-analysis` nel flusso reale dell'app.

Verifica attesa dopo il click:

- niente messaggio di fallback locale;
- suggerimenti AI aggiornati;
- nei log/debug response `degraded` dovrebbe essere `false`.


### Come confermare davvero che l'AI remota sta rispondendo

Se in risposta vedi `degraded: true`, **l'AI remota non sta rispondendo** (stai vedendo fallback locale).

Conferma in 3 passaggi:

1. In SQL Editor verifica che la tabella esista nello schema giusto:

```sql
select table_schema, table_name
from information_schema.tables
where table_name = 'ai_usage_limits';
```

Deve risultare almeno una riga con `table_schema = public`.

2. Verifica che la stessa connessione usata da Vercel punti a quel DB/progetto (controlla `DATABASE_URL` in Vercel).

3. Rilancia la POST e controlla questi campi:

- `degraded` deve essere `false`;
- `message` non deve dire "mostrati suggerimenti locali";
- `data.source` non deve essere `local-fallback`.

Se resta `degraded: true`, riapri i log con `diagnosticId`: il primo errore che vedi è la causa reale corrente.


### Stato atteso quando `ai_usage_limits` esiste in `public`

Se la query SQL restituisce `public | ai_usage_limits`, il prerequisito quota DB è corretto.

Passo successivo: rilancia `Analizza la mia giornata` e verifica in risposta/debug che:

- `degraded` sia `false`;
- non compaia il messaggio di fallback locale;
- i suggerimenti siano generati normalmente.


Nota: `GET /api/v1/health` ora include anche `quota.dbConfigured` e `quota.aiUsageTableExists` per verificare se il deployment vede davvero la tabella quota nel DB runtime.


### Dove impostare `ANTHROPIC_MODEL` in Vercel

Sì, esatto: puoi farlo da **Environment Variables** in Vercel (come nello screenshot).

Per questo progetto (`filo-new`), aggiungi/controlla:

- `ANTHROPIC_MODEL=claude-sonnet-4-20250514`

Importante:

1. assegna la variabile almeno a **Production** (e a **Preview** se testi lì);
2. salva la variabile sul progetto corretto (`filo-new`);
3. fai **Redeploy** dopo la modifica, altrimenti il runtime non la vede.


### Passi click-by-click in Vercel (screen come il tuo)

Nel pannello che hai aperto stai modificando **ANTHROPIC_API_KEY**.

Per impostare anche il modello devi creare una **nuova variabile**:

1. Clicca in alto a destra **Add Environment Variable**.
2. In **Key** inserisci: `ANTHROPIC_MODEL`
3. In **Value** inserisci: `claude-sonnet-4-20250514`
4. In **Environments** seleziona almeno **Production** (e anche **Preview** se testi lì).
5. Clicca **Save**.
6. Fai **Redeploy** dell'ultimo deployment.

Senza questo passaggio il backend usa un valore modello non valido o non allineato all'ambiente.


### Check finale dopo redeploy

Dopo aver impostato `ANTHROPIC_MODEL` e fatto redeploy:

1. Apri `GET /api/v1/health` e verifica:
   - `ai.hasAnthropicKey = true`
   - `quota.dbConfigured = true`
   - `quota.aiUsageTableExists = true`
2. In app clicca **Analizza la mia giornata**.
3. In debug/console verifica che la risposta non sia degradata:
   - `degraded = false`
   - nessun messaggio "mostrati suggerimenti locali".


### Dove digitare `GET /api/v1/health`

Non devi scrivere la parola `GET` da sola in Console.

Hai 2 modi semplici:

1. **Browser (più facile)**: nella barra indirizzi apri direttamente
   `https://filo-new.vercel.app/api/v1/health`

2. **Terminale**:

```bash
curl -sS https://filo-new.vercel.app/api/v1/health
```

Se vedi un JSON, la chiamata health è andata a buon fine.


### Interpretazione payload health completamente OK

Se `/api/v1/health` risponde con:

- `ai.enabled: true`
- `ai.hasAnthropicKey: true`
- `quota.dbConfigured: true`
- `quota.aiUsageTableExists: true`
- `quota.checkError: null`

allora configurazione env, chiave Anthropic e prerequisiti quota DB sono corretti sul deployment corrente.

A quel punto l'ultimo check è funzionale: clicca **Analizza la mia giornata** e verifica che `degraded` sia `false`.


### Anche se i log sembrano "tranquilli"

Se in Console vedi:

- `HTTP 200`
- `degraded: true`
- `degradedStage: quota`

allora l'AI remota **non** è ancora operativa: stai ricevendo fallback locale.

In questo caso non basta guardare solo lo status 200 in Vercel: devi cercare nei log il `diagnosticId` e il relativo evento `assistant.degraded` per trovare la causa concreta.


### Errore 429 (Too Many Requests) su `Analizza la mia giornata`

`429` in questo flusso è atteso quando superi la frequenza/quota di analisi:

- cooldown tra richieste ravvicinate (es. ~60 secondi);
- limite massimo giornaliero (es. 3 o 5 in base al payload).

Cosa fare:

1. Attendi il countdown mostrato nel pulsante (es. `Attendi 53s`) e riprova una sola volta.
2. Se `Analisi rimanenti oggi` è `0/x`, attendi il giorno successivo (reset quota) oppure testa con un altro utente/IP.
3. Evita click ripetuti o chiamate manuali parallele dalla Console.

Finché ricevi `429`, non è un errore Anthropic: è il rate/quota guardrail che sta funzionando.


### Quando fermarsi e riprendere il giorno dopo

Se vedi `Analisi rimanenti oggi: 0/5`, il comportamento corretto è fermarsi e riprovare il giorno successivo dopo il reset quota.


### Se Anthropic risponde 404 model not found

Se nei log vedi `Anthropic API error (404)` con `not_found_error` sul model, significa che quel model ID non è disponibile per la tua chiave/account in quel momento.

Check consigliato: elenca i model disponibili con la tua key:

```bash
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

Poi imposta in Vercel `ANTHROPIC_MODEL` su uno degli ID realmente presenti nella risposta.


### Procedura completa (passi 1-4) per il fix del 404 model

1. **Recupera la lista modelli disponibili**
   - Apri un terminale locale (puoi essere in qualunque cartella, il comando non dipende dal progetto).
   - Esporta la tua key Anthropic (oppure sostituisci direttamente nel comando):

   ```bash
   export ANTHROPIC_API_KEY='la-tua-key'
   curl https://api.anthropic.com/v1/models \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01"
   ```

2. **Scegli un model ID valido dalla risposta**
   - Cerca un id presente nella risposta JSON (es. `claude-3-7-sonnet-latest` o altro disponibile nel tuo account).
   - Copia esattamente l'id senza spazi extra.

3. **Imposta quel model in Vercel**
   - Vai su: `Project -> Environment Variables`.
   - Clicca **Add Environment Variable**.
   - Key: `ANTHROPIC_MODEL`
   - Value: `<model_id_copiato>`
   - Environments: almeno **Production** (e **Preview** se testi lì).
   - Salva.

4. **Redeploy e verifica**
   - Fai redeploy dell'ultimo commit.
   - Apri Filo e clicca **Analizza la mia giornata**.
   - Controlla che nei log Vercel non compaia più `Anthropic API error (404) ... model not found`.
