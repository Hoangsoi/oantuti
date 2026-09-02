import { Router } from 'express';
import {
  getWalletInfoHandler,
  linkBankHandler,
  depositHandler,
  withdrawHandler,
} from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rewardsRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { linkBankSchema, depositSchema, withdrawSchema } from '../validators';

const router = Router();

router.get('/info', authMiddleware, getWalletInfoHandler);
router.post('/link-bank', authMiddleware, rewardsRateLimiter, validateBody(linkBankSchema), linkBankHandler);
router.post('/deposit', authMiddleware, rewardsRateLimiter, validateBody(depositSchema), depositHandler);
router.post('/withdraw', authMiddleware, rewardsRateLimiter, validateBody(withdrawSchema), withdrawHandler);

export default router;
