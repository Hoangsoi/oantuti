import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message: string = 'Thành công', statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res: Response, message: string = 'Đã có lỗi xảy ra', statusCode: number = 400, details?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}
