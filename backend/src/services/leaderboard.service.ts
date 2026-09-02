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
  { tgId: -201, name: 'Hoàng Nam', username: 'hoangnam_pro', rating: 2850, wins: 342, losses: 118, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=hoangnam_pro&backgroundColor=b6e3f4' },
  { tgId: -202, name: 'Bảo Trâm', username: 'bao_tram99', rating: 2720, wins: 289, losses: 95, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bao_tram99&backgroundColor=c0aede' },
  { tgId: -203, name: 'Minh Trí', username: 'minhtri_vip', rating: 2580, wins: 245, losses: 88, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=minhtri_vip&backgroundColor=ffdfbf' },
  { tgId: -204, name: 'Khánh Linh', username: 'khanhlinh_god', rating: 2460, wins: 212, losses: 74, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=khanhlinh_god&backgroundColor=d1d4f9' },
  { tgId: -205, name: 'Tiến Dũng', username: 'tiendung_ot', rating: 2350, wins: 185, losses: 69, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tiendung_ot&backgroundColor=ffd5dc' },
  { tgId: -206, name: 'Phương Thảo', username: 'phuongthao_kr', rating: 2240, wins: 164, losses: 62, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=phuongthao_kr&backgroundColor=c0aede' },
  { tgId: -207, name: 'Hải Đăng', username: 'haidang_9x', rating: 2110, wins: 142, losses: 55, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=haidang_9x&backgroundColor=b6e3f4' },
  { tgId: -208, name: 'Thu Trang', username: 'thutrang_vn', rating: 1980, wins: 128, losses: 49, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=thutrang_vn&backgroundColor=ffd5dc' },
  { tgId: -209, name: 'Trọng Hiếu', username: 'tronghieu_88', rating: 1850, wins: 115, losses: 42, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tronghieu_88&backgroundColor=d1d4f9' },
  { tgId: -210, name: 'Ngọc Ánh', username: 'ngocanh_sg', rating: 1720, wins: 98, losses: 38, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ngocanh_sg&backgroundColor=ffdfbf' },
  { tgId: -211, name: 'Gia Huy', username: 'giahuy_hn', rating: 1640, wins: 85, losses: 32, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=giahuy_hn&backgroundColor=b6e3f4' },
  { tgId: -212, name: 'Thùy Dương', username: 'thuyduong_00', rating: 1580, wins: 76, losses: 29, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=thuyduong_00&backgroundColor=c0aede' },
  { tgId: -213, name: 'Đức Anh', username: 'ducanh_top', rating: 1520, wins: 69, losses: 26, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ducanh_top&backgroundColor=d1d4f9' },
  { tgId: -214, name: 'Hương Giang', username: 'huonggiang_2k', rating: 1460, wins: 61, losses: 22, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=huonggiang_2k&backgroundColor=ffd5dc' },
  { tgId: -215, name: 'Quốc Bảo', username: 'quocbao_solo', rating: 1410, wins: 54, losses: 19, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=quocbao_solo&backgroundColor=b6e3f4' },
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

  // EXCLUDE ADMIN ACCOUNTS FROM LEADERBOARD
  const ADMIN_FILTER = `
    WHERE (username IS NULL OR (username NOT ILIKE '%admin%' AND username NOT ILIKE 'admin_%'))
      AND (first_name NOT ILIKE '%admin%' AND first_name NOT ILIKE 'admin_%')
      AND telegram_id != 999888777
  `;

  let topUsersQuery = `
    SELECT id, telegram_id, first_name, last_name, username, photo_url, rating, wins, losses, draws
    FROM users
    ${ADMIN_FILTER}
    ORDER BY rating DESC, wins DESC
    LIMIT 100
  `;

  if (period === 'today') {
    topUsersQuery = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.rating,
             u.wins, u.losses, u.draws
      FROM users u
      ${ADMIN_FILTER}
      ORDER BY u.wins DESC, u.rating DESC
      LIMIT 100
    `;
  } else if (period === 'week') {
    topUsersQuery = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.rating,
             u.wins, u.losses, u.draws
      FROM users u
      ${ADMIN_FILTER}
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
        `SELECT COUNT(*) as higher_rank_count FROM users ${ADMIN_FILTER} AND (rating > $1 OR (rating = $1 AND wins > $2))`,
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
