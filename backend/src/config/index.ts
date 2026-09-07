import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex'),
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  allowDevAuth: process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true',
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '8780377211',
  adminTelegramUsername: process.env.ADMIN_TELEGRAM_USERNAME || 'ottadmin2026',
  botUsername: (process.env.BOT_USERNAME || process.env.VITE_BOT_USERNAME || 'OanTuTiBot').replace(/^@/, ''),
};

export function validateConfig() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /oantuti_super_secret|YOUR_|CHANGE_ME/i.test(process.env.JWT_SECRET)) {
      throw new Error('Production requires a unique JWT_SECRET of at least 32 characters');
    }
    if (!config.botToken || /YOUR_|EXAMPLE/.test(config.botToken)) throw new Error('BOT_TOKEN is required');
    if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL is required');
  }
}
