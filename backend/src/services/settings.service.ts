import { query } from '../database';

const settingKeys = {
  adminTelegramUsername: ['admin_telegram_username', 'ADMIN_TELEGRAM_USERNAME'],
  bankName: ['bank_name', 'ADMIN_BANK_NAME'],
  accountNumber: ['account_number', 'ADMIN_BANK_ACCOUNT'],
  accountHolder: ['account_holder', 'ADMIN_BANK_HOLDER'],
  usdtAddress: ['usdt_address', 'ADMIN_USDT_ADDRESS'],
  qrCodeUrl: ['qr_code_url', 'ADMIN_QR_CODE_URL'],
  botWinRate: ['bot_win_rate', 'BOT_WIN_RATE'],
} as const;

export async function readSettings(db: { query: Function } = { query }) {
  const res = await db.query('SELECT key, value FROM system_settings');
  const values = new Map<string, string>(res.rows.map((r: any) => [r.key, r.value]));
  const get = (name: keyof typeof settingKeys) => {
    const [key, env] = settingKeys[name];
    return values.get(key) ?? process.env[env] ?? '';
  };
  const rate = Number(get('botWinRate') || 70);
  return {
    adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '8780377211',
    adminTelegramUsername: get('adminTelegramUsername').replace(/^@/, '').trim(),
    bankName: get('bankName'), accountNumber: get('accountNumber'),
    accountHolder: get('accountHolder'), usdtAddress: get('usdtAddress'),
    qrCodeUrl: get('qrCodeUrl'),
    botWinRate: Number.isInteger(rate) && rate >= 0 && rate <= 100 ? rate : 70,
  };
}

export { settingKeys };
