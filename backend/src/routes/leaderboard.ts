import { Router } from 'express';
import { getLeaderboardHandler } from '../controllers/leaderboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getLeaderboardHandler);

export default router;
