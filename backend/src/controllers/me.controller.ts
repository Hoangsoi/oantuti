import { Request, Response } from 'express';
import { getUserProfile, topupUserCoins } from '../services/me.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getMeHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const profile = await getUserProfile(req.user.id);
    return sendSuccess(res, profile, 'Lấy thông tin người dùng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi lấy thông tin người dùng', 400);
  }
}

export async function topupMeHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const { amount } = req.body;
    const amountNum = parseInt(amount, 10) || 1000;
    const updatedUser = await topupUserCoins(req.user.id, amountNum);
    return sendSuccess(res, updatedUser, `Nạp thành công +${amountNum.toLocaleString()} Xu Game`);
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi nạp Xu Game', 400);
  }
}
