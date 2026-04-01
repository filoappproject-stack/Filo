import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { createTask, listTasks, updateTaskStatus } from '../services/tasks.service.js';

const UserQuerySchema = z.object({
  userId: z.string().uuid()
});

const CreateTaskSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
  energyCost: z.coerce.number().int().min(1).max(5).default(3),
  stressImpact: z.coerce.number().int().min(1).max(5).default(3)
});

const UpdateStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'done'])
});

export async function getTasks(req, res) {
  const parsed = UserQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Parametro userId non valido');
  }

  const tasks = await listTasks(parsed.data.userId);
  res.json({ data: tasks });
}

export async function postTask(req, res) {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload task non valido');
  }

  const task = await createTask(parsed.data);
  res.status(201).json({ data: task });
}

export async function patchTaskStatus(req, res) {
  const taskId = req.params.id;

  const parsed = UpdateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload status non valido');
  }

  const updated = await updateTaskStatus(taskId, parsed.data.userId, parsed.data.status);

  if (!updated) {
    throw new HttpError(404, 'Task non trovato');
  }

  res.json({ data: updated });
}
