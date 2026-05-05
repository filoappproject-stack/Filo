import { Router } from 'express';
import { postDayAnalysis, postDayAnalysisQuotaStatus } from '../controllers/assistant.controller.js';
import { assistantRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/day-analysis', assistantRateLimit, asyncHandler(postDayAnalysis));
router.post('/day-analysis/quota', asyncHandler(postDayAnalysisQuotaStatus));

export default router;
