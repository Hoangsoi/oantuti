import crypto from 'crypto';
import { TelegramUser } from '../types';
import { config } from '../config';

/**
 * Validates Telegram Mini App initData string.
 * Official Specification: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): { isValid: boolean; user?: TelegramUser } {
  if (!initData) {
    return { isValid: false };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) {
      return { isValid: false };
    }

    urlParams.delete('hash');

    // Sort parameters alphabetically
    const paramPairs: string[] = [];
    urlParams.forEach((val, key) => {
      paramPairs.push(`${key}=${val}`);
    });
    paramPairs.sort();

    const dataCheckString = paramPairs.join('\n');

    // 1. Calculate secret_key = HMAC-SHA256(key="WebAppData", msg=bot_token)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // 2. Calculate HMAC-SHA256(key=secret_key, msg=data_check_string)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const isValid = calculatedHash.toLowerCase() === hash.toLowerCase();

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
    console.error('Error verifying initData:', error);
    return { isValid: false };
  }
}

/**
 * Generates a mock Telegram user for development testing outside of Telegram WebApp.
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
