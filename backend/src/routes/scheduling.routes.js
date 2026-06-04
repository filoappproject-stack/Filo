import { Router } from 'express';
import { postSmartSlotSuggestion } from '../controllers/scheduling.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/smart-slot', asyncHandler(postSmartSlotSuggestion));

export default router;
