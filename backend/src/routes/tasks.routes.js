import { Router } from 'express';
import { getTasks, patchTaskStatus, postTask } from '../controllers/tasks.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getTasks));
router.post('/', asyncHandler(postTask));
router.patch('/:id/status', asyncHandler(patchTaskStatus));

export default router;
