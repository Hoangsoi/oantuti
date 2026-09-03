import { query } from '../database';
import { User } from '../types';

export async function getUserProfile(userId: number): Promise<User> {
  // Sync match stats from matches table if users counters are out of sync
  try {
    const matchCounts = await query<{
      total: string;
      wins: string;
      losses: string;
      draws: string;
    }>(
      `SELECT COUNT(*) as total,
              COALESCE(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END), 0) as wins,
              COALESCE(SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END), 0) as losses,
              COALESCE(SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END), 0) as draws
       FROM matches
       WHERE player_id = $1`,
      [userId]
    );

    if (matchCounts.rows.length > 0) {
      const { total, wins, losses, draws } = matchCounts.rows[0];
      const matchTotal = Number(total || 0);

      if (matchTotal > 0) {
        await query(
          `UPDATE users
           SET wins = GREATEST(wins, $1),
               losses = GREATEST(losses, $2),
               draws = GREATEST(draws, $3),
               total_matches = GREATEST(total_matches, $4),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND total_matches < $4`,
          [Number(wins), Number(losses), Number(draws), matchTotal, userId]
        );
      }
    }
  } catch (e) {
    console.error('Lỗi tự động đồng bộ thống kê trận đấu:', e);
  }

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
