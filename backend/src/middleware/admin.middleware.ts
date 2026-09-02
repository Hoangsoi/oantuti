import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { sendError } from '../utils/response';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 'Chưa đăng nhập', 401);
  }

  const userTgId = String(req.user.telegram_id);
  const adminTgId = String(config.adminTelegramId || '8780377211');

  if (userTgId === adminTgId || config.nodeEnv === 'development') {
    return next();
  }

  return sendError(res, 'Chỉ Admin (ID: 8780377211) mới có quyền truy cập', 403);
}
