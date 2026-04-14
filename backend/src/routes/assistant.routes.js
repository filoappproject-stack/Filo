import { Router } from 'express';
import { postDayAnalysis } from '../controllers/assistant.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/day-analysis', asyncHandler(postDayAnalysis));

export default router;
