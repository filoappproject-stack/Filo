import { query } from '../config/db.js';
import { listCalendarEvents } from './calendar.service.js';
import { getLatestCheckin } from './checkins.service.js';
import { getTaskById } from './tasks.service.js';
import { HttpError } from '../utils/httpError.js';

const DEFAULT_WORK_START_HOUR = 9;
const DEFAULT_WORK_END_HOUR = 18;
const MIN_SLOT_MINUTES = 15;
const SLOT_GRANULARITY_MINUTES = 15;
const MAX_SUGGESTIONS = 3;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeDurationMinutes(value) {
  const raw = Number(value) || 30;
  const rounded = Math.ceil(raw / SLOT_GRANULARITY_MINUTES) * SLOT_GRANULARITY_MINUTES;
  return clamp(rounded, MIN_SLOT_MINUTES, 180);
}

function roundUpToNextQuarter(date) {
  const rounded = new Date(date.getTime());
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 15;
  if (remainder !== 0) rounded.setMinutes(minutes + (15 - remainder));
  return rounded;
}

function parseIsoDate(value, fieldName) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${fieldName} non valido`);
  }
  return parsed;
}

function resolveSchedulingWindow(input) {
  const from = parseIsoDate(input.from, 'from');
  const to = parseIsoDate(input.to, 'to');
  if (to <= from) throw new HttpError(400, 'La finestra di scheduling deve terminare dopo l\'inizio');

  const localDate = String(input.date || '').trim();
  const workStartHour = clamp(Number(input.workStartHour) || DEFAULT_WORK_START_HOUR, 0, 23);
  const workEndHour = clamp(Number(input.workEndHour) || DEFAULT_WORK_END_HOUR, workStartHour + 1, 24);

  return {
    from,
    to,
    localDate,
    workStartHour,
    workEndHour
  };
}

function resolveTaskEnergy(task, fallbackTask = {}) {
  const energyCost = Number(task?.energy_cost ?? fallbackTask?.energyCost ?? fallbackTask?.energy_cost ?? 3);
  const stressImpact = Number(task?.stress_impact ?? fallbackTask?.stressImpact ?? fallbackTask?.stress_impact ?? 3);
  return {
    energyCost: clamp(Number.isFinite(energyCost) ? energyCost : 3, 1, 5),
    stressImpact: clamp(Number.isFinite(stressImpact) ? stressImpact : 3, 1, 5)
  };
}

function resolveTaskTitle(task, fallbackTask = {}) {
  return String(task?.title || fallbackTask?.title || fallbackTask?.label || 'task').trim().slice(0, 200) || 'task';
}

function getBufferMinutes(checkin, taskEnergy) {
  const stressLevel = Number(checkin?.stress_level ?? 3);
  const stressImpact = Number(taskEnergy.stressImpact ?? 3);
  if (stressLevel >= 4 || stressImpact >= 4) return 15;
  if (stressLevel <= 2 && stressImpact <= 2) return 5;
  return 10;
}

function normalizeBusyIntervals(events, windowStart, windowEnd, bufferMinutes) {
  const bufferMs = bufferMinutes * 60 * 1000;
  return events
    .filter((event) => String(event?.status || '').toLowerCase() !== 'cancelled')
    .filter((event) => !event?.all_day)
    .map((event) => {
      const start = event?.starts_at ? new Date(event.starts_at) : null;
      const end = event?.ends_at ? new Date(event.ends_at) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
      return {
        start: new Date(Math.max(windowStart.getTime(), start.getTime() - bufferMs)),
        end: new Date(Math.min(windowEnd.getTime(), end.getTime() + bufferMs)),
        title: event.title || 'Evento'
      };
    })
    .filter(Boolean)
    .filter((interval) => interval.end > windowStart && interval.start < windowEnd)
    .sort((a, b) => a.start - b.start)
    .reduce((merged, interval) => {
      const last = merged[merged.length - 1];
      if (!last || interval.start > last.end) {
        merged.push({ ...interval });
        return merged;
      }
      if (interval.end > last.end) last.end = interval.end;
      return merged;
    }, []);
}

function buildFreeSlots(windowStart, windowEnd, busyIntervals, durationMinutes) {
  const durationMs = durationMinutes * 60 * 1000;
  const slots = [];
  let cursor = new Date(windowStart.getTime());

  for (const busy of busyIntervals) {
    if (busy.start > cursor && busy.start.getTime() - cursor.getTime() >= durationMs) {
      slots.push({ start: new Date(cursor.getTime()), end: new Date(cursor.getTime() + durationMs), gapEnd: busy.start });
    }
    if (busy.end > cursor) cursor = new Date(busy.end.getTime());
  }

  if (windowEnd.getTime() - cursor.getTime() >= durationMs) {
    slots.push({ start: new Date(cursor.getTime()), end: new Date(cursor.getTime() + durationMs), gapEnd: windowEnd });
  }

  return slots;
}

function getLocalWindowHour(slot, window) {
  const elapsedHours = (slot.start.getTime() - window.from.getTime()) / (60 * 60 * 1000);
  return window.workStartHour + elapsedHours;
}

function scoreSlot(slot, window, checkin, taskEnergy, durationMinutes) {
  const energyLevel = Number(checkin?.energy_level ?? 3);
  const stressLevel = Number(checkin?.stress_level ?? 3);
  const hour = getLocalWindowHour(slot, window);
  const gapMinutes = Math.round((slot.gapEnd.getTime() - slot.start.getTime()) / 60000);
  let score = 70;

  score += Math.min(12, Math.max(0, gapMinutes - durationMinutes) / 5);

  if (energyLevel <= 2) {
    score += durationMinutes <= 30 ? 12 : -10;
    if (hour >= 10 && hour <= 15) score += 8;
    if (hour >= 16) score -= 12;
  } else if (energyLevel >= 4) {
    if (taskEnergy.energyCost >= 4 && hour >= 9 && hour <= 12.5) score += 16;
    if (taskEnergy.energyCost <= 2 && hour >= 14) score += 6;
  } else if (hour >= 10 && hour <= 16) {
    score += 6;
  }

  if (stressLevel >= 4) {
    if (gapMinutes >= durationMinutes + 20) score += 10;
    if (hour >= 17) score -= 8;
  }

  if (taskEnergy.energyCost > energyLevel + 1) score -= 14;
  if (taskEnergy.stressImpact >= 4 && stressLevel >= 4) score -= 8;

  return Math.round(clamp(score, 1, 100));
}

function buildReason(slot, checkin, taskEnergy, durationMinutes, bufferMinutes) {
  const energyLevel = Number(checkin?.energy_level ?? 3);
  const stressLevel = Number(checkin?.stress_level ?? 3);
  const parts = [];

  if (energyLevel <= 2) {
    parts.push(`Energia ${energyLevel}/5: propongo un blocco breve e protetto`);
  } else if (energyLevel >= 4 && taskEnergy.energyCost >= 4) {
    parts.push(`Energia ${energyLevel}/5: è un buon momento per un task impegnativo`);
  } else {
    parts.push(`Energia ${energyLevel}/5: lo slot è compatibile con il carico del task`);
  }

  if (stressLevel >= 4) {
    parts.push(`stress ${stressLevel}/5: mantengo circa ${bufferMinutes} min di margine dagli eventi`);
  } else if (taskEnergy.stressImpact >= 4) {
    parts.push('il task può generare pressione, quindi evito incastri troppo stretti');
  } else {
    parts.push('la finestra è libera abbastanza da non comprimere la giornata');
  }

  parts.push(`durata stimata ${durationMinutes} min`);
  return `${parts.join('. ')}.`;
}

function toSlotPayload(slot, score, reason) {
  return {
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    score,
    label: score >= 85 ? 'Consigliato' : score >= 70 ? 'Buona alternativa' : 'Possibile',
    reason
  };
}

async function getTodayCheckinOrNeutral(userId, localDate) {
  if (localDate) {
    const { rows } = await query(
      `
        SELECT id, user_id, checkin_date, energy_level, stress_level, sleep_quality, created_at, updated_at
        FROM daily_checkins
        WHERE user_id = $1 AND checkin_date = $2::date
        LIMIT 1
      `,
      [userId, localDate]
    );
    if (rows[0]) return { checkin: rows[0], source: 'today' };
  }

  const latest = await getLatestCheckin(userId);
  if (latest) return { checkin: latest, source: 'latest' };

  return {
    checkin: { energy_level: 3, stress_level: 3, sleep_quality: 'fair' },
    source: 'neutral-fallback'
  };
}

export async function suggestSmartSlots(input) {
  const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
  const window = resolveSchedulingWindow(input);
  const now = new Date();
  const requestedWindowStartsTodayOrPast = window.from <= now && now < window.to;
  const windowStart = requestedWindowStartsTodayOrPast
    ? roundUpToNextQuarter(new Date(Math.max(window.from.getTime(), now.getTime())))
    : new Date(window.from.getTime());
  const windowEnd = new Date(window.to.getTime());

  if (windowEnd.getTime() - windowStart.getTime() < durationMinutes * 60 * 1000) {
    return {
      suggestions: [],
      message: `Oggi non resta una finestra abbastanza lunga per un blocco da ${durationMinutes} min.`,
      meta: { durationMinutes, calendarEventsConsidered: 0, checkinSource: 'not-needed' }
    };
  }

  const task = input.taskId ? await getTaskById(input.taskId, input.userId) : null;
  if (input.taskId && !task && !input.task) throw new HttpError(404, 'Task non trovato');

  const taskEnergy = resolveTaskEnergy(task, input.task);
  const taskTitle = resolveTaskTitle(task, input.task);
  const { checkin, source: checkinSource } = await getTodayCheckinOrNeutral(input.userId, window.localDate);
  const bufferMinutes = getBufferMinutes(checkin, taskEnergy);
  const events = await listCalendarEvents(input.userId, {
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    limit: 250
  });
  const busy = normalizeBusyIntervals(events, windowStart, windowEnd, bufferMinutes);
  const freeSlots = buildFreeSlots(windowStart, windowEnd, busy, durationMinutes);

  const suggestions = freeSlots
    .map((slot) => {
      const score = scoreSlot(slot, window, checkin, taskEnergy, durationMinutes);
      return toSlotPayload(slot, score, buildReason(slot, checkin, taskEnergy, durationMinutes, bufferMinutes));
    })
    .sort((a, b) => b.score - a.score || new Date(a.start) - new Date(b.start))
    .slice(0, MAX_SUGGESTIONS);

  return {
    task: {
      id: task?.id ?? input.taskId ?? null,
      title: taskTitle,
      energyCost: taskEnergy.energyCost,
      stressImpact: taskEnergy.stressImpact
    },
    suggestions,
    message: suggestions.length
      ? `Ho trovato ${suggestions.length} slot utili da ${durationMinutes} min per "${taskTitle}".`
      : `Oggi non vedo uno slot abbastanza sano da ${durationMinutes} min per questo task.`,
    meta: {
      durationMinutes,
      bufferMinutes,
      checkinSource,
      calendarEventsConsidered: events.length,
      window: {
        from: window.from.toISOString(),
        to: window.to.toISOString()
      }
    }
  };
}
