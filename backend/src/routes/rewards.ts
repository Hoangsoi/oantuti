import { Router } from 'express';
import { getRewardsHandler, claimRewardHandler } from '../controllers/rewards.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getRewardsHandler);
router.post('/claim', authMiddleware, claimRewardHandler);

export default router;
