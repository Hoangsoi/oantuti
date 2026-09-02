import { query } from '../database';
import { ReferralStat, User } from '../types';

export async function getUserReferrals(user: User): Promise<ReferralStat> {
  const referralCode = user.referral_code;

  // Bot username placeholder or environment variable
  const botUsername = process.env.BOT_USERNAME || 'OanTuTiBot';
  const referralLink = `https://t.me/${botUsername}?startapp=ref_${referralCode}`;

  const referredUsersRes = await query(
    `SELECT u.id, u.first_name, u.username, u.rating, r.created_at
     FROM referrals r
     JOIN users u ON r.referred_id = u.id
     WHERE r.referrer_id = $1
     ORDER BY r.created_at DESC`,
    [user.id]
  );

  return {
    totalReferrals: referredUsersRes.rows.length,
    referralCode,
    referralLink,
    referredUsers: referredUsersRes.rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      username: row.username,
      rating: row.rating,
      created_at: row.created_at,
    })),
  };
}
