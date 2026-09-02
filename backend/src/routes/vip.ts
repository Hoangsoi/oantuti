import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getUserVipInfoHandler, claimMonthlyVipRewardHandler } from '../controllers/vip.controller';

const router = Router();

router.use(authMiddleware);

router.get('/info', getUserVipInfoHandler);
router.post('/claim', claimMonthlyVipRewardHandler);

export default router;
