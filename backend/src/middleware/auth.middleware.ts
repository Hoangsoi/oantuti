import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../database';
import { AuthJwtPayload, User } from '../types';
import { sendError } from '../utils/response';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    } else if (req.body && typeof req.body.token === 'string') {
      token = req.body.token;
    }

    if (!token) {
      return sendError(res, 'Vui lòng đăng nhập để thực hiện thao tác này', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret) as AuthJwtPayload;

    if (!decoded || !decoded.userId) {
      return sendError(res, 'Phiên đăng nhập không hợp lệ', 401);
    }

    const userResult = await query<User>('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows.length === 0) {
      return sendError(res, 'Người dùng không tồn tại trong hệ thống', 401);
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return sendError(res, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ', 401);
  }
}
