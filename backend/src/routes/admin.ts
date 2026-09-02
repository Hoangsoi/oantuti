import { Router } from 'express';
import {
  getPendingTransactionsHandler,
  getAllTransactionsHandler,
  approveTransactionHandler,
  rejectTransactionHandler,
  getAllUsersHandler,
  adjustUserCoinsHandler,
  toggleBlockUserHandler,
  getGameStatsHandler,
  getPaymentConfigHandler,
  updatePaymentConfigHandler,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { adminRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { adjustCoinsSchema } from '../validators';

const router = Router();

// Apply auth, strict admin check, and admin rate limiter to ALL admin routes
router.use(authMiddleware, adminMiddleware, adminRateLimiter);

// Deposit & Withdraw Approval Endpoints
router.get('/pending', getPendingTransactionsHandler);
router.get('/transactions', getAllTransactionsHandler);
router.post('/approve/:id', approveTransactionHandler);
router.post('/reject/:id', rejectTransactionHandler);

// Customer Management Endpoints
router.get('/users', getAllUsersHandler);
router.post('/users/:id/adjust-coins', validateBody(adjustCoinsSchema), adjustUserCoinsHandler);
router.post('/users/:id/toggle-block', toggleBlockUserHandler);

// Win/Loss & Game System Statistics
router.get('/stats', getGameStatsHandler);

// Admin Payment & Wallet Configuration
router.get('/payment-config', getPaymentConfigHandler);
router.post('/payment-config', updatePaymentConfigHandler);

export default router;
