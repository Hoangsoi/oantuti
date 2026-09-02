import { Request, Response } from 'express';
import { getUserReferrals } from '../services/referral.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getReferralHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const result = await getUserReferrals(req.user);
    return sendSuccess(res, result, 'Lấy thông tin giới thiệu thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi lấy thông tin giới thiệu', 400);
  }
}
