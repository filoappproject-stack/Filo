import { Router } from 'express';
import { postGuestFirstFilo } from '../controllers/guest.controller.js';
import { assistantRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/first-filo', assistantRateLimit, asyncHandler(postGuestFirstFilo));

export default router;
