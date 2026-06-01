import { Router } from 'express';
import { getGoogleLoginCallback, getGoogleLoginUrl, postGoogleLoginExchange } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google/connect', asyncHandler(getGoogleLoginUrl));
router.get('/google/connect', asyncHandler(getGoogleLoginUrl));
router.post('/google/exchange', asyncHandler(postGoogleLoginExchange));
router.get('/google/callback', asyncHandler(getGoogleLoginCallback));

export default router;
