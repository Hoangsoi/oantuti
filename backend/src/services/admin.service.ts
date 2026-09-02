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
  let adminUser: User;

  if (adminUserRes.rows.length === 0) {
    const insertRes = await query<User>(
      `INSERT INTO users (telegram_id, first_name, last_name, username, rating, coins, referral_code)
       VALUES ($1, 'Admin_2026', 'Official', 'ottadmin2026', 1000, 999999, 'REF_ADMIN_8780377211')
       RETURNING *`,
      [adminTgId]
    );
    adminUser = insertRes.rows[0];
  } else {
    adminUser = adminUserRes.rows[0];
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
  `;

  const params: any[] = [];
  if (searchQuery && searchQuery.trim()) {
    const term = `%${searchQuery.trim()}%`;
    sql += ` WHERE u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.username ILIKE $1 OR CAST(u.telegram_id AS TEXT) ILIKE $1`;
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
  `);

  const matchStats = await query(`
    SELECT COUNT(*) as total_matches
    FROM matches
  `);

  const rakeStats = await query(`
    SELECT COALESCE(SUM(fee_amount), 0) as total_rake_collected,
           COUNT(*) as total_rooms_played
    FROM rooms
    WHERE status = 'finished'
  `);

  const recentMatches = await query(`
    SELECT m.*, 
           u.first_name as player_name, u.telegram_id as player_tg_id
    FROM matches m
    JOIN users u ON m.player_id = u.id
    ORDER BY m.created_at DESC
    LIMIT 30
  `);

  const u = userStats.rows[0] || {};
  const m = matchStats.rows[0] || {};
  const r = rakeStats.rows[0] || {};

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
    totalRakeCollected: Number(r.total_rake_collected || 0),
    totalRoomsPlayed: Number(r.total_rooms_played || 0),
    recentMatches: recentMatches.rows,
  };
}

// ----------------------------------------------------------------------
// PAYMENT CONFIG MANAGEMENT APIs
// ----------------------------------------------------------------------
export async function getPaymentConfig() {
  return {
    adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '8780377211',
    adminTelegramUsername: process.env.ADMIN_TELEGRAM_USERNAME || 'ottadmin2026',
    bankName: process.env.ADMIN_BANK_NAME || 'MBBank (Ngân Hàng Quân Đội)',
    accountNumber: process.env.ADMIN_BANK_ACCOUNT || '999988889999',
    accountHolder: process.env.ADMIN_BANK_HOLDER || 'OAN TU TI OFFICIAL',
    usdtAddress: process.env.ADMIN_USDT_ADDRESS || 'T9yD14Nj9j7xQvL894K1mP5xZ7W8qM3v',
    qrCodeUrl: process.env.ADMIN_QR_CODE_URL || '',
  };
}

export async function updatePaymentConfig(data: {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  usdtAddress?: string;
  adminTelegramUsername?: string;
  qrCodeUrl?: string;
}) {
  if (data.bankName !== undefined) process.env.ADMIN_BANK_NAME = data.bankName;
  if (data.accountNumber !== undefined) process.env.ADMIN_BANK_ACCOUNT = data.accountNumber;
  if (data.accountHolder !== undefined) process.env.ADMIN_BANK_HOLDER = data.accountHolder;
  if (data.usdtAddress !== undefined) process.env.ADMIN_USDT_ADDRESS = data.usdtAddress;
  if (data.adminTelegramUsername !== undefined) process.env.ADMIN_TELEGRAM_USERNAME = data.adminTelegramUsername;
  if (data.qrCodeUrl !== undefined) process.env.ADMIN_QR_CODE_URL = data.qrCodeUrl;

  return getPaymentConfig();
}
