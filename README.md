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
| Autenticazione | Supabase Auth + Google OAuth 2.0 |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-sonnet) |
| Hosting | Vercel |
| Memoria locale | localStorage (pattern comportamentali) |
| Version control | GitHub |

---

## Architettura

```
Utente
  │
  ├── Login (Google OAuth via Supabase)
  │
  ├── index.html (Single Page Application)
  │     ├── Suggerimenti AI → Anthropic API
  │     ├── Check-in energia → localStorage
  │     ├── Memoria adattiva → localStorage
  │     ├── Task / Note / Inbox → stato locale
  │     └── Autenticazione → Supabase
  │
  └── Vercel (hosting statico)
```

---

## Roadmap

| Fase | Obiettivo | Stato |
|---|---|---|
| Fase 0 — Prototipo | File HTML funzionante con AI e memoria | ✅ Completato |
| Fase 1 — App Web | Deploy Vercel, Supabase, login Google | ✅ Completato |
| Fase 2 — App Mobile | React Native, App Store e Play Store | 🔄 In pianificazione |
| Fase 3 — Autonomia | Agenti AI, bozze email, follow-up automatici | 📋 Roadmap |
| Fase 4 — Team | Workspace condivisi, dashboard manager-team | 📋 Roadmap |

---

## Piani e pricing

| Piano | Prezzo | Funzionalità |
|---|---|---|
| Free | Gratuito | Task, note, calendario base, 3 check-in/settimana |
| Pro | €9,99/mese | Tutto il Free + AI illimitata, Gmail, memoria completa |
| Team | €7,99/utente/mese | Tutto il Pro + workspace condiviso, dashboard team |

---

## Sviluppo locale

Il progetto è un singolo file HTML — non richiede installazioni.

1. Clona il repository
```bash
git clone https://github.com/filoappproject-stack/Filo.git
```

2. Apri `index.html` nel browser

Per abilitare i suggerimenti AI, aggiungi la tua chiave API Anthropic nel file.

---

## Variabili di configurazione

| Variabile | Descrizione |
|---|---|
| `SUPABASE_URL` | URL del progetto Supabase |
| `SUPABASE_KEY` | Chiave publishable di Supabase |

---

## Licenza

Progetto privato — tutti i diritti riservati.

---

*Filo è in sviluppo attivo. Versione corrente: 0.7.0*
