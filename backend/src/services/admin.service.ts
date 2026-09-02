import { query, pool } from '../database';
import { Transaction, User } from '../types';

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
       SET status = 'approved', admin_note = 'Đã duyệt và chuyển khoản bởi Admin', updated_at = CURRENT_TIMESTAMP 
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
