import { Router } from 'express';
import { getGoogleLoginUrl, postGoogleLoginExchange } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google/connect', asyncHandler(getGoogleLoginUrl));
router.get('/google/connect', asyncHandler(getGoogleLoginUrl));
router.post('/google/exchange', asyncHandler(postGoogleLoginExchange));

export default router;
