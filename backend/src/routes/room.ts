import { Router } from 'express';
import {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  playRoomMoveHandler,
} from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authMiddleware, createRoomHandler);
router.post('/join', authMiddleware, joinRoomHandler);
router.get('/:roomCode', authMiddleware, getRoomHandler);
router.post('/:roomCode/move', authMiddleware, playRoomMoveHandler);

export default router;
