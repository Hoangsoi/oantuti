import { Request, Response } from 'express';
import {
  loginAdminUser,
  getPendingTransactions,
  getAllTransactions,
  approveTransaction,
  rejectTransaction,
  getAllUsers,
  adjustUserCoins,
  toggleBlockUser,
  toggleCompanyUser,
  getGameStats,
  getPaymentConfig,
  updatePaymentConfig,
  clearAllSystemData,
  deleteUser,
} from '../services/admin.service';
import { sendSuccess, sendError } from '../utils/response';

export async function adminLoginHandler(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return sendError(res, 'Vui lòng nhập tài khoản và mật khẩu Admin', 400);
    }

    const result = await loginAdminUser(username, password);
    return sendSuccess(res, result, 'Đăng nhập Admin thành công!');
  } catch (error: any) {
    return sendError(res, error.message || 'Đăng nhập Admin thất bại', 400);
  }
}

export async function getPendingTransactionsHandler(req: Request, res: Response) {
  try {
    const transactions = await getPendingTransactions();
    return sendSuccess(res, transactions, 'Lấy danh sách đơn nạp rút chờ duyệt thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể lấy danh sách đơn chờ duyệt');
  }
}

export async function getAllTransactionsHandler(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const transactions = await getAllTransactions(status as string);
    return sendSuccess(res, transactions, 'Lấy danh sách tất cả lịch sử nạp rút thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể lấy lịch sử nạp rút');
  }
}

export async function approveTransactionHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, 'Mã đơn hàng không hợp lệ', 400);
    }

    const updatedTx = await approveTransaction(id);
    return sendSuccess(res, updatedTx, `Đã duyệt đơn hàng #${id} thành công!`);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể duyệt đơn hàng');
  }
}

export async function rejectTransactionHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, 'Mã đơn hàng không hợp lệ', 400);
    }

    const { adminNote } = req.body;
    const updatedTx = await rejectTransaction(id, adminNote);
    return sendSuccess(res, updatedTx, `Đã từ chối đơn hàng #${id}`);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể từ chối đơn hàng');
  }
}

export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    const { search } = req.query;
    const users = await getAllUsers(search as string);
    return sendSuccess(res, users, 'Lấy danh sách khách hàng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể lấy danh sách khách hàng');
  }
}

export async function adjustUserCoinsHandler(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { amount, reason } = req.body;

    if (isNaN(userId) || typeof amount !== 'number') {
      return sendError(res, 'Thông tin không hợp lệ', 400);
    }

    const updatedUser = await adjustUserCoins(userId, amount, reason);
    return sendSuccess(res, updatedUser, `Đã điều chỉnh số dư thành công (${amount > 0 ? '+' : ''}${amount} Xu)`);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể điều chỉnh số dư');
  }
}

export async function toggleBlockUserHandler(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return sendError(res, 'ID khách hàng không hợp lệ', 400);
    }

    const updatedUser = await toggleBlockUser(userId);
    const statusStr = updatedUser.is_blocked ? 'Đã khóa' : 'Đã mở khóa';
    return sendSuccess(res, updatedUser, `${statusStr} tài khoản khách hàng ID #${userId}`);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể đổi trạng thái tài khoản');
  }
}

export async function toggleCompanyUserHandler(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return sendError(res, 'ID khách hàng không hợp lệ', 400);
    }

    const updatedUser = await toggleCompanyUser(userId);
    const statusStr = updatedUser.is_company_account ? 'Đã gắn cờ Tài Khoản Công Ty' : 'Đã gỡ cờ Tài Khoản Công Ty';
    return sendSuccess(res, updatedUser, `${statusStr} cho ID #${userId}`);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể thay đổi cờ tài khoản công ty');
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return sendError(res, 'ID khách hàng không hợp lệ', 400);
    }

    const deleted = await deleteUser(userId);
    return sendSuccess(res, deleted, `Đã xóa sạch tài khoản ID #${userId} (${deleted.first_name}) ra khỏi hệ thống thành công!`);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể xóa tài khoản người dùng');
  }
}

export async function getGameStatsHandler(req: Request, res: Response) {
  try {
    const stats = await getGameStats();
    return sendSuccess(res, stats, 'Lấy thống kê hệ thống game thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể lấy thống kê hệ thống');
  }
}

export async function getPaymentConfigHandler(req: Request, res: Response) {
  try {
    const configData = await getPaymentConfig();
    return sendSuccess(res, configData, 'Lấy cấu hình thanh toán thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể lấy cấu hình thanh toán');
  }
}

export async function updatePaymentConfigHandler(req: Request, res: Response) {
  try {
    const updatedConfig = await updatePaymentConfig(req.body);
    return sendSuccess(res, updatedConfig, 'Cập nhật cấu hình thanh toán Admin thành công!');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể cập nhật cấu hình thanh toán');
  }
}

export async function clearAllSystemDataHandler(req: Request, res: Response) {
  try {
    const result = await clearAllSystemData();
    return sendSuccess(res, result, result.message);
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể dọn sạch dữ liệu hệ thống');
  }
}
