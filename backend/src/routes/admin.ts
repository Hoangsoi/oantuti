import { Router } from 'express';
import {
  getPendingTransactionsHandler,
  approveTransactionHandler,
  rejectTransactionHandler,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.get('/pending', authMiddleware, adminMiddleware, getPendingTransactionsHandler);
router.post('/approve/:id', authMiddleware, adminMiddleware, approveTransactionHandler);
router.post('/reject/:id', authMiddleware, adminMiddleware, rejectTransactionHandler);

export default router;
