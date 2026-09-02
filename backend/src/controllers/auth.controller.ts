import { Request, Response } from 'express';
import { authenticateTelegramUser } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

export async function telegramAuthHandler(req: Request, res: Response) {
  try {
    const { initData, refCode } = req.body;
    const result = await authenticateTelegramUser(initData || '', refCode);
    return sendSuccess(res, result, 'Đăng nhập thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Xác thực Telegram thất bại', 400);
  }
}
