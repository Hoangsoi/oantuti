import { query, pool } from '../database';
import { Transaction, User } from '../types';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export async function loginAdminUser(usernameInput: string, passwordInput: string) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123@';
  const adminTgId = parseInt(process.env.ADMIN_TELEGRAM_ID || '8780377211', 10);

  if (usernameInput.trim() !== adminUsername || passwordInput.trim() !== adminPassword) {
    throw new Error('Tài khoản hoặc mật khẩu Admin không chính xác!');
  }

  // Find or create admin user record in database
  let adminUserRes = await query<User>('SELECT * FROM users WHERE telegram_id = $1', [adminTgId]);
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
            b.bank_name, b.account_number, b.account_holder
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
           b.bank_name, b.account_number, b.account_holder
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

    const updatedUser = await client.query<User>(
      'UPDATE users SET coins = GREATEST(0, coins + $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_company_account BOOLEAN DEFAULT FALSE');
  } catch (e) {}

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
    FROM rooms
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
    `);
    totalCommissionsPaid = Number(commissionStats.rows[0]?.total_commissions || 0);
  } catch (e) {}

  const totalRakeCollected = Number(r.total_rake_collected || 0);
  const netHouseProfit = Math.max(0, totalRakeCollected - totalCommissionsPaid);

  const totalGames = Number(u.total_wins || 0) + Number(u.total_losses || 0) + Number(u.total_draws || 0);
  const winRate = totalGames > 0 ? ((Number(u.total_wins || 0) / totalGames) * 100).toFixed(1) : '0';

  return {
    totalUsers: Number(u.total_users || 0),
    totalCoins: Number(u.total_coins || 0),
    totalWins: Number(u.total_wins || 0),
    totalLosses: Number(u.total_losses || 0),
    totalDraws: Number(u.total_draws || 0),
    winRatePercent: Number(winRate),
    totalMatches: Number(m.total_matches || 0),
    totalRakeCollected,
    totalCommissionsPaid,
    netHouseProfit,
    totalRoomsPlayed: Number(r.total_rooms_played || 0),
    recentMatches: recentMatches.rows,
  };
}

// ----------------------------------------------------------------------
// PAYMENT CONFIG MANAGEMENT APIs
// ----------------------------------------------------------------------
export async function getPaymentConfig() {
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(64) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM system_settings');
  const settingsMap: Record<string, string> = {};
  rows.rows.forEach(r => { settingsMap[r.key] = r.value; });

  const adminTelegramUsername = settingsMap['admin_telegram_username'] || process.env.ADMIN_TELEGRAM_USERNAME || 'ottadmin2026';
  const bankName = settingsMap['bank_name'] || process.env.ADMIN_BANK_NAME || 'MBBank (Ngân Hàng Quân Đội)';
  const accountNumber = settingsMap['account_number'] || process.env.ADMIN_BANK_ACCOUNT || '999988889999';
  const accountHolder = settingsMap['account_holder'] || process.env.ADMIN_BANK_HOLDER || 'OAN TU TI OFFICIAL';
  const usdtAddress = settingsMap['usdt_address'] || process.env.ADMIN_USDT_ADDRESS || 'T9yD14Nj9j7xQvL894K1mP5xZ7W8qM3v';
  const qrCodeUrl = settingsMap['qr_code_url'] || process.env.ADMIN_QR_CODE_URL || '';
  const botWinRate = settingsMap['bot_win_rate'] ? parseInt(settingsMap['bot_win_rate'], 10) : parseInt(process.env.BOT_WIN_RATE || '70', 10);

  return {
    adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '8780377211',
    adminTelegramUsername,
    bankName,
    accountNumber,
    accountHolder,
    usdtAddress,
    qrCodeUrl,
    botWinRate,
  };
}

export async function updatePaymentConfig(data: {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  usdtAddress?: string;
  adminTelegramUsername?: string;
  qrCodeUrl?: string;
  botWinRate?: number;
}) {
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(64) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  const upsertSetting = async (key: string, value: string) => {
    await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  };

  if (data.adminTelegramUsername !== undefined) {
    const cleanUsername = data.adminTelegramUsername.replace('@', '').trim();
    process.env.ADMIN_TELEGRAM_USERNAME = cleanUsername;
    await upsertSetting('admin_telegram_username', cleanUsername);

    const adminTgId = parseInt(process.env.ADMIN_TELEGRAM_ID || '8780377211', 10);
    try {
      await query(
        'UPDATE users SET username = $1, first_name = $2, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $3',
        [cleanUsername, cleanUsername, adminTgId]
      );
    } catch (e) {}
  }

  if (data.bankName !== undefined) {
    process.env.ADMIN_BANK_NAME = data.bankName;
    await upsertSetting('bank_name', data.bankName);
  }
  if (data.accountNumber !== undefined) {
    process.env.ADMIN_BANK_ACCOUNT = data.accountNumber;
    await upsertSetting('account_number', data.accountNumber);
  }
  if (data.accountHolder !== undefined) {
    process.env.ADMIN_BANK_HOLDER = data.accountHolder;
    await upsertSetting('account_holder', data.accountHolder);
  }
  if (data.usdtAddress !== undefined) {
    process.env.ADMIN_USDT_ADDRESS = data.usdtAddress;
    await upsertSetting('usdt_address', data.usdtAddress);
  }
  if (data.qrCodeUrl !== undefined) {
    process.env.ADMIN_QR_CODE_URL = data.qrCodeUrl;
    await upsertSetting('qr_code_url', data.qrCodeUrl);
  }
  if (data.botWinRate !== undefined) {
    process.env.BOT_WIN_RATE = String(data.botWinRate);
    await upsertSetting('bot_win_rate', String(data.botWinRate));
  }

  return getPaymentConfig();
}

// ----------------------------------------------------------------------
// WIPE ALL SYSTEM DATA (TRANSACTIONS, MATCHES, COMMISSIONS, ROOMS)
// ----------------------------------------------------------------------
export async function clearAllSystemData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clear transaction history
    await client.query('DELETE FROM transactions');

    // 2. Clear match history
    await client.query('DELETE FROM matches');

    // 3. Clear referral commissions history
    try {
      await client.query('DELETE FROM referral_commissions');
    } catch (e) {}

    // 4. Clear daily rewards history
    await client.query('DELETE FROM daily_rewards');

    // 5. Clear completed & expired rooms history
    await client.query("DELETE FROM rooms WHERE status IN ('completed', 'expired')");

    // 6. Reset user match counters back to fresh starting values
    await client.query(
      `UPDATE users 
       SET wins = 0, losses = 0, draws = 0, total_matches = 0, current_streak = 0, best_streak = 0, rating = 1000, updated_at = CURRENT_TIMESTAMP`
    );

    await client.query('COMMIT');
    return {
      success: true,
      message: 'Đã dọn sạch 100% lịch sử giao dịch, lịch sử ván chơi và hoa hồng giới thiệu thành công!',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUser(userId: number) {
  const res = await query('DELETE FROM users WHERE id = $1 RETURNING id, first_name, username', [userId]);
  if (res.rows.length === 0) {
    throw new Error('Tài khoản không tồn tại');
  }
  return res.rows[0];
}
