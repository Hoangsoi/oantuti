import { Request, Response } from 'express';
import { createRoom, joinRoom, getRoomState, playRoomMove, getWaitingRooms, resetRoom, leaveRoom } from '../services/room.service';
import { sendSuccess, sendError } from '../utils/response';
import { Move } from '../types';

export async function getWaitingRoomsHandler(req: Request, res: Response) {
  try {
    const rooms = await getWaitingRooms();
    return sendSuccess(res, rooms, 'Lấy danh sách phòng chờ thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi lấy danh sách phòng chờ', 400);
  }
}

export async function createRoomHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const { betAmount } = req.body;
    const betNum = parseInt(betAmount, 10) || 0;
    const room = await createRoom(req.user.id, betNum);
    return sendSuccess(res, room, 'Tạo phòng đấu thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi tạo phòng đấu', 400);
  }
}

export async function joinRoomHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const { roomCode } = req.body;
    if (!roomCode) return sendError(res, 'Thiếu mã phòng đấu', 400);
    const room = await joinRoom(req.user.id, roomCode);
    return sendSuccess(res, room, 'Tham gia phòng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể tham gia phòng', 400);
  }
}

export async function getRoomHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const roomCode = req.params.roomCode;
    const room = await getRoomState(req.user.id, roomCode);
    return sendSuccess(res, room, 'Lấy trạng thái phòng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể lấy thông tin phòng', 400);
  }
}

export async function playRoomMoveHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const roomCode = req.params.roomCode;
    const { move } = req.body as { move: Move };
    if (!move) return sendError(res, 'Thiếu nước đi', 400);
    const room = await playRoomMove(req.user.id, roomCode, move);
    return sendSuccess(res, room, 'Khóa nước đi thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi khóa nước đi', 400);
  }
}

export async function resetRoomHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const roomCode = req.params.roomCode;
    const room = await resetRoom(req.user.id, roomCode);
    return sendSuccess(res, room, 'Reset phòng đấu thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi reset phòng đấu', 400);
  }
}

export async function leaveRoomHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const roomCode = req.params.roomCode;
    await leaveRoom(req.user.id, roomCode);
    return sendSuccess(res, null, 'Đã rời phòng đấu');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi rời phòng đấu', 400);
  }
}
