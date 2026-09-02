import { Router } from 'express';
import { getMeHandler, topupMeHandler } from '../controllers/me.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMeHandler);
router.post('/topup', authMiddleware, topupMeHandler);

export default router;
