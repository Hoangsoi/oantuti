import { Router } from 'express';
import {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  playRoomMoveHandler,
  getWaitingRoomsHandler,
  resetRoomHandler,
  leaveRoomHandler,
  spectateRoomHandler,
} from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { gamePlayRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createRoomSchema, joinRoomSchema, roomMoveSchema, resetRoomSchema } from '../validators';

const router = Router();

router.get('/waiting', authMiddleware, getWaitingRoomsHandler);
router.post('/create', authMiddleware, gamePlayRateLimiter, validateBody(createRoomSchema), createRoomHandler);
router.post('/join', authMiddleware, gamePlayRateLimiter, validateBody(joinRoomSchema), joinRoomHandler);
router.get('/:roomCode', authMiddleware, getRoomHandler);
router.post('/:roomCode/spectate', authMiddleware, spectateRoomHandler);
router.post('/:roomCode/move', authMiddleware, gamePlayRateLimiter, validateBody(roomMoveSchema), playRoomMoveHandler);
router.post('/:roomCode/reset', authMiddleware, gamePlayRateLimiter, validateBody(resetRoomSchema), resetRoomHandler);
router.post('/:roomCode/leave', authMiddleware, leaveRoomHandler);

export default router;
