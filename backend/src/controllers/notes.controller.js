import { z } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { createNote, deleteNote, listNotes, updateNote } from '../services/notes.service.js';

const UserQuerySchema = z.object({
  userId: z.string().uuid()
});

const SaveNoteSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(10000).optional().default(''),
  tags: z.array(z.string().max(50)).max(20).optional().default([])
});

const DeleteNoteSchema = z.object({
  userId: z.string().uuid()
});

export async function getNotes(req, res) {
  const parsed = UserQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Parametro userId non valido');
  }
  const notes = await listNotes(parsed.data.userId);
  res.json({ data: notes });
}

export async function postNote(req, res) {
  const parsed = SaveNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload nota non valido');
  }
  const created = await createNote(parsed.data);
  res.status(201).json({ data: created });
}

export async function patchNote(req, res) {
  const parsed = SaveNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload nota non valido');
  }
  const updated = await updateNote(req.params.id, parsed.data);
  if (!updated) {
    throw new HttpError(404, 'Nota non trovata');
  }
  res.json({ data: updated });
}

export async function removeNote(req, res) {
  const parsed = DeleteNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Payload delete nota non valido');
  }
  const deleted = await deleteNote(req.params.id, parsed.data.userId);
  if (!deleted) {
    throw new HttpError(404, 'Nota non trovata');
  }
  res.status(204).send();
}
