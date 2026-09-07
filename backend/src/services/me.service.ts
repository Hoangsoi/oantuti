import { query } from '../database';
import { User } from '../types';

export async function getUserProfile(userId: number): Promise<User> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new Error('Không tìm thấy thông tin người dùng');
  }
  return result.rows[0];
}
