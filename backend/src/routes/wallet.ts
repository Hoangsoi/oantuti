import { Router } from 'express';
import {
  getWalletInfoHandler,
  linkBankHandler,
  depositHandler,
  withdrawHandler,
} from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/info', authMiddleware, getWalletInfoHandler);
router.post('/link-bank', authMiddleware, linkBankHandler);
router.post('/deposit', authMiddleware, depositHandler);
router.post('/withdraw', authMiddleware, withdrawHandler);

export default router;
