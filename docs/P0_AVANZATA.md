# Backlog P0 avanzata / definitiva

Questo documento conserva ciò che resta **fuori dalla P0 beta base** ma che può completare le stesse funzionalità in una versione più robusta o definitiva. La P0 attuale è considerata implementata come baseline beta; gli elementi sotto sono promemoria per non perderli prima di passare a una fase prodotto più matura.

## 1. Promemoria e notifiche task

Stato attuale: promemoria in-app/browser quando Filo è aperto.

Da valutare per versione avanzata:

- Service worker per notifiche anche con pagina non in primo piano.
- Push notification persistenti, compatibili con browser e mobile.
- Preferenze utente: abilita/disabilita notifiche, anticipo predefinito, quiet hours.
- Stato dei reminder: inviato, posticipato, ignorato.
- Azioni rapide dalla notifica: completa, rimanda, apri task.
- Log/diagnostica dei reminder non mostrati.

## 2. Ricorrenze task

Stato attuale: ricorrenze semplici `Ogni giorno`, `Ogni settimana`, `Ogni mese`, con creazione del follow-up al completamento.

Da valutare per versione avanzata:

- Regole più flessibili: giorni specifici della settimana, ogni N giorni/settimane/mesi.
- Data di fine ricorrenza o numero massimo di occorrenze.
- Gestione eccezioni: salta una ricorrenza, modifica solo questa occorrenza.
- Ricorrenze generate da job/server, non solo da azione frontend.
- Protezione da duplicati se l'utente completa o ricarica più volte.
- Report chiaro del prossimo task generato.

## 3. Board task

Stato attuale: board semplice con colonne `Da fare`, `In corso`, `Completati`, più coerenza con la vista Lista.

Da valutare per versione avanzata:

- Drag & drop tra colonne.
- Ordinamento manuale persistente delle card.
- Filtri per priorità, scadenza, energia/stress e fonte del task.
- WIP limit per la colonna `In corso`.
- Vista `Oggi / Settimana / Tutto`.
- Colonne o swimlane future, solo se utili e senza complicare la UX.

## 4. Inbox e Slack

Stato attuale: promessa chiarita; Gmail/Google Mailbox è attiva, Slack resta in roadmap.

Da valutare per versione avanzata:

- Integrazione Slack reale: OAuth, sync messaggi/canali rilevanti, permessi minimi.
- Separazione chiara tra email e messaggi Slack nella UI.
- Creazione task da messaggi Slack.
- Regole per evitare rumore: solo mention, DM o canali selezionati.
- Privacy notice aggiornata per dati Slack.

## Checklist di validazione prima di chiudere definitivamente P0

- Creazione task con promemoria e verifica reminder in-app.
- Creazione task ricorrente, completamento e verifica follow-up.
- Passaggio task `Da fare → In corso → Completato` in Board e Lista.
- Refresh/logout/login dopo ogni azione critica.
- Verifica che task, reminder e ricorrenze restino persistenti nel backend.
- Verifica che la copy non prometta Slack come funzionalità già attiva.
