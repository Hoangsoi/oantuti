import { Router } from 'express';
import { playGameHandler } from '../controllers/game.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { gamePlayRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { playGameSchema } from '../validators';

const router = Router();

router.post('/play', authMiddleware, gamePlayRateLimiter, validateBody(playGameSchema), playGameHandler);

export default router;
