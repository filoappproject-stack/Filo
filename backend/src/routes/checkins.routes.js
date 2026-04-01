import { Router } from 'express';
import { getLastCheckin, putDailyCheckin } from '../controllers/checkins.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/latest', asyncHandler(getLastCheckin));
router.put('/daily', asyncHandler(putDailyCheckin));

export default router;
