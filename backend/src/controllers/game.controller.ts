import { Request, Response } from 'express';
import { playMatch } from '../services/game.service';
import { sendSuccess, sendError } from '../utils/response';
import { Move } from '../types';

export async function playGameHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const { move } = req.body as { move: Move };
    if (!move || !['rock', 'paper', 'scissors'].includes(move)) {
      return sendError(res, 'Nước đi không hợp lệ (Búa, Bao hoặc Kéo)', 400);
    }

    const result = await playMatch(req.user.id, move);
    return sendSuccess(res, result, 'Hoàn thành lượt chơi');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi xử lý trận đấu', 400);
  }
}
