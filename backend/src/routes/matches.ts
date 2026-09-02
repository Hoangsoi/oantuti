import { Router } from 'express';
import { getMatchesHandler } from '../controllers/matches.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMatchesHandler);

export default router;
