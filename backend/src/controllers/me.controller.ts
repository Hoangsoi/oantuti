import { Request, Response } from 'express';
import { getUserProfile } from '../services/me.service';
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
