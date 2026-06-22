import { Router } from 'express';
import { getSuggestionStates, putSuggestionState } from '../controllers/suggestionStates.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getSuggestionStates));
router.put('/', asyncHandler(putSuggestionState));

export default router;
