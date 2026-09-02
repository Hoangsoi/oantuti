import crypto from 'crypto';
import https from 'https';
import { TelegramUser, Transaction, User } from '../types';
import { config } from '../config';

/**
 * Validates Telegram Mini App initData string according to official Telegram specification.
 * Supports legacy initData (without signature) and new Telegram iOS initData (containing signature).
 * Specification: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): { isValid: boolean; user?: TelegramUser } {
  if (!initData || !botToken) {
    return { isValid: false };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const signature = urlParams.get('signature');
    const authDateStr = urlParams.get('auth_date');
    const hasUser = urlParams.has('user');

    const paramNames: string[] = [];
    urlParams.forEach((_, key) => {
      paramNames.push(key);
    });

    const safeLogFail = (reason: string) => {
      console.warn('[Telegram Auth Validation Failed]', {
        reason,
        hasHash: Boolean(hash),
        hasSignature: Boolean(signature),
        hasUser,
        authDate: authDateStr || 'missing',
        parameterNames: paramNames,
      });
    };

    if (!hash) {
      safeLogFail('Missing hash parameter');
      return { isValid: false };
    }

    // Remove hash and signature before building dataCheckString for HMAC validation
    urlParams.delete('hash');
    urlParams.delete('signature');

    // 1. Verify auth_date to prevent replay attacks (MAX 24 hours expiry)
    if (!authDateStr) {
      safeLogFail('Missing auth_date parameter');
      return { isValid: false };
    }

    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);
    const MAX_EXPIRY_SECONDS = 86400; // 24 hours

    if (isNaN(authDate) || now - authDate > MAX_EXPIRY_SECONDS || authDate - now > 300) {
      safeLogFail(`auth_date timestamp invalid or expired (authDate: ${authDateStr}, now: ${now})`);
      return { isValid: false };
    }

    // 2. Sort remaining parameters alphabetically
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
      safeLogFail('Hash length mismatch');
      return { isValid: false };
    }

    const isValid = crypto.timingSafeEqual(calculatedBuffer, hashBuffer);

    if (!isValid) {
      safeLogFail('HMAC signature mismatch');
      return { isValid: false };
    }

    const userParam = urlParams.get('user');
    let user: TelegramUser | undefined;
    if (userParam) {
      user = JSON.parse(userParam);
    }

    return { isValid: true, user };
  } catch (error: any) {
    console.error('[Telegram Auth Error]', error.message || error);
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
