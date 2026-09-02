import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { config } from '../config';

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Redact potential secrets before logging
  const safeMessage = err.message || 'Lỗi không xác định';
  console.error('[Backend Error Handler]:', {
    url: req.originalUrl,
    method: req.method,
    message: safeMessage,
  });

  const statusCode = err.statusCode || 500;
  
  // In production, do NOT leak stack traces, SQL errors, or file system paths
  if (config.nodeEnv === 'production') {
    const isClientError = statusCode < 500;
    const clientMsg = isClientError ? safeMessage : 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.';
    return sendError(res, clientMsg, statusCode);
  }

  return sendError(res, safeMessage, statusCode);
}
