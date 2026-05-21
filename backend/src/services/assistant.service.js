import { env } from '../config/env.js';

let aiAttemptCounter = 0;

let lastAnalyzedSignature = null;
let lastSuggestions = null;

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

async function askAnthropic(input) {
  aiAttemptCounter += 1;
  if (!env.AI_ENABLED) {
    console.info('AI disabilitata da kill switch (AI_ENABLED=false), uso fallback locale.');
    return null;
  }
  if (!env.ANTHROPIC_API_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ANTHROPIC_TIMEOUT_MS);

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
Se nel contesto calendario compaiono compleanni, onomastici o anniversari, includi almeno 1 suggerimento con proposta di auguri/messaggio dedicato (tono professionale ma caldo).`;

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

export async function analyzeDay(input) {
  const inputSignature = normalizeInputForCache(input);

  if (inputSignature === lastAnalyzedSignature && Array.isArray(lastSuggestions)) {
    return lastSuggestions;
  }

  let suggestions;

  try {
    const aiSuggestions = await askAnthropic(input);
    if (aiSuggestions?.length) {
      suggestions = aiSuggestions.slice(0, 5);
    }
  } catch (err) {
    console.warn('AI day analysis fallback attivato:', err?.message || err);
  }

  if (!suggestions) {
    suggestions = buildFallbackSuggestions(input);
  }

  suggestions = enforceCheckinFacts(suggestions, input);

  lastAnalyzedSignature = inputSignature;
  lastSuggestions = suggestions;

  return suggestions;
}
