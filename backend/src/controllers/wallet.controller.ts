import { Request, Response } from 'express';
import {
  getWalletInfo,
  linkBankAccount,
  createDepositRequest,
  createWithdrawRequest,
} from '../services/wallet.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getWalletInfoHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const data = await getWalletInfo(req.user.id);
    return sendSuccess(res, data, 'Lấy thông tin ví thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi khi lấy thông tin ví', 400);
  }
}

export async function linkBankHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const { bankName, accountNumber, accountHolder, usdtAddress } = req.body;
    const bankAccount = await linkBankAccount(req.user.id, bankName, accountNumber, accountHolder, usdtAddress);
    return sendSuccess(res, bankAccount, 'Cập nhật thông tin tài khoản thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể liên kết thông tin tài khoản', 400);
  }
}

export async function depositHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const { method, amount, memo } = req.body;
    const tx = await createDepositRequest(req.user.id, method || 'bank', Number(amount), memo || '');
    return sendSuccess(res, tx, 'Tạo yêu cầu nạp tiền thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể tạo yêu cầu nạp tiền', 400);
  }
}

export async function withdrawHandler(req: Request, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Chưa đăng nhập', 401);
    const { method, coinsAmount } = req.body;
    const result = await createWithdrawRequest(req.user.id, method || 'bank', Number(coinsAmount));
    return sendSuccess(res, result, 'Gửi yêu cầu rút tiền thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể gửi yêu cầu rút tiền', 400);
  }
}
