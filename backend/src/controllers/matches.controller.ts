import { Request, Response } from 'express';
import { getUserMatches } from '../services/matches.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getMatchesHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const matches = await getUserMatches(req.user.id, limit);
    return sendSuccess(res, matches, 'Lấy lịch sử trận đấu thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi lấy lịch sử trận đấu', 400);
  }
}
