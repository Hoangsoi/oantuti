import { Router } from 'express';
import {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  playRoomMoveHandler,
} from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { gamePlayRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createRoomSchema, joinRoomSchema, roomMoveSchema } from '../validators';

const router = Router();

router.post('/create', authMiddleware, gamePlayRateLimiter, validateBody(createRoomSchema), createRoomHandler);
router.post('/join', authMiddleware, gamePlayRateLimiter, validateBody(joinRoomSchema), joinRoomHandler);
router.get('/:roomCode', authMiddleware, getRoomHandler);
router.post('/:roomCode/move', authMiddleware, gamePlayRateLimiter, validateBody(roomMoveSchema), playRoomMoveHandler);

export default router;
