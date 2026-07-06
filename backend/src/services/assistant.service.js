import { env } from '../config/env.js';

let aiAttemptCounter = 0;

let lastAnalyzedSignature = null;
let lastAnalysisResult = null;

const FALLBACK_ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-5-haiku-latest'
];


function normalizeInputForCache(input) {
  const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
  const normalizeNumber = (value) => (Number.isFinite(value) ? Number(value) : null);

  return JSON.stringify({
    agenda: normalizeText(input?.agenda),
    pending: normalizeText(input?.pending),
    dayEnd: normalizeText(input?.dayEnd),
    availability: normalizeText(input?.availability),
    dayFocus: normalizeText(input?.dayFocus),
    calendarContext: normalizeText(input?.calendarContext),
    inboxContext: normalizeText(input?.inboxContext),
    memoryContext: normalizeText(input?.memoryContext),
    sleep: normalizeText(input?.sleep),
    energy: normalizeNumber(input?.energy),
    stress: normalizeNumber(input?.stress)
  });
}

export function getAiAttemptCounter() {
  return aiAttemptCounter;
}

function splitItems(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function enforceCheckinFacts(suggestions, input) {
  if (!Array.isArray(suggestions)) return [];

  const energy = Number.isFinite(input?.energy) ? Number(input.energy) : null;
  const stress = Number.isFinite(input?.stress) ? Number(input.stress) : null;
  const sleep = input?.sleep ? String(input.sleep).trim() : '';

  if (!Number.isFinite(energy) && !Number.isFinite(stress) && !sleep) {
    return suggestions;
  }

  const factParts = [];
  if (Number.isFinite(energy)) factParts.push(`energia ${energy}/5`);
  if (Number.isFinite(stress)) factParts.push(`stress ${stress}/5`);
  if (sleep) factParts.push(`sonno "${sleep}"`);
  const factsSentence = ` Check-in confermato: ${factParts.join(', ')}.`;

  return suggestions.map((s) => {
    const perche = String(s?.perche || '').trim();
    if (!perche) return { ...s, perche: `Basato sul tuo stato di oggi.${factsSentence}`.trim() };

    const sanitized = perche
      .replace(/\b[Ee]nergia\s+\d\s*\/\s*5\b/g, '')
      .replace(/\b[Ss]tress\s+\d\s*\/\s*5\b/g, '')
      .replace(/\b[Ee]nergia\s+non\s+specificata\b/g, '')
      .replace(/\b[Ee]nergia\s+non\s+dichiarata\b/g, '')
      .replace(/\b[Ss]tress\s+non\s+specificato\b/g, '')
      .replace(/\b[Ss]tress\s+non\s+dichiarato\b/g, '')
      .replace(/\b[Ss]onno\s+non\s+specificato\b/g, '')
      .replace(/\b[Ss]onno\s+non\s+dichiarato\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const normalized = sanitized.replace(/[,:;.\s]+$/g, '');
    return { ...s, perche: `${normalized}.${factsSentence}`.replace(/\.\./g, '.') };
  });
}

export function buildFallbackSuggestions(input) {
  const agendaItems = splitItems(input.agenda);
  const pendingItems = splitItems(input.pending);
  const focus = input.dayFocus ? String(input.dayFocus).trim() : '';
  const out = [];

  if (pendingItems.length) {
    out.push({
      titolo: `Sblocca subito: ${pendingItems[0]}`,
      perche: 'Chiudere il principale punto aperto riduce il carico mentale e libera attenzione per il resto della giornata.',
      priorita: 'urgente',
      azioni: ['Inizia ora (15 min)', 'Rimanda al pomeriggio']
    });
  }

  if (agendaItems.length) {
    out.push({
      titolo: `Prepara il prossimo impegno: ${agendaItems[0]}`,
      perche: 'Una preparazione rapida evita frizioni e rende più efficace il prossimo blocco in agenda.',
      priorita: 'alta',
      azioni: ['Prepara checklist', 'Aggiungi reminder']
    });
  }

  if (focus) {
    out.push({
      titolo: `Proteggi la priorità del giorno: ${focus}`,
      perche: 'Dedica un blocco concentrato alla priorità principale prima che venga frammentata da urgenze minori.',
      priorita: 'alta',
      azioni: ['Blocca 45 minuti', 'Rivedi a fine giornata']
    });
  }

  out.push({
    titolo: 'Definisci 3 obiettivi realistici per oggi',
    perche: 'Un limite chiaro alle priorità aumenta la probabilità di chiudere le attività davvero importanti.',
    priorita: 'normale',
    azioni: ['Seleziona top 3', 'Sposta il resto']
  });

  return out.slice(0, 5);
}

function getAiFallbackReasonForConfiguration() {
  if (!env.AI_ENABLED) {
    return {
      code: 'AI_DISABLED',
      hint: 'Analisi IA disattivata da configurazione: uso fallback locale.'
    };
  }
  if (!env.ANTHROPIC_API_KEY) {
    return {
      code: 'AI_API_KEY_MISSING',
      hint: 'Provider IA non configurato: manca la chiave API, quindi uso il fallback locale.'
    };
  }
  return {
    code: 'AI_EMPTY_RESPONSE',
    hint: 'Il provider IA non ha restituito suggerimenti utilizzabili.'
  };
}


function classifyAiProviderFailure(error) {
  const message = String(error?.message || error || '').trim();

  if (error?.name === 'AbortError' || /timeout|abort/i.test(message)) {
    return {
      code: 'AI_PROVIDER_TIMEOUT',
      hint: `Il provider IA non ha risposto entro ${env.ANTHROPIC_TIMEOUT_MS}ms.`
    };
  }

  const statusMatch = message.match(/Anthropic API error \((\d{3})\)/i);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  if (status === 401 || status === 403) {
    return {
      code: 'AI_PROVIDER_AUTH_ERROR',
      hint: 'Chiave API Anthropic non valida o non autorizzata: aggiorna ANTHROPIC_API_KEY nell’ambiente di deploy e ridistribuisci.'
    };
  }

  if (status === 404) {
    return {
      code: 'AI_PROVIDER_MODEL_UNAVAILABLE',
      hint: 'Il modello Anthropic configurato non risulta disponibile: verifica ANTHROPIC_MODEL o usa il modello predefinito.'
    };
  }

  if (status === 429) {
    return {
      code: 'AI_PROVIDER_RATE_LIMITED',
      hint: 'Il provider IA ha limitato temporaneamente le richieste: riprova più tardi o verifica quota e billing del provider.'
    };
  }

  if (status && status >= 500) {
    return {
      code: 'AI_PROVIDER_SERVER_ERROR',
      hint: `Il provider IA ha risposto con errore temporaneo (${status}): riprova tra qualche minuto.`
    };
  }

  if (/json|parse|unexpected token/i.test(message)) {
    return {
      code: 'AI_RESPONSE_PARSE_FAILED',
      hint: 'Il provider IA ha risposto, ma il contenuto non era nel formato JSON atteso.'
    };
  }

  return {
    code: 'AI_PROVIDER_UNAVAILABLE',
    hint: 'Il provider IA non è raggiungibile o non ha completato la richiesta: controlla rete, configurazione provider e log backend.'
  };
}

async function askAnthropic(input) {
  aiAttemptCounter += 1;
  if (!env.AI_ENABLED) {
    console.info('AI disabilitata da kill switch (AI_ENABLED=false), uso fallback locale.');
    return null;
  }
  if (!env.ANTHROPIC_API_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ANTHROPIC_TIMEOUT_MS);

  const celebrationRule = input?.includeCelebrationSuggestions === false
    ? 'I suggerimenti legati ad auguri/celebrazioni sono disattivati dalle preferenze utente: non proporli.'
    : 'Se nel contesto calendario compaiono compleanni, onomastici o anniversari, includi almeno 1 suggerimento con proposta di auguri/messaggio dedicato (tono professionale ma caldo).';

  const prompt = `Sei Filo, assistente operativo per manager.
Agenda: ${input.agenda || 'non specificata'}
In sospeso: ${input.pending || 'nessuna'}
Fine giornata: ${input.dayEnd || 'non specificata'}
Tempo utile oggi: ${input.availability || 'non specificato'}
Priorità del giorno: ${input.dayFocus || 'non specificata'}
Sonno: ${input.sleep ? `"${String(input.sleep).trim()}"` : 'non specificato'}
Energia: ${Number.isFinite(input.energy) ? `${input.energy}/5` : 'non specificata'}
Stress: ${Number.isFinite(input.stress) ? `${input.stress}/5` : 'non specificato'}
Contesto memoria: ${input.memoryContext || 'nessuno'}
Contesto calendario (eventi di oggi): ${input.calendarContext || 'nessuno'}
Contesto inbox (ultime email): ${input.inboxContext || 'nessuno'}

Rispondi SOLO con JSON valido:
{"suggerimenti":[{"titolo":"azione","perche":"perché adesso in 1-2 frasi","priorita":"urgente|alta|normale|bassa","azioni":["Inizia","Rimanda"]}]}
Fornisci 3-5 suggerimenti concreti.
Se nel contesto inbox trovi richieste esplicite (es. registrazione, scadenze, conferme), includi almeno 1 suggerimento su quell'email (agire o rimandare).
${celebrationRule}`;

  const requestAnthropic = async (model) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: controller.signal
  });

  let response;
  try {
    response = await requestAnthropic(env.ANTHROPIC_MODEL);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Anthropic API timeout dopo ${env.ANTHROPIC_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let detail = await response.text().catch(() => '');
    const invalidModel = response.status === 404 && /model/i.test(detail);

    if (invalidModel) {
      const candidates = FALLBACK_ANTHROPIC_MODELS.filter((m) => m !== env.ANTHROPIC_MODEL);
      for (const candidate of candidates) {
        console.warn(`Anthropic model non trovato (${env.ANTHROPIC_MODEL}), retry con fallback ${candidate}.`);
        response = await requestAnthropic(candidate);
        if (response.ok) {
          break;
        }
        detail = await response.text().catch(() => '');
      }
    }

    if (!response.ok) {
      throw new Error(`Anthropic API error (${response.status}): ${detail}`);
    }
  }

  const data = await response.json();
  const text = Array.isArray(data?.content)
    ? data.content.map((item) => item?.text || '').join('')
    : '';
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  const suggestions = Array.isArray(parsed?.suggerimenti) ? parsed.suggerimenti : [];
  return suggestions;
}

function normalizeGuestFirstFilo(parsed, rawText) {
  const safeString = (value, fallback = '') => String(value || fallback).trim();
  const safeArray = (value) => Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
  const safeObjects = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];

  const actionLoop = safeObjects(parsed?.primo_giro).slice(0, 6).map((item, index) => ({
    ordine: Number(item?.ordine) || index + 1,
    titolo: safeString(item?.titolo, `Azione ${index + 1}`),
    perche: safeString(item?.perche),
    tempo: safeString(item?.tempo),
    tipo: safeString(item?.tipo)
  }));

  const readyMessages = safeObjects(parsed?.messaggi_pronti).slice(0, 3).map((item) => ({
    destinatario: safeString(item?.destinatario, 'Messaggio'),
    testo: safeString(item?.testo)
  })).filter((item) => item.testo);

  return {
    title: safeString(parsed?.titolo_salvataggio, 'Primo Filo'),
    summary: safeString(parsed?.lettura, 'Filo ha trasformato le note in un primo piano operativo.'),
    hiddenTheme: safeString(parsed?.tema_nascosto),
    firstAction: actionLoop[0]?.titolo || safeString(parsed?.prima_azione, 'Scegli la prima azione concreta.'),
    plan: actionLoop,
    readyMessages,
    quickWins: safeArray(parsed?.azioni_veloci).slice(0, 3),
    saveAs: safeString(parsed?.salva_come, 'Primo Filo'),
    note: [
      safeString(parsed?.titolo_salvataggio, 'Primo Filo'),
      '',
      safeString(parsed?.lettura),
      parsed?.tema_nascosto ? `Tema nascosto: ${safeString(parsed.tema_nascosto)}` : '',
      '',
      'Primo giro:',
      ...actionLoop.map((item) => `${item.ordine}. ${item.titolo}${item.tempo ? ` (${item.tempo})` : ''}${item.perche ? ` - ${item.perche}` : ''}`),
      readyMessages.length ? '\nMessaggi pronti:' : '',
      ...readyMessages.map((item) => `${item.destinatario}: ${item.testo}`),
      '',
      'Materiale iniziale:',
      rawText
    ].filter(Boolean).join('\n')
  };
}

export async function analyzeGuestFirstFilo(input) {
  aiAttemptCounter += 1;
  if (!env.AI_ENABLED || !env.ANTHROPIC_API_KEY) {
    return null;
  }

  const rawText = String(input?.raw || '').trim();
  const kind = String(input?.kind || '').trim() || 'non specificato';
  const source = String(input?.source || '').trim() || 'non specificata';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ANTHROPIC_TIMEOUT_MS);

  const prompt = `Sei Filo, un assistente che trasforma note sparse in un primo giro d'azione.
L'utente non ha ancora un account: deve vedere valore immediato, concreto, non una semplice riformulazione.

Tipo scelto: ${kind}
Punto di partenza: ${source}
Note dell'utente:
${rawText}

Rispondi SOLO con JSON valido, senza markdown:
{
  "titolo_salvataggio": "titolo breve e personale",
  "salva_come": "nome cartella/filo breve",
  "lettura": "1-2 frasi: cosa hai capito sotto la superficie, non ripetere l'input",
  "tema_nascosto": "pattern o carico nascosto che collega le note",
  "prima_azione": "azione concreta da fare per prima",
  "primo_giro": [
    {"ordine":1,"titolo":"azione concreta","perche":"perche' questa posizione nell'ordine","tempo":"5-15 min","tipo":"contatto|pagamento|prenotazione|manutenzione|decisione|altro"}
  ],
  "messaggi_pronti": [
    {"destinatario":"farmacia/meccanico/persona","testo":"messaggio pronto da copiare, naturale e breve"}
  ],
  "azioni_veloci": ["micro-azione chiudibile subito"]
}

Regole:
- Non copiare semplicemente le note: interpreta, raggruppa, ordina.
- Se ci sono commissioni familiari, esplicita il carico di coordinamento.
- Se ci sono contatti o prenotazioni, prepara messaggi pronti.
- Massimo 5 azioni nel primo_giro.
- Italiano naturale, tono pratico e caldo.`;

  const requestAnthropic = async (model) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: controller.signal
  });

  try {
    let response = await requestAnthropic(env.ANTHROPIC_MODEL);
    if (!response.ok && response.status === 404) {
      const candidates = FALLBACK_ANTHROPIC_MODELS.filter((m) => m !== env.ANTHROPIC_MODEL);
      for (const candidate of candidates) {
        response = await requestAnthropic(candidate);
        if (response.ok) break;
      }
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Anthropic API error (${response.status}): ${detail}`);
    }

    const data = await response.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((item) => item?.text || '').join('')
      : '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return normalizeGuestFirstFilo(parsed, rawText);
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeDay(input) {
  const inputSignature = normalizeInputForCache(input);

  if (inputSignature === lastAnalyzedSignature && lastAnalysisResult?.suggestions) {
    return lastAnalysisResult;
  }

  let suggestions;
  let source = 'ai';
  let degraded = false;
  let degradedReason = null;
  let degradedHint = null;

  try {
    const aiSuggestions = await askAnthropic(input);
    if (aiSuggestions?.length) {
      suggestions = aiSuggestions.slice(0, 5);
    } else {
      const fallbackReason = getAiFallbackReasonForConfiguration();
      degradedReason = fallbackReason.code;
      degradedHint = fallbackReason.hint;
    }
  } catch (err) {
    const providerFailure = classifyAiProviderFailure(err);
    degradedReason = providerFailure.code;
    degradedHint = providerFailure.hint;
    console.warn('AI day analysis fallback attivato:', providerFailure.code, err?.message || err);
  }

  if (!suggestions) {
    source = 'local-fallback';
    degraded = true;
    suggestions = buildFallbackSuggestions(input);
  }

  suggestions = enforceCheckinFacts(suggestions, input);

  const result = {
    suggestions,
    source,
    degraded,
    degradedStage: degraded ? 'analysis' : null,
    degradedReason,
    degradedHint
  };

  lastAnalyzedSignature = inputSignature;
  lastAnalysisResult = result;

  return result;
}
