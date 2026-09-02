import { Request, Response } from 'express';
import { getLeaderboard } from '../services/leaderboard.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getLeaderboardHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const period = (req.query.period as 'all' | 'today' | 'week') || 'all';
    const result = await getLeaderboard(req.user.id, period);
    return sendSuccess(res, result, 'Lấy bảng xếp hạng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi lấy bảng xếp hạng', 400);
  }
}
