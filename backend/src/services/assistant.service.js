import { env } from '../config/env.js';

function splitItems(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
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
  if (!env.ANTHROPIC_API_KEY) return null;

  const prompt = `Sei Filo, assistente operativo per manager.
Agenda: ${input.agenda || 'non specificata'}
In sospeso: ${input.pending || 'nessuna'}
Fine giornata: ${input.dayEnd || 'non specificata'}
Tempo utile oggi: ${input.availability || 'non specificato'}
Priorità del giorno: ${input.dayFocus || 'non specificata'}
Energia: ${Number.isFinite(input.energy) ? `${input.energy}/5` : 'non specificata'}
Stress: ${Number.isFinite(input.stress) ? `${input.stress}/5` : 'non specificato'}
Contesto memoria: ${input.memoryContext || 'nessuno'}

Rispondi SOLO con JSON valido:
{"suggerimenti":[{"titolo":"azione","perche":"perché adesso in 1-2 frasi","priorita":"urgente|alta|normale|bassa","azioni":["Inizia","Rimanda"]}]}
Fornisci 3-5 suggerimenti concreti.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Anthropic API error (${response.status}): ${detail}`);
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
  try {
    const aiSuggestions = await askAnthropic(input);
    if (aiSuggestions?.length) {
      return aiSuggestions.slice(0, 5);
    }
  } catch (err) {
    console.warn('AI day analysis fallback attivato:', err?.message || err);
  }

  return buildFallbackSuggestions(input);
}
