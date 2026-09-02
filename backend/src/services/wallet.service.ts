import { query, pool } from '../database';
import { BankAccount, Transaction, AdminPaymentInfo, User } from '../types';
import { sendTelegramAdminNotification } from '../utils/telegram';

export function getAdminPaymentInfo(): AdminPaymentInfo {
  return {
    bankName: process.env.ADMIN_BANK_NAME || 'MBBank (Ngân Hàng Quân Đội)',
    accountNumber: process.env.ADMIN_BANK_ACCOUNT || '999988889999',
    accountHolder: process.env.ADMIN_BANK_HOLDER || 'OAN TU TI OFFICIAL',
    usdtAddress: process.env.ADMIN_USDT_ADDRESS || 'T9yD14Nj9j7xQvL894K1mP5xZ7W8qM3v',
    usdtNetwork: 'TRC20',
    usdtRate: 25000, // 1 USDT = 25,000 Xu Game
    bankRate: 1,     // 1,000 VNĐ = 1,000 Xu Game
  };
}

export async function getWalletInfo(userId: number) {
  const bankRes = await query<BankAccount>('SELECT * FROM bank_accounts WHERE user_id = $1', [userId]);
  const txRes = await query<Transaction>('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [userId]);

  return {
    bankAccount: bankRes.rows[0] || null,
    transactions: txRes.rows,
    adminPayment: getAdminPaymentInfo(),
  };
}

export async function linkBankAccount(userId: number, bankName: string, accountNumber: string, accountHolder: string): Promise<BankAccount> {
  const cleanBank = bankName.trim();
  const cleanNumber = accountNumber.trim();
  const cleanHolder = accountHolder.trim().toUpperCase();

  if (!cleanBank || !cleanNumber || !cleanHolder) {
    throw new Error('Vui lòng nhập đầy đủ thông tin ngân hàng');
  }

  const res = await query<BankAccount>(
    `INSERT INTO bank_accounts (user_id, bank_name, account_number, account_holder)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
     SET bank_name = EXCLUDED.bank_name,
         account_number = EXCLUDED.account_number,
         account_holder = EXCLUDED.account_holder,
         updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, cleanBank, cleanNumber, cleanHolder]
  );

  return res.rows[0];
}

export async function createDepositRequest(
  userId: number,
  method: 'bank' | 'usdt',
  amount: number,
  memo: string
): Promise<Transaction> {
  if (amount <= 0) {
    throw new Error('Số tiền nạp phải lớn hơn 0');
  }

  const adminPayment = getAdminPaymentInfo();
  let coins = 0;
  if (method === 'usdt') {
    coins = Math.floor(amount * adminPayment.usdtRate);
  } else {
    coins = Math.floor(amount);
  }

  const cleanMemo = memo.trim() || `NAP XU_${userId}_${Date.now().toString().slice(-4)}`;

  const res = await query<Transaction>(
    `INSERT INTO transactions (user_id, type, payment_method, amount, coins, status, memo)
     VALUES ($1, 'deposit', $2, $3, $4, 'pending', $5)
     RETURNING *`,
    [userId, method, amount, coins, cleanMemo]
  );

  const tx = res.rows[0];

  // Fetch user profile & send automatic bot notification to Admin Telegram inbox
  try {
    const userRes = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      sendTelegramAdminNotification(tx, userRes.rows[0]);
    }
  } catch (err) {
    console.error('Failed to trigger admin notification:', err);
  }

  return tx;
}

export async function createWithdrawRequest(
  userId: number,
  method: 'bank' | 'usdt',
  coinsAmount: number
): Promise<{ transaction: Transaction; updatedUser: User }> {
  if (coinsAmount < 1000) {
    throw new Error('Mức rút tối thiểu là 1,000 Xu Game');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check user balance with lock
    const userRes = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('Người dùng không tồn tại');
    }

    const user = userRes.rows[0];
    if (user.coins < coinsAmount) {
      throw new Error(`Số dư Xu Game của bạn không đủ (${coinsAmount.toLocaleString()} Xu)`);
    }

    // If method is bank, verify bank account exists
    if (method === 'bank') {
      const bankRes = await client.query('SELECT id FROM bank_accounts WHERE user_id = $1', [userId]);
      if (bankRes.rows.length === 0) {
        throw new Error('Vui lòng liên kết tài khoản ngân hàng trước khi tạo yêu cầu rút tiền');
      }
    }

    const adminPayment = getAdminPaymentInfo();
    let fiatOrUsdtAmount = coinsAmount;
    if (method === 'usdt') {
      fiatOrUsdtAmount = coinsAmount / adminPayment.usdtRate;
    }

    // Deduct coins from user balance
    const updatedUserRes = await client.query<User>(
      'UPDATE users SET coins = coins - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [coinsAmount, userId]
    );

    // Create withdrawal transaction record
    const txRes = await client.query<Transaction>(
      `INSERT INTO transactions (user_id, type, payment_method, amount, coins, status, memo)
       VALUES ($1, 'withdraw', $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [userId, method, fiatOrUsdtAmount, coinsAmount, `RUT XU_${userId}_${Date.now().toString().slice(-4)}`]
    );

    await client.query('COMMIT');

    const createdTx = txRes.rows[0];
    const updatedUser = updatedUserRes.rows[0];

    // Trigger auto Telegram Admin notification
    try {
      sendTelegramAdminNotification(createdTx, user);
    } catch (err) {
      console.error('Failed to trigger admin notification for withdraw:', err);
    }

    return {
      transaction: createdTx,
      updatedUser: updatedUser,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
