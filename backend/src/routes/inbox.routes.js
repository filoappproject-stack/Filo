import { Router } from 'express';
import {
  deleteInboxConnection,
  getGoogleConnectUrl,
  getGoogleInboxConnectionStatus,
  getInboxConnectionStatus,
  getInboxMessages,
  postImapConnect,
  postImapSync,
  postGoogleCodeExchange,
  postGoogleSync
} from '../controllers/inbox.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google/connect', asyncHandler(getGoogleConnectUrl));
router.get('/google/connect', asyncHandler(getGoogleConnectUrl));
router.post('/google/exchange', asyncHandler(postGoogleCodeExchange));
router.post('/google/sync', asyncHandler(postGoogleSync));
router.get('/google/status', asyncHandler(getGoogleInboxConnectionStatus));
router.post('/imap/connect', asyncHandler(postImapConnect));
router.post('/imap/sync', asyncHandler(postImapSync));
router.get('/status', asyncHandler(getInboxConnectionStatus));
router.get('/messages', asyncHandler(getInboxMessages));
router.delete('/account', asyncHandler(deleteInboxConnection));

export default router;
