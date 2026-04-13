import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getCalendarEvents,
  getGoogleCalendarConnectUrl,
  postGoogleCalendarCodeExchange,
  postGoogleCalendarSync
} from '../controllers/calendar.controller.js';

const router = Router();

router.post('/google/connect', asyncHandler(getGoogleCalendarConnectUrl));
router.get('/google/connect', asyncHandler(getGoogleCalendarConnectUrl));
router.post('/google/exchange', asyncHandler(postGoogleCalendarCodeExchange));
router.post('/google/sync', asyncHandler(postGoogleCalendarSync));
router.get('/events', asyncHandler(getCalendarEvents));

export default router;
