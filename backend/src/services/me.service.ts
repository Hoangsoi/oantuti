import { query } from '../database';
import { User } from '../types';

export async function getUserProfile(userId: number): Promise<User> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new Error('Không tìm thấy thông tin người dùng');
  }
  return result.rows[0];
}

export async function topupUserCoins(userId: number, amount: number): Promise<User> {
  const safeAmount = Math.max(100, Math.min(100000, Math.floor(amount)));
  const result = await query<User>(
    `UPDATE users 
     SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 
     RETURNING *`,
    [safeAmount, userId]
  );
  if (result.rows.length === 0) {
    throw new Error('Không thể nạp Xu Game');
  }
  return result.rows[0];
}
