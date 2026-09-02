import { Router } from 'express';
import { getRewardsHandler, claimRewardHandler } from '../controllers/rewards.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rewardsRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { claimRewardSchema } from '../validators';

const router = Router();

router.get('/', authMiddleware, getRewardsHandler);
router.post('/claim', authMiddleware, rewardsRateLimiter, validateBody(claimRewardSchema), claimRewardHandler);

export default router;
