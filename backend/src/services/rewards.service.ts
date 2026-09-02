import { query, pool } from '../database';
import { DailyRewardTask, User } from '../types';

const TASKS_DEF = [
  {
    id: 'daily_login',
    title: 'Đăng nhập mỗi ngày',
    description: 'Vào game mỗi ngày nhận +5.000 Xu Game',
    rewardPoints: 50,
    rewardCoins: 5000,
    requiredCount: 1,
  },
  {
    id: 'play_5',
    title: 'Chơi 5 trận',
    description: 'Hoàn thành 5 trận đấu bất kỳ trong ngày',
    rewardPoints: 30,
    requiredCount: 5,
  },
  {
    id: 'win_3',
    title: 'Thắng 3 trận',
    description: 'Giành chiến thắng trong 3 trận đấu hôm nay',
    rewardPoints: 50,
    requiredCount: 3,
  },
  {
    id: 'invite_1',
    title: 'Mời 1 người bạn',
    description: 'Giới thiệu thêm bạn bè tham gia Oẳn Tù Tì',
    rewardPoints: 100,
    requiredCount: 1,
  },
];

export async function getUserRewards(userId: number): Promise<DailyRewardTask[]> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Get claimed rewards for today
  const claimedRes = await query<{ reward_type: string }>(
    'SELECT reward_type FROM daily_rewards WHERE user_id = $1 AND reward_date = $2',
    [userId, todayStr]
  );
  const claimedTypes = new Set(claimedRes.rows.map((r) => r.reward_type));

  // Get matches count for today
  const matchesTodayRes = await query<{ total_today: string; wins_today: string }>(
    `SELECT 
       COUNT(*) as total_today,
       COUNT(CASE WHEN result = 'win' THEN 1 END) as wins_today
     FROM matches 
     WHERE player_id = $1 AND created_at >= CURRENT_DATE`,
    [userId]
  );
  const totalMatchesToday = parseInt(matchesTodayRes.rows[0]?.total_today || '0', 10);
  const winsToday = parseInt(matchesTodayRes.rows[0]?.wins_today || '0', 10);

  // Get referral count
  const refRes = await query<{ total_ref: string }>(
    'SELECT COUNT(*) as total_ref FROM referrals WHERE referrer_id = $1',
    [userId]
  );
  const totalRef = parseInt(refRes.rows[0]?.total_ref || '0', 10);

  return TASKS_DEF.map((task) => {
    const isClaimed = claimedTypes.has(task.id);
    let currentCount = 0;

    if (task.id === 'daily_login') {
      currentCount = 1;
    } else if (task.id === 'play_5') {
      currentCount = totalMatchesToday;
    } else if (task.id === 'win_3') {
      currentCount = winsToday;
    } else if (task.id === 'invite_1') {
      currentCount = totalRef;
    }

    const isCompleted = currentCount >= task.requiredCount;
    const progressText = `${Math.min(currentCount, task.requiredCount)}/${task.requiredCount}`;

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      rewardPoints: task.rewardPoints,
      rewardCoins: (task as any).rewardCoins,
      isClaimed,
      isCompleted,
      progressText,
    };
  });
}

export async function claimReward(userId: number, rewardType: string): Promise<{ task: DailyRewardTask; updatedUser: User }> {
  const taskDef = TASKS_DEF.find((t) => t.id === rewardType);
  if (!taskDef) {
    throw new Error('Nhiệm vụ không hợp lệ');
  }

  const tasks = await getUserRewards(userId);
  const currentTask = tasks.find((t) => t.id === rewardType);

  if (!currentTask) {
    throw new Error('Không tìm thấy thông tin nhiệm vụ');
  }

  if (currentTask.isClaimed) {
    throw new Error('Bạn đã nhận phần thưởng này hôm nay rồi');
  }

  if (!currentTask.isCompleted) {
    throw new Error('Bạn chưa hoàn thành yêu cầu của nhiệm vụ này');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert claim record
    await client.query(
      `INSERT INTO daily_rewards (user_id, reward_date, reward_type)
       VALUES ($1, $2, $3)`,
      [userId, todayStr, rewardType]
    );

    const rewardCoins = (taskDef as any).rewardCoins || 0;

    // Add points to user rating and coins to balance
    const userRes = await client.query(
      `UPDATE users
       SET rating = rating + $1, coins = coins + $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [taskDef.rewardPoints, rewardCoins, userId]
    );

    await client.query('COMMIT');

    const updatedTask: DailyRewardTask = {
      ...currentTask,
      isClaimed: true,
    };

    return {
      task: updatedTask,
      updatedUser: userRes.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
