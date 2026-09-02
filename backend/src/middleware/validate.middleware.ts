import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return sendError(res, `Dữ liệu không hợp lệ: ${issues}`, 400);
      }
      return sendError(res, 'Dữ liệu không hợp lệ', 400);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return sendError(res, `Tham số truy vấn không hợp lệ: ${issues}`, 400);
      }
      return sendError(res, 'Tham số truy vấn không hợp lệ', 400);
    }
  };
}
