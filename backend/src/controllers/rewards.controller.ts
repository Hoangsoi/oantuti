import { Request, Response } from 'express';
import { getUserRewards, claimReward } from '../services/rewards.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getRewardsHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const tasks = await getUserRewards(req.user.id);
    return sendSuccess(res, tasks, 'Lấy danh sách phần thưởng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Lỗi lấy phần thưởng', 400);
  }
}

export async function claimRewardHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Không tìm thấy người dùng', 401);
    }
    const { rewardType } = req.body;
    if (!rewardType) {
      return sendError(res, 'Thiếu loại phần thưởng cần nhận', 400);
    }
    const result = await claimReward(req.user.id, rewardType);
    return sendSuccess(res, result, 'Nhận phần thưởng thành công');
  } catch (error: any) {
    return sendError(res, error.message || 'Không thể nhận phần thưởng', 400);
  }
}
