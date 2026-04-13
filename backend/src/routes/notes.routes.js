import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getNotes, patchNote, postNote, removeNote } from '../controllers/notes.controller.js';

const router = Router();

router.get('/', asyncHandler(getNotes));
router.post('/', asyncHandler(postNote));
router.patch('/:id', asyncHandler(patchNote));
router.delete('/:id', asyncHandler(removeNote));

export default router;
