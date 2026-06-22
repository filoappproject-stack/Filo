import { query } from '../config/db.js';

let taskSuggestionSchemaReady = false;

async function ensureTaskSuggestionSchema() {
  if (taskSuggestionSchemaReady) return;
  await query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_suggestion_title TEXT NOT NULL DEFAULT ''");
  await query("CREATE INDEX IF NOT EXISTS idx_tasks_user_suggestion ON tasks(user_id, source_suggestion_title) WHERE source_suggestion_title <> ''");
  taskSuggestionSchemaReady = true;
}

const TASK_RETURNING_COLUMNS = `
  id,
  user_id,
  title,
  description,
  status,
  priority,
  due_date,
  reminder_at,
  recurrence,
  energy_cost,
  stress_impact,
  source_suggestion_title,
  created_at,
  updated_at
`;

export async function listTasks(userId) {
  await ensureTaskSuggestionSchema();
  const sql = `
    SELECT ${TASK_RETURNING_COLUMNS}
    FROM tasks
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await query(sql, [userId]);
  return rows;
}

export async function getTaskById(taskId, userId) {
  await ensureTaskSuggestionSchema();
  const sql = `
    SELECT ${TASK_RETURNING_COLUMNS}
    FROM tasks
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `;

  const { rows } = await query(sql, [taskId, userId]);
  return rows[0] ?? null;
}

export async function createTask(input) {
  await ensureTaskSuggestionSchema();
  const sql = `
    INSERT INTO tasks (user_id, title, description, status, priority, due_date, reminder_at, recurrence, energy_cost, stress_impact, source_suggestion_title)
    VALUES ($1, $2, $3, 'todo', $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${TASK_RETURNING_COLUMNS}
  `;

  const values = [
    input.userId,
    input.title,
    input.description,
    input.priority,
    input.dueDate,
    input.reminderAt,
    input.recurrence,
    input.energyCost,
    input.stressImpact,
    input.sourceSuggestionTitle || ''
  ];

  const { rows } = await query(sql, values);
  return rows[0];
}

function normalizeDedupKey(title, dueDate) {
  const normalizedTitle = String(title || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const normalizedDueDate = dueDate ? new Date(dueDate).toISOString().slice(0, 10) : '';
  return `${normalizedTitle}::${normalizedDueDate}`;
}

export async function importTasks(userId, items) {
  await ensureTaskSuggestionSchema();
  const safeItems = Array.isArray(items) ? items : [];
  const existingSql = `
    SELECT title, due_date
    FROM tasks
    WHERE user_id = $1
  `;
  const { rows: existingRows } = await query(existingSql, [userId]);
  const seen = new Set(existingRows.map((row) => normalizeDedupKey(row.title, row.due_date)));
  const created = [];
  const skipped = [];

  for (const item of safeItems) {
    const key = normalizeDedupKey(item.title, item.dueDate);
    if (!key.split('::')[0] || seen.has(key)) {
      skipped.push({ title: item.title, dueDate: item.dueDate ?? null, reason: 'duplicate' });
      continue;
    }

    seen.add(key);
    const task = await createTask({
      userId,
      title: item.title,
      description: item.description || '',
      priority: item.priority || 'medium',
      dueDate: item.dueDate ?? null,
      reminderAt: item.reminderAt ?? null,
      recurrence: item.recurrence || 'none',
      energyCost: item.energyCost ?? 3,
      stressImpact: item.stressImpact ?? 3,
      sourceSuggestionTitle: item.sourceSuggestionTitle || ''
    });
    created.push(task);
  }

  return { created, skipped };
}

export async function updateTaskStatus(taskId, userId, status) {
  await ensureTaskSuggestionSchema();
  const sql = `
    UPDATE tasks
    SET status = $3, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id,
      title,
      description,
      status,
      priority,
      due_date,
      reminder_at,
      recurrence,
      energy_cost,
      stress_impact,
      source_suggestion_title,
      created_at,
      updated_at
  `;

  const { rows } = await query(sql, [taskId, userId, status]);
  return rows[0] ?? null;
}

export async function deleteTask(taskId, userId) {
  await ensureTaskSuggestionSchema();
  const sql = `
    DELETE FROM tasks
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;

  const { rows } = await query(sql, [taskId, userId]);
  return rows[0] ?? null;
}
