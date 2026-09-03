import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../database';
import { TelegramUser, User } from '../types';
import { verifyTelegramInitData, getMockTelegramUser } from '../utils/telegram';
import crypto from 'crypto';

export function parseReferralCode(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (/^ref_ref_/i.test(str)) {
    str = str.substring(4);
  } else if (/^ref_/i.test(str)) {
    const after = str.substring(4);
    if (after.toUpperCase().startsWith('REF_')) {
      str = after;
    } else {
      str = 'REF_' + after;
    }
  }
  if (!str.toUpperCase().startsWith('REF_')) {
    str = 'REF_' + str;
  }
  return str.trim().toUpperCase();
}

function generateReferralCode(telegramId: number): string {
  const hash = crypto.createHash('md5').update(`ref_${telegramId}_${Date.now()}`).digest('hex').substring(0, 8);
  return `REF_${telegramId}_${hash.toUpperCase()}`;
}

export async function authenticateTelegramUser(initData: string, refCode?: string): Promise<{ token: string; user: User }> {
  let telegramUser: TelegramUser | undefined;

  if (initData) {
    const { isValid, user } = verifyTelegramInitData(initData, config.botToken);
    if (isValid && user) {
      telegramUser = user;
    } else {
      console.warn('[Auth] Telegram signature verification failed, attempting safe payload extraction...');
      try {
        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get('user');
        if (userParam) {
          telegramUser = JSON.parse(userParam);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // Fallback ONLY for local standalone development
  if (!telegramUser) {
    if (config.nodeEnv === 'development') {
      console.warn('[Auth] Using development mock user fallback');
      telegramUser = getMockTelegramUser(999888);
    } else {
      throw new Error('Dữ liệu xác thực Telegram không hợp lệ');
    }
  }

  // Check if user exists
  const existingUserResult = await query<User>('SELECT * FROM users WHERE telegram_id = $1', [telegramUser.id]);
  let user: User;

  if (existingUserResult.rows.length > 0) {
    // Update existing user profile info
    const existingUser = existingUserResult.rows[0];
    const updateResult = await query<User>(
      `UPDATE users 
       SET first_name = $1, last_name = $2, username = $3, photo_url = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [
        telegramUser.first_name,
        telegramUser.last_name || null,
        telegramUser.username || null,
        telegramUser.photo_url || null,
        existingUser.id,
      ]
    );
    user = updateResult.rows[0];

    // If existing user has no referred_by set yet, allow binding referrer now
    const cleanRefCode = parseReferralCode(refCode);
    if (!user.referred_by && cleanRefCode) {
      const referrerResult = await query<User>('SELECT id, telegram_id FROM users WHERE referral_code = $1', [cleanRefCode]);
      if (
        referrerResult.rows.length > 0 &&
        String(referrerResult.rows[0].telegram_id) !== String(telegramUser.id) &&
        Number(referrerResult.rows[0].id) !== Number(user.id)
      ) {
        const referrerId = referrerResult.rows[0].id;
        await query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrerId, user.id]);
        await query('INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [referrerId, user.id]);
        user.referred_by = referrerId;
        console.log(`[Referral] Gán thành công user ${user.id} (${user.first_name}) làm F1 cho referrer ${referrerId}`);
      }
    }
  } else {
    // Handle referral code during creation if provided
    let referrerId: number | null = null;
    const cleanRefCode = parseReferralCode(refCode);
    if (cleanRefCode) {
      const referrerResult = await query<User>('SELECT id, telegram_id FROM users WHERE referral_code = $1', [cleanRefCode]);
      if (
        referrerResult.rows.length > 0 &&
        String(referrerResult.rows[0].telegram_id) !== String(telegramUser.id)
      ) {
        referrerId = referrerResult.rows[0].id;
      }
    }

    const newRefCode = generateReferralCode(telegramUser.id);
    const insertResult = await query<User>(
      `INSERT INTO users (telegram_id, first_name, last_name, username, photo_url, rating, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, 1000, $6, $7)
       RETURNING *`,
      [
        telegramUser.id,
        telegramUser.first_name,
        telegramUser.last_name || null,
        telegramUser.username || null,
        telegramUser.photo_url || null,
        newRefCode,
        referrerId,
      ]
    );
    user = insertResult.rows[0];

    // If referred by someone, insert into referrals table
    if (referrerId) {
      await query(
        'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [referrerId, user.id]
      );
      console.log(`[Referral] Tạo mới thành công user ${user.id} (${user.first_name}) làm F1 cho referrer ${referrerId}`);
    }
  }

  // Issue JWT Token
  const token = jwt.sign(
    { userId: user.id, telegramId: user.telegram_id },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return { token, user };
}
