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

## Licenza

Progetto privato — tutti i diritti riservati.

---

*Filo è in sviluppo attivo. Versione corrente: 0.8.0*
