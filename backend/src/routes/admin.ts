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

const router = Router();

// Apply auth & strict admin check to ALL admin routes
router.use(authMiddleware, adminMiddleware);

// Deposit & Withdraw Approval Endpoints
router.get('/pending', getPendingTransactionsHandler);
router.get('/transactions', getAllTransactionsHandler);
router.post('/approve/:id', approveTransactionHandler);
router.post('/reject/:id', rejectTransactionHandler);

// Customer Management Endpoints
router.get('/users', getAllUsersHandler);
router.post('/users/:id/adjust-coins', adjustUserCoinsHandler);
router.post('/users/:id/toggle-block', toggleBlockUserHandler);

// Win/Loss & Game System Statistics
router.get('/stats', getGameStatsHandler);

// Admin Payment & Wallet Configuration
router.get('/payment-config', getPaymentConfigHandler);
router.post('/payment-config', updatePaymentConfigHandler);

export default router;
