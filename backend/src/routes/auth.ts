import { Router } from 'express';
import { telegramAuthHandler } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { authSchema } from '../validators';

const router = Router();

router.post('/telegram', authRateLimiter, validateBody(authSchema), telegramAuthHandler);

export default router;
