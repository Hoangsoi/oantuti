import { Request, Response } from 'express';
import { getUserVipInfo, claimMonthlyVipReward, getAllVipConfigs, updateVipConfigs } from '../services/vip.service';

export async function getUserVipInfoHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const info = await getUserVipInfo(userId);
    res.json({ success: true, data: info });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không thể lấy thông tin VIP' });
  }
}

export async function claimMonthlyVipRewardHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const result = await claimMonthlyVipReward(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không thể nhận thưởng VIP hàng tháng' });
  }
}

export async function getAdminVipConfigsHandler(req: Request, res: Response): Promise<void> {
  try {
    const configs = await getAllVipConfigs();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không thể lấy cấu hình VIP' });
  }
}

export async function updateAdminVipConfigsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { configs } = req.body;
    if (!Array.isArray(configs)) {
      res.status(400).json({ success: false, message: 'Dữ liệu cấu hình VIP không hợp lệ' });
      return;
    }
    const updated = await updateVipConfigs(configs);
    res.json({ success: true, data: updated, message: 'Đã cập nhật cấu hình 30 cấp VIP thành công!' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không thể cập nhật cấu hình VIP' });
  }
}
