import { query, pool } from '../database';
import { readSettings } from './settings.service';
import { depositCoins, USDT_RATE } from '../utils/money';
import { BankAccount, Transaction, AdminPaymentInfo, User } from '../types';
import { sendTelegramAdminNotification } from '../utils/telegram';

export async function getAdminPaymentInfo(): Promise<AdminPaymentInfo> {
  const settings = await readSettings();
  return { ...settings, usdtNetwork: 'TRC20', usdtRate: USDT_RATE, bankRate: 1 };
}

export async function getWalletInfo(userId: number) {
  const bankRes = await query<BankAccount>('SELECT * FROM bank_accounts WHERE user_id = $1', [userId]);
  const txRes = await query<Transaction>('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [userId]);

  return {
    bankAccount: bankRes.rows[0] || null,
    transactions: txRes.rows,
    adminPayment: await getAdminPaymentInfo(),
  };
}

export async function linkBankAccount(
  userId: number,
  bankName: string,
  accountNumber: string,
  accountHolder: string,
  usdtAddress?: string
): Promise<BankAccount> {
  const cleanBank = bankName.trim();
  const cleanNumber = accountNumber.trim();
  const cleanHolder = accountHolder.trim().toUpperCase();
  const cleanUsdt = usdtAddress ? usdtAddress.trim() : null;

  if (!cleanBank || !cleanNumber || !cleanHolder) {
    throw new Error('Vui lòng nhập đầy đủ thông tin ngân hàng');
  }

  const res = await query<BankAccount>(
    `INSERT INTO bank_accounts (user_id, bank_name, account_number, account_holder, usdt_address)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
     SET bank_name = EXCLUDED.bank_name,
         account_number = EXCLUDED.account_number,
         account_holder = EXCLUDED.account_holder,
         usdt_address = COALESCE(EXCLUDED.usdt_address, bank_accounts.usdt_address),
         updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, cleanBank, cleanNumber, cleanHolder, cleanUsdt]
  );

  return res.rows[0];
}

export async function createDepositRequest(
  userId: number,
  method: 'bank' | 'usdt',
  amount: number,
  memo: string
): Promise<Transaction> {
  const coins = depositCoins(method, amount);
  const payment = await getAdminPaymentInfo();
  if (method === 'bank' ? !payment.accountNumber || !payment.bankName || !payment.accountHolder : !payment.usdtAddress) {
    throw new Error('Phương thức nạp chưa được cấu hình');
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
  if (!Number.isSafeInteger(coinsAmount) || coinsAmount < 10000 || coinsAmount > 100000000) {
    throw new Error('Mức rút tối thiểu là 10,000 Xu Game');
  }

  const adminPayment = await getAdminPaymentInfo();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check user balance with lock
    const userRes = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('Người dùng không tồn tại');
    }

    const user = userRes.rows[0];
    if (user.is_blocked) throw new Error('Tài khoản đã bị khóa');
    await client.query("SELECT set_config('app.coin_reason', 'withdrawal_hold', true)");
    if (user.coins < coinsAmount) {
      throw new Error(`Số dư Xu Game của bạn không đủ (${coinsAmount.toLocaleString()} Xu)`);
    }

    const payoutAccount = (await client.query<BankAccount>('SELECT * FROM bank_accounts WHERE user_id = $1', [userId])).rows[0];
    // Snapshot the destination: later profile edits must not change pending requests.
    if (method === 'usdt') {
      if (!payoutAccount?.usdt_address) {
        throw new Error('Vui lòng liên kết địa chỉ ví USDT (TRC20) tại Tab "Tài Khoản" trước khi tạo yêu cầu rút USDT');
      }
    } else {
      if (!payoutAccount) {
        throw new Error('Vui lòng liên kết tài khoản ngân hàng tại Tab "Tài Khoản" trước khi tạo yêu cầu rút tiền');
      }
    }

    let fiatOrUsdtAmount = coinsAmount;
    if (method === 'usdt') {
      const grossUsdt = coinsAmount / adminPayment.usdtRate;
      const feeUsdt = 2; // Fixed 2 USDT network/withdrawal fee
      if (grossUsdt <= feeUsdt) {
        throw new Error('Số Xu rút quá ít không đủ chi trả phí mạng rút 2 USDT. Vui lòng rút số Xu lớn hơn!');
      }
      fiatOrUsdtAmount = grossUsdt - feeUsdt;
    }

    // Deduct coins from user balance
    const updatedUserRes = await client.query<User>(
      'UPDATE users SET coins = coins - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [coinsAmount, userId]
    );

    // Create withdrawal transaction record
    const txRes = await client.query<Transaction>(
      `INSERT INTO transactions (user_id, type, payment_method, amount, coins, status, memo, payout_details)
       VALUES ($1, 'withdraw', $2, $3, $4, 'pending', $5, $6)
       RETURNING *`,
      [userId, method, fiatOrUsdtAmount, coinsAmount, `RUT XU_${userId}_${Date.now().toString().slice(-4)}`, JSON.stringify(payoutAccount)]
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
