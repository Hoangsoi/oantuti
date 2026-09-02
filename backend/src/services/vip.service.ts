import { query, pool } from '../database';
import { VipConfig, User } from '../types';

export async function recordWagerAndCheckVipUpgrade(
  dbClient: any,
  userId: number,
  wagerAmount: number
): Promise<{ newVipLevel: number; upgraded: boolean }> {
  if (wagerAmount <= 0) return { newVipLevel: 0, upgraded: false };

  // 1. Update total wager amount
  await dbClient.query(
    'UPDATE users SET total_wager_amount = total_wager_amount + $1 WHERE id = $2',
    [wagerAmount, userId]
  );

  // 2. Fetch updated total wager amount and current vip level
  const userRes = await dbClient.query(
    'SELECT total_wager_amount, vip_level FROM users WHERE id = $1',
    [userId]
  );

  if (userRes.rows.length === 0) return { newVipLevel: 0, upgraded: false };

  const totalWager = Number(userRes.rows[0].total_wager_amount || 0);
  const currentVip = Number(userRes.rows[0].vip_level || 0);

  // 3. Find highest qualified VIP level
  const vipRes = await dbClient.query(
    'SELECT * FROM vip_configs WHERE min_wager <= $1 ORDER BY vip_level DESC LIMIT 1',
    [totalWager]
  );

  let qualifiedVip = 0;
  if (vipRes.rows.length > 0) {
    qualifiedVip = Number(vipRes.rows[0].vip_level);
  }

  let upgraded = false;
  if (qualifiedVip > currentVip) {
    await dbClient.query('UPDATE users SET vip_level = $1 WHERE id = $2', [qualifiedVip, userId]);
    upgraded = true;
  }

  return { newVipLevel: Math.max(currentVip, qualifiedVip), upgraded };
}

export async function getAllVipConfigs(): Promise<VipConfig[]> {
  const res = await query('SELECT * FROM vip_configs ORDER BY vip_level ASC');
  return res.rows.map((row: any) => ({
    vip_level: Number(row.vip_level),
    min_wager: Number(row.min_wager),
    monthly_reward: Number(row.monthly_reward),
  }));
}

export async function updateVipConfigs(
  configs: { vip_level: number; min_wager: number; monthly_reward: number }[]
): Promise<VipConfig[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const cfg of configs) {
      await client.query(
        `INSERT INTO vip_configs (vip_level, min_wager, monthly_reward, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (vip_level) DO UPDATE
         SET min_wager = EXCLUDED.min_wager,
             monthly_reward = EXCLUDED.monthly_reward,
             updated_at = CURRENT_TIMESTAMP`,
        [cfg.vip_level, Math.max(0, cfg.min_wager), Math.max(0, cfg.monthly_reward)]
      );
    }
    await client.query('COMMIT');
    return getAllVipConfigs();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserVipInfo(userId: number) {
  const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) throw new Error('Người dùng không tồn tại');
  const user = userRes.rows[0];

  const totalWager = Number(user.total_wager_amount || 0);
  const currentVipLevel = Number(user.vip_level || 0);
  const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-09"
  const isClaimedThisMonth = user.last_vip_reward_claimed_month === currentMonth;

  const allConfigs = await getAllVipConfigs();

  const currentConfig = allConfigs.find((c) => c.vip_level === currentVipLevel) || null;
  const nextConfig = allConfigs.find((c) => c.vip_level === currentVipLevel + 1) || null;

  return {
    currentVipLevel,
    totalWagerAmount: totalWager,
    currentMonthlyReward: currentConfig ? currentConfig.monthly_reward : 0,
    isClaimedThisMonth,
    nextVipLevel: nextConfig ? nextConfig.vip_level : null,
    nextMinWager: nextConfig ? nextConfig.min_wager : null,
    wagerNeededForNextVip: nextConfig ? Math.max(0, nextConfig.min_wager - totalWager) : 0,
    allConfigs,
  };
}

export async function claimMonthlyVipReward(userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) throw new Error('Người dùng không tồn tại');
    const user = userRes.rows[0];

    const currentVipLevel = Number(user.vip_level || 0);
    if (currentVipLevel <= 0) {
      throw new Error('Bạn chưa đạt cấp độ VIP 1 trở lên để nhận lương/thưởng VIP hàng tháng.');
    }

    const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-09"
    if (user.last_vip_reward_claimed_month === currentMonth) {
      throw new Error(`Bạn đã nhận thưởng VIP hàng tháng của tháng ${currentMonth} rồi! Vui lòng quay lại vào tháng sau.`);
    }

    const vipConfigRes = await client.query(
      'SELECT monthly_reward FROM vip_configs WHERE vip_level = $1',
      [currentVipLevel]
    );

    if (vipConfigRes.rows.length === 0) {
      throw new Error('Không tìm thấy thông tin cấu hình thưởng VIP cho cấp độ của bạn');
    }

    const rewardCoins = Number(vipConfigRes.rows[0].monthly_reward || 0);
    if (rewardCoins <= 0) {
      throw new Error('Mức thưởng VIP hàng tháng hiện tại là 0 Xu');
    }

    // Add coins and update last claimed month
    await client.query(
      `UPDATE users 
       SET coins = coins + $1, last_vip_reward_claimed_month = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [rewardCoins, currentMonth, userId]
    );

    await client.query('COMMIT');

    const updatedUserRes = await query('SELECT coins FROM users WHERE id = $1', [userId]);
    return {
      success: true,
      rewardCoins,
      newCoins: Number(updatedUserRes.rows[0].coins),
      claimedMonth: currentMonth,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
