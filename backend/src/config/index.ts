import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'oantuti_super_secret_jwt_key_2026',
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/oantuti',
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '8780377211',
  adminTelegramUsername: process.env.ADMIN_TELEGRAM_USERNAME || 'lucky20261102',
};
