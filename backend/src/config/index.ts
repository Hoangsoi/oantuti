import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const NEON_DEFAULT_URL =
  'postgres://neondb_owner:npg_A6pgYDqvOk9J@ep-super-paper-b3lamijc-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'oantuti_super_secret_jwt_key_2026',
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || NEON_DEFAULT_URL,
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '8780377211',
  adminTelegramUsername: process.env.ADMIN_TELEGRAM_USERNAME || 'ottadmin2026',
  botUsername: (process.env.BOT_USERNAME || process.env.VITE_BOT_USERNAME || 'OanTuTiBot').replace(/^@/, ''),
};
