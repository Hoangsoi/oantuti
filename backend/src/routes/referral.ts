import { Router } from 'express';
import { getReferralHandler } from '../controllers/referral.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getReferralHandler);

export default router;
