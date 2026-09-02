import crypto from 'crypto';
import https from 'https';
import { TelegramUser, Transaction, User } from '../types';
import { config } from '../config';

/**
 * Validates Telegram Mini App initData string according to official Telegram specification.
 * Specification: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): { isValid: boolean; user?: TelegramUser } {
  if (!initData || !botToken) {
    return { isValid: false };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) {
      return { isValid: false };
    }

    urlParams.delete('hash');

    // 1. Verify auth_date to prevent replay attacks (MAX 24 hours expiry)
    const authDateStr = urlParams.get('auth_date');
    if (!authDateStr) {
      return { isValid: false };
    }

    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);
    const MAX_EXPIRY_SECONDS = 86400; // 24 hours

    if (isNaN(authDate) || now - authDate > MAX_EXPIRY_SECONDS || authDate - now > 300) {
      console.warn('[Telegram Auth] InitData expired or invalid auth_date timestamp:', authDateStr);
      return { isValid: false };
    }

    // 2. Sort parameters alphabetically
    const paramPairs: string[] = [];
    urlParams.forEach((val, key) => {
      paramPairs.push(`${key}=${val}`);
    });
    paramPairs.sort();

    const dataCheckString = paramPairs.join('\n');

    // 3. Calculate secret_key = HMAC-SHA256(key="WebAppData", msg=bot_token)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // 4. Calculate HMAC-SHA256(key=secret_key, msg=data_check_string)
    const calculatedHashHex = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 5. Use timingSafeEqual to prevent timing attacks
    const calculatedBuffer = Buffer.from(calculatedHashHex.toLowerCase(), 'utf8');
    const hashBuffer = Buffer.from(hash.toLowerCase(), 'utf8');

    if (calculatedBuffer.length !== hashBuffer.length) {
      return { isValid: false };
    }

    const isValid = crypto.timingSafeEqual(calculatedBuffer, hashBuffer);

    if (!isValid) {
      return { isValid: false };
    }

    const userParam = urlParams.get('user');
    let user: TelegramUser | undefined;
    if (userParam) {
      user = JSON.parse(userParam);
    }

    return { isValid: true, user };
  } catch (error) {
    console.error('Error verifying Telegram initData:', error);
    return { isValid: false };
  }
}

/**
 * Generates a mock Telegram user ONLY for development testing outside Telegram WebApp.
 */
export function getMockTelegramUser(customId: number = 999999): TelegramUser {
  return {
    id: customId,
    first_name: 'Tuấn (Demo)',
    last_name: 'Pro',
    username: 'tuan_demo',
    photo_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tuan_demo',
    language_code: 'vi',
  };
}

/**
 * Sends automated notification to Admin Telegram chat via Bot API.
 */
export async function sendTelegramAdminNotification(tx: Transaction, user: User) {
  const botToken = config.botToken;
  const adminChatId = config.adminTelegramId || '8780377211';

  if (!botToken || botToken.includes('AAEXAMPLE')) {
    console.log('[Telegram Bot Notification] Suppressed bot message (Bot token not configured or dev mode).');
    return;
  }

  const isDeposit = tx.type === 'deposit';
  const text = isDeposit
    ? `📥 *ĐƠN NẠP TIỀN CHỜ DUYỆT!* (#${tx.id})\n\n👤 *Khách hàng:* ${user.first_name} (ID: ${user.id})\n💰 *Số tiền:* ${Number(tx.amount).toLocaleString()} ${tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}\n🪙 *Quy đổi:* +${tx.coins.toLocaleString()} Xu\n📝 *Ghi chú:* ${tx.memo || 'Không có'}\n\n👉 *Vui lòng mở Admin Dashboard để duyệt & cộng Xu!*`
    : `📤 *ĐƠN RÚT TIỀN CHỜ DUYỆT!* (#${tx.id})\n\n👤 *Khách hàng:* ${user.first_name} (ID: ${user.id})\n🪙 *Số Xu rút:* -${tx.coins.toLocaleString()} Xu\n💵 *Thực nhận:* ${Number(tx.amount).toLocaleString()} ${tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}\n\n👉 *Vui lòng kiểm tra và duyệt chuyển tiền cho khách!*`;

  try {
    const postData = JSON.stringify({
      chat_id: adminChatId,
      text: text,
      parse_mode: 'Markdown',
    });

    const req = https.request(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        res.on('data', () => {});
      }
    );

    req.on('error', (err) => {
      console.error('[Telegram Bot Notification Error]:', err.message);
    });

    req.write(postData);
    req.end();
  } catch (error) {
    console.error('[Telegram Bot Exception]:', error);
  }
}
