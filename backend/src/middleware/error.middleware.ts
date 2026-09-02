import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled Server Error:', err);
  return sendError(
    res,
    err.message || 'Đã xảy ra lỗi máy chủ nội bộ',
    err.statusCode || 500
  );
}
