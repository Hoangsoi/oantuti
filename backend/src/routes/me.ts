import { Router } from 'express';
import { getMeHandler } from '../controllers/me.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMeHandler);

export default router;
