import { Router } from 'express';
import { getTasks, patchTaskStatus, postTask, postTaskImport, removeTask } from '../controllers/tasks.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getTasks));
router.post('/', asyncHandler(postTask));
router.post('/import', asyncHandler(postTaskImport));
router.patch('/:id/status', asyncHandler(patchTaskStatus));
router.delete('/:id', asyncHandler(removeTask));

export default router;
