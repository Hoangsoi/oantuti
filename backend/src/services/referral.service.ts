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

  // Query commissions per tier
  const commRes = await query<{ level: number; total_amount: string; ref_count: string }>(
    `SELECT level, COALESCE(SUM(amount), 0) as total_amount, COUNT(DISTINCT referred_id) as ref_count
     FROM referral_commissions
     WHERE referrer_id = $1
     GROUP BY level`,
    [user.id]
  );

  const commMap = new Map<number, { amount: number; count: number }>();
  commRes.rows.forEach((r) => {
    commMap.set(r.level, {
      amount: parseInt(r.total_amount || '0', 10),
      count: parseInt(r.ref_count || '0', 10),
    });
  });

  let totalCommissions = 0;
  const tiers: ReferralTierStat[] = TIER_RATES.map((t) => {
    const tierData = commMap.get(t.level) || { amount: 0, count: t.level === 1 ? referredUsersRes.rows.length : 0 };
    totalCommissions += tierData.amount;
    return {
      level: t.level,
      count: tierData.count,
      ratePercent: t.rate,
      commissionCoins: tierData.amount,
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
