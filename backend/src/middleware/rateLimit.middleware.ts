import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Helper to generate key using User ID if authenticated, or IP address
function userOrIpKeyGenerator(req: Request): string {
  if (req.user && req.user.id) {
    return `user_${req.user.id}_${req.baseUrl}${req.path}`;
  }
  return `ip_${req.ip}_${req.baseUrl}${req.path}`;
}

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 auth attempts per minute
  keyGenerator: userOrIpKeyGenerator,
  message: {
    success: false,
    message: 'Tần suất đăng nhập quá nhanh. Vui lòng thử lại sau 1 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const gamePlayRateLimiter = rateLimit({
  windowMs: 3 * 1000, // 3 seconds window
  max: 2, // Limit 2 game moves per 3 seconds to prevent rapid automation
  keyGenerator: userOrIpKeyGenerator,
  message: {
    success: false,
    message: 'Thao tác quá nhanh! Vui lòng chờ 3 giây.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const rewardsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 claims per minute
  keyGenerator: userOrIpKeyGenerator,
  message: {
    success: false,
    message: 'Thao tác nhận thưởng quá nhanh. Vui lòng chờ giây lát.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 admin requests per minute
  keyGenerator: userOrIpKeyGenerator,
  message: {
    success: false,
    message: 'Yêu cầu quản trị quá nhanh. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  keyGenerator: userOrIpKeyGenerator,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đến máy chủ. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
