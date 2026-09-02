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

const REALISTIC_MASTERS = [
  { tgId: -201, name: 'Hoàng Nam', username: 'hoangnam_pro', rating: 2850, wins: 342, losses: 118, avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { tgId: -202, name: 'Bảo Trâm', username: 'bao_tram99', rating: 2720, wins: 289, losses: 95, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { tgId: -203, name: 'Minh Trí', username: 'minhtri_vip', rating: 2580, wins: 245, losses: 88, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { tgId: -204, name: 'Khánh Linh', username: 'khanhlinh_god', rating: 2460, wins: 212, losses: 74, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
  { tgId: -205, name: 'Tiến Dũng', username: 'tiendung_ot', rating: 2350, wins: 185, losses: 69, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { tgId: -206, name: 'Phương Thảo', username: 'phuongthao_kr', rating: 2240, wins: 164, losses: 62, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { tgId: -207, name: 'Hải Đăng', username: 'haidang_9x', rating: 2110, wins: 142, losses: 55, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { tgId: -208, name: 'Thu Trang', username: 'thutrang_vn', rating: 1980, wins: 128, losses: 49, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { tgId: -209, name: 'Trọng Hiếu', username: 'tronghieu_88', rating: 1850, wins: 115, losses: 42, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { tgId: -210, name: 'Ngọc Ánh', username: 'ngocanh_sg', rating: 1720, wins: 98, losses: 38, avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80' },
  { tgId: -211, name: 'Gia Huy', username: 'giahuy_hn', rating: 1640, wins: 85, losses: 32, avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { tgId: -212, name: 'Thùy Dương', username: 'thuyduong_00', rating: 1580, wins: 76, losses: 29, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { tgId: -213, name: 'Đức Anh', username: 'ducanh_top', rating: 1520, wins: 69, losses: 26, avatar: 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=150&auto=format&fit=crop&q=80' },
  { tgId: -214, name: 'Hương Giang', username: 'huonggiang_2k', rating: 1460, wins: 61, losses: 22, avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80' },
  { tgId: -215, name: 'Quốc Bảo', username: 'quocbao_solo', rating: 1410, wins: 54, losses: 19, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
];

async function ensureRealisticLeaderboard(): Promise<void> {
  try {
    for (const master of REALISTIC_MASTERS) {
      await query(
        `INSERT INTO users (telegram_id, first_name, username, photo_url, rating, wins, losses, total_matches, referral_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (telegram_id) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             photo_url = EXCLUDED.photo_url,
             rating = EXCLUDED.rating,
             wins = EXCLUDED.wins,
             losses = EXCLUDED.losses,
             total_matches = EXCLUDED.total_matches`,
        [
          master.tgId,
          master.name,
          master.username,
          master.avatar,
          master.rating,
          master.wins,
          master.losses,
          master.wins + master.losses,
          `REF_MASTER_${Math.abs(master.tgId)}`,
        ]
      );
    }
  } catch (err) {
    console.error('Error seeding realistic leaderboard masters:', err);
  }
}

export async function getLeaderboard(currentUserId: number, period: 'all' | 'today' | 'week' = 'all') {
  await ensureRealisticLeaderboard();

  let topUsersQuery = `
    SELECT id, telegram_id, first_name, last_name, username, photo_url, rating, wins, losses, draws
    FROM users
    ORDER BY rating DESC, wins DESC
    LIMIT 100
  `;

  if (period === 'today') {
    topUsersQuery = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.rating,
             u.wins, u.losses, u.draws
      FROM users u
      ORDER BY u.wins DESC, u.rating DESC
      LIMIT 100
    `;
  } else if (period === 'week') {
    topUsersQuery = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.rating,
             u.wins, u.losses, u.draws
      FROM users u
      ORDER BY u.rating DESC, u.wins DESC
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
