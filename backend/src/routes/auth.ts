import { Router } from 'express';
import { telegramAuthHandler } from '../controllers/auth.controller';

const router = Router();

router.post('/telegram', telegramAuthHandler);

export default router;
