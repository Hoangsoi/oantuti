import { query, pool } from '../database';
import { Transaction, User } from '../types';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { readSettings, settingKeys } from './settings.service';
import { paymentConfigSchema } from '../validators';

export async function loginAdminUser(usernameInput: string, passwordInput: string) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword || adminPassword.length < 12 || adminPassword === 'Admin123@') {
    throw new Error('Đăng nhập quản trị bằng mật khẩu chưa được cấu hình');
  }
  const adminTgId = parseInt(process.env.ADMIN_TELEGRAM_ID || '8780377211', 10);

  if (usernameInput.trim() !== adminUsername || passwordInput.trim() !== adminPassword) {
    throw new Error('Tài khoản hoặc mật khẩu Admin không chính xác!');
  }

  // Find or create admin user record in database
  let adminUserRes = await query<User>('SELECT * FROM users WHERE telegram_id = $1', [adminTgId]);
  if (adminUserRes.rows[0]?.is_blocked) throw new Error('Tài khoản đã bị khóa');
  const currentAdminUsername = (process.env.ADMIN_TELEGRAM_USERNAME || 'ottadmin2026').replace('@', '').trim();
  let adminUser: User;

  if (adminUserRes.rows.length === 0) {
    const insertRes = await query<User>(
      `INSERT INTO users (telegram_id, first_name, last_name, username, rating, coins, referral_code)
       VALUES ($1, $2, 'Official', $2, 1000, 999999, 'REF_ADMIN_8780377211')
       RETURNING *`,
      [adminTgId, currentAdminUsername]
    );
    adminUser = insertRes.rows[0];
  } else {
    const updateRes = await query<User>(
      `UPDATE users 
       SET first_name = $1, username = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE telegram_id = $2 
       RETURNING *`,
      [currentAdminUsername, adminTgId]
    );
    adminUser = updateRes.rows[0];
  }

  // Issue JWT Token
  const token = jwt.sign(
    { userId: adminUser.id, telegramId: adminUser.telegram_id },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return { token, user: adminUser };
}

export async function getPendingTransactions() {
  const res = await query(
    `SELECT t.*, 
            u.first_name, u.last_name, u.username, u.telegram_id, u.photo_url,
            COALESCE(t.payout_details->>'bank_name', b.bank_name) AS bank_name,
            COALESCE(t.payout_details->>'account_number', b.account_number) AS account_number,
            COALESCE(t.payout_details->>'account_holder', b.account_holder) AS account_holder,
            COALESCE(t.payout_details->>'usdt_address', b.usdt_address) AS usdt_address
     FROM transactions t
     JOIN users u ON t.user_id = u.id
     LEFT JOIN bank_accounts b ON b.user_id = u.id
     WHERE t.status = 'pending'
     ORDER BY t.created_at DESC`
  );
  return res.rows;
}

export async function getAllTransactions(statusFilter?: string) {
  let sql = `
    SELECT t.*, 
           u.first_name, u.last_name, u.username, u.telegram_id, u.photo_url,
           COALESCE(t.payout_details->>'bank_name', b.bank_name) AS bank_name,
            COALESCE(t.payout_details->>'account_number', b.account_number) AS account_number,
            COALESCE(t.payout_details->>'account_holder', b.account_holder) AS account_holder,
            COALESCE(t.payout_details->>'usdt_address', b.usdt_address) AS usdt_address
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN bank_accounts b ON b.user_id = u.id
  `;

  const params: any[] = [];
  if (statusFilter && statusFilter !== 'all') {
    sql += ` WHERE t.status = $1`;
    params.push(statusFilter);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT 100`;

  const res = await query(sql, params);
  return res.rows;
}

export async function approveTransaction(txId: number) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const txRes = await client.query<Transaction>('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [txId]);
    if (txRes.rows.length === 0) {
      throw new Error('Giao dịch không tồn tại');
    }

    const tx = txRes.rows[0];

    if (tx.status !== 'pending') {
      throw new Error(`Giao dịch này đã ở trạng thái '${tx.status}'`);
    }

    await client.query("SELECT set_config('app.coin_reason', $1, true)", [`transaction:${tx.id}:approval`]);
    // If deposit, credit coins to user balance automatically!
    if (tx.type === 'deposit') {
      await client.query(
        'UPDATE users SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [tx.coins, tx.user_id]
      );
    }

    // Update transaction status to approved
    const updatedTxRes = await client.query<Transaction>(
      `UPDATE transactions 
       SET status = 'approved', admin_note = 'Đã duyệt bởi Admin', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [txId]
    );

    await client.query('COMMIT');

    return updatedTxRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectTransaction(txId: number, adminNote?: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const txRes = await client.query<Transaction>('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [txId]);
    if (txRes.rows.length === 0) {
      throw new Error('Giao dịch không tồn tại');
    }

    const tx = txRes.rows[0];

    if (tx.status !== 'pending') {
      throw new Error(`Giao dịch này đã ở trạng thái '${tx.status}'`);
    }

    await client.query("SELECT set_config('app.coin_reason', $1, true)", [`transaction:${tx.id}:rejection`]);
    // If withdrawal rejected, refund coins back to user balance!
    if (tx.type === 'withdraw') {
      await client.query(
        'UPDATE users SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [tx.coins, tx.user_id]
      );
    }

    const note = adminNote || 'Đã bị từ chối bởi Admin';
    const updatedTxRes = await client.query<Transaction>(
      `UPDATE transactions 
       SET status = 'rejected', admin_note = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [note, txId]
    );

    await client.query('COMMIT');

    return updatedTxRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ----------------------------------------------------------------------
// USER MANAGEMENT APIs
// ----------------------------------------------------------------------
export async function getAllUsers(searchQuery?: string) {
  let sql = `
    SELECT u.*,
           b.bank_name, b.account_number, b.account_holder
    FROM users u
    LEFT JOIN bank_accounts b ON b.user_id = u.id
    WHERE u.telegram_id > 0
  `;

  const params: any[] = [];
  if (searchQuery && searchQuery.trim()) {
    const term = `%${searchQuery.trim()}%`;
    sql += ` AND (u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.username ILIKE $1 OR CAST(u.telegram_id AS TEXT) ILIKE $1)`;
    params.push(term);
  }

  sql += ` ORDER BY u.created_at DESC LIMIT 100`;

  const res = await query(sql, params);
  return res.rows;
}

export async function adjustUserCoins(userId: number, coinAmount: number, reason?: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('Khách hàng không tồn tại');
    }

    if (userRes.rows[0].coins + coinAmount < 0) throw new Error('Không thể điều chỉnh số dư xuống dưới 0');
    await client.query("SELECT set_config('app.coin_reason', 'admin_adjustment', true)");
    const updatedUser = await client.query<User>(
      'UPDATE users SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [coinAmount, userId]
    );

    // Record adjustment transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, payment_method, amount, coins, status, memo)
       VALUES ($1, $2, 'admin_manual', $3, $4, 'approved', $5)`,
      [userId, coinAmount >= 0 ? 'deposit' : 'withdraw', Math.abs(coinAmount), Math.abs(coinAmount), reason || 'Admin điều chỉnh số dư']
    );

    await client.query('COMMIT');
    return updatedUser.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function toggleBlockUser(userId: number) {
  const res = await query<User>(
    'UPDATE users SET is_blocked = NOT is_blocked, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
    [userId]
  );
  if (res.rows.length === 0) {
    throw new Error('Khách hàng không tồn tại');
  }
  return res.rows[0];
}

export async function toggleCompanyUser(userId: number) {
  const res = await query<User>(
    'UPDATE users SET is_company_account = NOT COALESCE(is_company_account, FALSE), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
    [userId]
  );
  if (res.rows.length === 0) {
    throw new Error('Khách hàng không tồn tại');
  }
  return res.rows[0];
}

// ----------------------------------------------------------------------
// GAME & WIN/LOSS STATISTICS APIs
// ----------------------------------------------------------------------
export async function getGameStats() {
  const userStats = await query(`
    SELECT COUNT(*) as total_users,
           COALESCE(SUM(coins), 0) as total_coins,
           COALESCE(SUM(wins), 0) as total_wins,
           COALESCE(SUM(losses), 0) as total_losses,
           COALESCE(SUM(draws), 0) as total_draws
    FROM users
    WHERE telegram_id > 0
  `);

  const matchStats = await query(`
    SELECT COUNT(*) as total_matches
    FROM matches m
    JOIN users u ON m.player_id = u.id
    WHERE u.telegram_id > 0
  `);

  const rakeStats = await query(`
    SELECT COALESCE(SUM(fee_amount), 0) as total_rake_collected,
           COUNT(*) as total_rooms_played
    FROM room_rounds
    WHERE status = 'completed'
  `);

  const recentMatches = await query(`
    SELECT m.*, 
           u.first_name as player_name, u.telegram_id as player_tg_id
    FROM matches m
    JOIN users u ON m.player_id = u.id
    WHERE u.telegram_id > 0
    ORDER BY m.created_at DESC
    LIMIT 30
  `);

  const u = userStats.rows[0] || {};
  const m = matchStats.rows[0] || {};
  const r = rakeStats.rows[0] || {};

  let totalCommissionsPaid = 0;
  try {
    const commissionStats = await query(`
      SELECT COALESCE(SUM(amount), 0) as total_commissions
      FROM referral_commissions
      WHERE round_no IS NOT NULL
    `);
    totalCommissionsPaid = Number(commissionStats.rows[0]?.total_commissions || 0);
  } catch (e) {}

  let totalBotCompanySurplus = 0;
  try {
    const surplusStats = await query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN NOT r.host_is_house
                 AND r.guest_is_house THEN
              CASE 
                WHEN r.winner_id = r.guest_id THEN r.bet_amount - r.fee_amount
                WHEN r.winner_id = r.host_id THEN -r.bet_amount
                ELSE 0
              END
            WHEN r.host_is_house
                 AND NOT r.guest_is_house THEN
              CASE 
                WHEN r.winner_id = r.host_id THEN r.bet_amount - r.fee_amount
                WHEN r.winner_id = r.guest_id THEN -r.bet_amount
                ELSE 0
              END
            WHEN r.host_is_house AND r.guest_is_house THEN -r.fee_amount
            ELSE 0
          END
        ), 0) AS total_surplus
      FROM room_rounds r
      JOIN users h ON r.host_id = h.id
      LEFT JOIN users g ON r.guest_id = g.id
      WHERE r.status = 'completed' AND r.bet_amount > 0
    `);
    totalBotCompanySurplus = Number(surplusStats.rows[0]?.total_surplus || 0);
  } catch (e) {
    console.error('Lỗi tính tiền dư bot/công ty:', e);
  }

  const totalRakeCollected = Number(r.total_rake_collected || 0);
  const netHouseProfit = totalRakeCollected + totalBotCompanySurplus - totalCommissionsPaid;

  const totalGames = Number(u.total_wins || 0) + Number(u.total_losses || 0) + Number(u.total_draws || 0);
  const winRate = totalGames > 0 ? ((Number(u.total_wins || 0) / totalGames) * 100).toFixed(1) : '0';

  return {
    accountingSince: (await query('SELECT applied_at FROM schema_migrations WHERE version = 2')).rows[0]?.applied_at,
    totalUsers: Number(u.total_users || 0),
    totalCoins: Number(u.total_coins || 0),
    totalWins: Number(u.total_wins || 0),
    totalLosses: Number(u.total_losses || 0),
    totalDraws: Number(u.total_draws || 0),
    winRatePercent: Number(winRate),
    totalMatches: Number(m.total_matches || 0),
    totalRakeCollected,
    totalCommissionsPaid,
    totalBotCompanySurplus,
    netHouseProfit,
    totalRoomsPlayed: Number(r.total_rooms_played || 0),
    recentMatches: recentMatches.rows,
  };
}

// ----------------------------------------------------------------------
// PAYMENT CONFIG MANAGEMENT APIs
// ----------------------------------------------------------------------
export const getPaymentConfig = readSettings;

export async function updatePaymentConfig(input: unknown) {
  const data = paymentConfigSchema.parse(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [name, value] of Object.entries(data)) {
      if (name in settingKeys && value !== undefined) {
        const key = settingKeys[name as keyof typeof settingKeys][0];
        await client.query('INSERT INTO system_settings(key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP', [key, String(value)]);
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return readSettings();
}

export async function clearAllSystemData(defaultCoins: number = 0): Promise<{ success: boolean; message: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Temporarily disable triggers for system data reset operation
    await client.query('ALTER TABLE coin_ledger DISABLE TRIGGER immutable_coin_ledger');
    await client.query('ALTER TABLE users DISABLE TRIGGER users_coin_audit');
    await client.query('ALTER TABLE room_rounds DISABLE TRIGGER immutable_completed_round');

    // 1. Delete all match history, room rounds, rooms, transactions, commissions, daily rewards and ledger history
    await client.query('DELETE FROM matches');
    await client.query('DELETE FROM room_rounds');
    await client.query('DELETE FROM rooms');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM referral_commissions');
    await client.query('DELETE FROM daily_rewards');
    await client.query('DELETE FROM coin_ledger');

    // 2. Reset user statistics, wager amount, VIP levels and balances to defaultCoins
    await client.query(
      `UPDATE users
       SET coins = $1,
           total_wager_amount = 0,
           vip_level = 0,
           wins = 0,
           losses = 0,
           draws = 0,
           total_matches = 0,
           current_streak = 0,
           best_streak = 0,
           last_vip_reward_claimed_month = NULL,
           updated_at = CURRENT_TIMESTAMP`,
      [Math.max(0, defaultCoins)]
    );

    // 3. Insert baseline record into coin_ledger
    await client.query(
      `INSERT INTO coin_ledger(user_id, delta, balance_after, reason)
       SELECT id, coins, coins, 'system_reset_baseline' FROM users`
    );

    // Re-enable triggers
    await client.query('ALTER TABLE coin_ledger ENABLE TRIGGER immutable_coin_ledger');
    await client.query('ALTER TABLE users ENABLE TRIGGER users_coin_audit');
    await client.query('ALTER TABLE room_rounds ENABLE TRIGGER immutable_completed_round');

    await client.query('COMMIT');
    return {
      success: true,
      message: `Đã làm sạch toàn bộ dữ liệu chạy thử thành công! Tất cả thống kê và số dư đã được reset về ${defaultCoins} Xu.`,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    try {
      await client.query('ALTER TABLE coin_ledger ENABLE TRIGGER immutable_coin_ledger');
      await client.query('ALTER TABLE users ENABLE TRIGGER users_coin_audit');
      await client.query('ALTER TABLE room_rounds ENABLE TRIGGER immutable_completed_round');
    } catch (_) {}
    throw new Error(`Làm sạch dữ liệu thất bại: ${error.message}`);
  } finally {
    client.release();
  }
}

export async function deleteUser(userId: number) {
  const res = await query('UPDATE users SET is_blocked = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, first_name, username', [userId]);
  if (!res.rows.length) throw new Error('Tài khoản không tồn tại');
  return res.rows[0];
}
