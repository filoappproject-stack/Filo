import { Router } from 'express';
import { postDayAnalysis, postDayAnalysisQuotaStatus } from '../controllers/assistant.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/day-analysis', asyncHandler(postDayAnalysis));
router.post('/day-analysis/quota', asyncHandler(postDayAnalysisQuotaStatus));

export default router;
