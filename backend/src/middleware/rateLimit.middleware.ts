import rateLimit from 'express-rate-limit';

export const gamePlayRateLimiter = rateLimit({
  windowMs: 2000, // 2 seconds window
  max: 3, // limit each IP/User to 3 requests per 2 seconds to prevent rapid spam clicking
  message: {
    success: false,
    message: 'Thao tác quá nhanh! Vui lòng chờ giây lát.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  },
});
