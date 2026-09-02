import { query } from '../database';
import { ReferralStat, ReferralTierStat, User } from '../types';

const TIER_RATES = [
  { level: 1, rate: '1.0%' },
  { level: 2, rate: '0.4%' },
  { level: 3, rate: '0.3%' },
  { level: 4, rate: '0.2%' },
  { level: 5, rate: '0.1%' },
];

export async function getUserReferrals(user: User): Promise<ReferralStat> {
  const referralCode = user.referral_code;
  const botUsername = process.env.BOT_USERNAME || 'OanTuTiBot';
  const referralLink = `https://t.me/${botUsername}?startapp=ref_${referralCode}`;

  // Direct F1 referrals
  const referredUsersRes = await query(
    `SELECT u.id, u.first_name, u.username, u.rating, r.created_at
     FROM referrals r
     JOIN users u ON r.referred_id = u.id
     WHERE r.referrer_id = $1
     ORDER BY r.created_at DESC`,
    [user.id]
  );

  // 5-Tier Friends Count via Recursive CTE
  const tierCountRes = await query<{ level: number; friend_count: string }>(
    `WITH RECURSIVE ref_tree AS (
       SELECT id, referred_by, 1 AS level
       FROM users
       WHERE referred_by = $1

       UNION ALL

       SELECT u.id, u.referred_by, rt.level + 1
       FROM users u
       JOIN ref_tree rt ON u.referred_by = rt.id
       WHERE rt.level < 5
     )
     SELECT level, COUNT(id) AS friend_count
     FROM ref_tree
     GROUP BY level`,
    [user.id]
  );

  const tierCountMap = new Map<number, number>();
  tierCountRes.rows.forEach((r) => {
    tierCountMap.set(Number(r.level), parseInt(r.friend_count || '0', 10));
  });

  // Query commissions per tier
  const commRes = await query<{ level: number; total_amount: string }>(
    `SELECT level, COALESCE(SUM(amount), 0) as total_amount
     FROM referral_commissions
     WHERE referrer_id = $1
     GROUP BY level`,
    [user.id]
  );

  const commMap = new Map<number, number>();
  commRes.rows.forEach((r) => {
    commMap.set(Number(r.level), parseInt(r.total_amount || '0', 10));
  });

  let totalCommissions = 0;
  const tiers: ReferralTierStat[] = TIER_RATES.map((t) => {
    const friendCount = tierCountMap.get(t.level) || 0;
    const commissionCoins = commMap.get(t.level) || 0;
    totalCommissions += commissionCoins;
    return {
      level: t.level,
      count: friendCount,
      ratePercent: t.rate,
      commissionCoins: commissionCoins,
    };
  });

  return {
    totalReferrals: referredUsersRes.rows.length,
    totalCommissions,
    referralCode,
    referralLink,
    tiers,
    referredUsers: referredUsersRes.rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      username: row.username,
      rating: row.rating,
      created_at: row.created_at,
    })),
  };
}
