import { Router } from 'express';
import {
  adminLoginHandler,
  getPendingTransactionsHandler,
  getAllTransactionsHandler,
  approveTransactionHandler,
  rejectTransactionHandler,
  getAllUsersHandler,
  adjustUserCoinsHandler,
  toggleBlockUserHandler,
  toggleCompanyUserHandler,
  deleteUserHandler,
  getGameStatsHandler,
  getPaymentConfigHandler,
  updatePaymentConfigHandler,
  clearAllSystemDataHandler,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { adminRateLimiter, authRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { adjustCoinsSchema, adminLoginSchema } from '../validators';

const router = Router();

// Public Admin Login Route
router.post('/login', authRateLimiter, validateBody(adminLoginSchema), adminLoginHandler);

// Apply auth, strict admin check, and admin rate limiter to ALL protected admin routes
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
router.post('/users/:id/toggle-company', toggleCompanyUserHandler);
router.delete('/users/:id', deleteUserHandler);

// Win/Loss & Game System Statistics
router.get('/stats', getGameStatsHandler);

// Admin Payment & Wallet Configuration
router.get('/payment-config', getPaymentConfigHandler);
router.post('/payment-config', updatePaymentConfigHandler);

import { getAdminVipConfigsHandler, updateAdminVipConfigsHandler } from '../controllers/vip.controller';

// Clear All System History Data Endpoint
router.post('/clear-data', clearAllSystemDataHandler);

// Admin VIP Configuration Endpoints
router.get('/vip-configs', getAdminVipConfigsHandler);
router.post('/vip-configs', updateAdminVipConfigsHandler);

export default router;
