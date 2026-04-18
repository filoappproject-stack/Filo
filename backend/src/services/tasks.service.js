import { query } from '../config/db.js';

export async function listTasks(userId) {
  const sql = `
    SELECT id, user_id, title, description, status, priority, due_date, energy_cost, stress_impact, created_at, updated_at
    FROM tasks
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await query(sql, [userId]);
  return rows;
}

export async function createTask(input) {
  const sql = `
    INSERT INTO tasks (user_id, title, description, status, priority, due_date, energy_cost, stress_impact)
    VALUES ($1, $2, $3, 'todo', $4, $5, $6, $7)
    RETURNING id, user_id, title, description, status, priority, due_date, energy_cost, stress_impact, created_at, updated_at
  `;

  const values = [
    input.userId,
    input.title,
    input.description,
    input.priority,
    input.dueDate,
    input.energyCost,
    input.stressImpact
  ];

  const { rows } = await query(sql, values);
  return rows[0];
}

export async function updateTaskStatus(taskId, userId, status) {
  const sql = `
    UPDATE tasks
    SET status = $3, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, status, updated_at
  `;

  const { rows } = await query(sql, [taskId, userId, status]);
  return rows[0] ?? null;
}

export async function deleteTask(taskId, userId) {
  const sql = `
    DELETE FROM tasks
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;

  const { rows } = await query(sql, [taskId, userId]);
  return rows[0] ?? null;
}
