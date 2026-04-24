import { Router } from 'express';
import {
  getGoogleConnectUrl,
  getInboxMessages,
  postGoogleCodeExchange,
  postGoogleSync,
  postInboxSync
} from '../controllers/inbox.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google/connect', asyncHandler(getGoogleConnectUrl));
router.get('/google/connect', asyncHandler(getGoogleConnectUrl));
router.post('/google/exchange', asyncHandler(postGoogleCodeExchange));
router.post('/google/sync', asyncHandler(postGoogleSync));
router.post('/sync', asyncHandler(postInboxSync));
router.get('/messages', asyncHandler(getInboxMessages));

export default router;
