import { Router } from 'express';
import { postDayAnalysis, postDayAnalysisQuota } from '../controllers/assistant.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/day-analysis', asyncHandler(postDayAnalysis));
router.post('/day-analysis/quota', asyncHandler(postDayAnalysisQuota));

export default router;
