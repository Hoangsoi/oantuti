import { Router } from 'express';
import authRoutes from './auth';
import meRoutes from './me';
import gameRoutes from './game';
import leaderboardRoutes from './leaderboard';
import matchesRoutes from './matches';
import referralRoutes from './referral';
import rewardsRoutes from './rewards';
import roomRoutes from './room';
import walletRoutes from './wallet';
import adminRoutes from './admin';
import vipRoutes from './vip';

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/game', gameRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/matches', matchesRoutes);
router.use('/referral', referralRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/room', roomRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/vip', vipRoutes);

export default router;
