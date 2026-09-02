import { Router } from 'express';
import { playGameHandler } from '../controllers/game.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { gamePlayRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/play', authMiddleware, gamePlayRateLimiter, playGameHandler);

export default router;
