import { query } from '../database';
import { User } from '../types';

export interface LeaderboardEntry {
  rank: number;
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export async function getLeaderboard(currentUserId: number, period: 'all' | 'today' | 'week' = 'all') {
  let topUsersQuery = `
    SELECT id, telegram_id, first_name, last_name, username, photo_url, rating, wins, losses, draws
    FROM users
    ORDER BY rating DESC, wins DESC
    LIMIT 100
  `;

  if (period === 'today') {
    topUsersQuery = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.rating,
             COUNT(CASE WHEN m.result = 'win' THEN 1 END) as period_wins,
             u.wins, u.losses, u.draws
      FROM users u
      LEFT JOIN matches m ON u.id = m.player_id AND m.created_at >= CURRENT_DATE
      GROUP BY u.id
      ORDER BY period_wins DESC, u.rating DESC
      LIMIT 100
    `;
  } else if (period === 'week') {
    topUsersQuery = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.rating,
             COUNT(CASE WHEN m.result = 'win' THEN 1 END) as period_wins,
             u.wins, u.losses, u.draws
      FROM users u
      LEFT JOIN matches m ON u.id = m.player_id AND m.created_at >= DATE_TRUNC('week', CURRENT_DATE)
      GROUP BY u.id
      ORDER BY period_wins DESC, u.rating DESC
      LIMIT 100
    `;
  }

  const result = await query(topUsersQuery);

  const leaderboard: LeaderboardEntry[] = result.rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    telegram_id: Number(row.telegram_id),
    first_name: row.first_name,
    last_name: row.last_name,
    username: row.username,
    photo_url: row.photo_url,
    rating: row.rating,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
  }));

  // Find user's own rank if not in top 100
  let currentUserRank: LeaderboardEntry | null = null;
  const inTop = leaderboard.find((u) => u.id === currentUserId);

  if (inTop) {
    currentUserRank = inTop;
  } else {
    // Calculate current user exact rank
    const userResult = await query<User>('SELECT * FROM users WHERE id = $1', [currentUserId]);
    if (userResult.rows.length > 0) {
      const u = userResult.rows[0];
      const rankCountRes = await query(
        'SELECT COUNT(*) as higher_rank_count FROM users WHERE rating > $1 OR (rating = $1 AND wins > $2)',
        [u.rating, u.wins]
      );
      const exactRank = parseInt(rankCountRes.rows[0].higher_rank_count, 10) + 1;
      currentUserRank = {
        rank: exactRank,
        id: u.id,
        telegram_id: Number(u.telegram_id),
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        photo_url: u.photo_url,
        rating: u.rating,
        wins: u.wins,
        losses: u.losses,
        draws: u.draws,
      };
    }
  }

  return {
    period,
    top: leaderboard,
    currentUserRank,
  };
}
