import { Request, Response } from 'express';
import { getPendingTransactions, approveTransaction, rejectTransaction } from '../services/admin.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getPendingTransactionsHandler(req: Request, res: Response) {
  try {
    const list = await getPendingTransactions();
    return sendSuccess(res, list, 'Lấy danh sách đơn chờ duyệt thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi lấy đơn chờ duyệt', 400);
  }
}

export async function approveTransactionHandler(req: Request, res: Response) {
  try {
    const txId = parseInt(req.params.id, 10);
    if (!txId) return sendError(res, 'Mã giao dịch không hợp lệ', 400);
    const updated = await approveTransaction(txId);
    return sendSuccess(res, updated, `Duyệt đơn thành công! Đã tự động cộng ${updated.coins.toLocaleString()} Xu cho khách hàng.`);
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi duyệt đơn', 400);
  }
}

export async function rejectTransactionHandler(req: Request, res: Response) {
  try {
    const txId = parseInt(req.params.id, 10);
    const { note } = req.body;
    if (!txId) return sendError(res, 'Mã giao dịch không hợp lệ', 400);
    const updated = await rejectTransaction(txId, note);
    return sendSuccess(res, updated, 'Từ chối đơn thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi từ chối đơn', 400);
  }
}
