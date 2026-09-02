import { z } from 'zod';

export const authSchema = z.object({
  initData: z.string().optional(),
  refCode: z.string().max(50).optional(),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const playGameSchema = z.object({
  move: z.enum(['rock', 'paper', 'scissors']),
});

export const createRoomSchema = z.object({
  betAmount: z.number().int().min(0).max(1000000, 'Mức cược tối đa 1,000,000 Xu'),
  roomName: z.string().max(100).optional(),
  password: z.string().max(20).optional(),
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(6, 'Mã phòng phải có 6 chữ số'),
  password: z.string().max(20).optional(),
});

export const roomMoveSchema = z.object({
  move: z.enum(['rock', 'paper', 'scissors']),
});

export const linkBankSchema = z.object({
  bankName: z.string().min(2, 'Tên ngân hàng từ 2 ký tự').max(100),
  accountNumber: z.string().min(3, 'Số tài khoản từ 3 ký tự').max(30),
  accountHolder: z.string().min(2, 'Tên chủ tài khoản từ 2 ký tự').max(100),
});

export const depositSchema = z.object({
  method: z.enum(['bank', 'usdt']),
  amount: z.number().positive('Số tiền phải lớn hơn 0').max(100000000, 'Số tiền quá lớn'),
  memo: z.string().max(200).optional(),
});

export const withdrawSchema = z.object({
  method: z.enum(['bank', 'usdt']),
  coinsAmount: z.number().int().min(1000, 'Mức rút tối thiểu 1,000 Xu').max(100000000, 'Số Xu rút quá lớn'),
});

export const claimRewardSchema = z.object({
  rewardType: z.string().min(1).max(50),
});

export const adjustCoinsSchema = z.object({
  amount: z.number().int(),
  reason: z.string().max(200).optional(),
});
