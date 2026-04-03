import { Router } from 'express';
import {
  getGoogleConnectUrl,
  getInboxMessages,
  postGoogleCodeExchange
} from '../controllers/inbox.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google/connect', asyncHandler(getGoogleConnectUrl));
router.post('/google/exchange', asyncHandler(postGoogleCodeExchange));
router.get('/messages', asyncHandler(getInboxMessages));

export default router;
