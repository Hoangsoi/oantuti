import { config } from './index';

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  const configured = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
  if (configured.includes(origin)) return true;
  return config.nodeEnv === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
