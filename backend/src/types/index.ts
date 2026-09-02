export type Move = 'rock' | 'paper' | 'scissors';
export type GameResult = 'win' | 'lose' | 'draw';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  rating: number;
  coins: number;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  current_streak: number;
  best_streak: number;
  referral_code: string;
  referred_by: number | null;
  is_blocked?: boolean;
  is_company_account?: boolean;
  total_wager_amount?: number;
  vip_level?: number;
  last_vip_reward_claimed_month?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VipConfig {
  vip_level: number;
  min_wager: number;
  monthly_reward: number;
  updated_at?: Date;
}

export interface Match {
  id: number;
  player_id: number;
  opponent_type: string;
  player_move: Move;
  opponent_move: Move;
  result: GameResult;
  rating_before: number;
  rating_change: number;
  rating_after: number;
  coins_change?: number;
  created_at: Date;
}

export interface Room {
  id: number;
  room_code: string;
  host_id: number;
  guest_id: number | null;
  host_move: Move | null;
  guest_move: Move | null;
  bet_amount: number;
  fee_amount: number;
  status: 'waiting' | 'ready' | 'completed' | 'expired';
  winner_id: number | null;
  result: GameResult | null;
  rating_change: number;
  created_at: Date;
  updated_at: Date;
  host_name?: string;
  host_avatar?: string;
  guest_name?: string;
  guest_avatar?: string;
  has_host_locked?: boolean;
  has_guest_locked?: boolean;
  is_bot_room?: boolean;
  room_name?: string;
  has_password?: boolean;
  password?: string | null;
  spectator_count?: number;
}

export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  usdt_address?: string | null;
  created_at: Date;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'deposit' | 'withdraw';
  payment_method: 'bank' | 'usdt';
  amount: number;
  coins: number;
  status: 'pending' | 'approved' | 'rejected';
  memo: string | null;
  admin_note: string | null;
  created_at: Date;
}

export interface AdminPaymentInfo {
  adminTelegramUsername?: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  usdtAddress: string;
  usdtNetwork: string;
  usdtRate: number; // e.g. 1 USDT = 25000 Xu
  bankRate: number; // e.g. 1000 VNĐ = 1000 Xu
  qrCodeUrl?: string;
}

export interface ReferralTierStat {
  level: number;
  count: number;
  ratePercent: string;
  commissionCoins: number;
}

export interface ReferralStat {
  totalReferrals: number;
  totalCommissions: number;
  referralCode: string;
  referralLink: string;
  tiers: ReferralTierStat[];
  referredUsers: {
    id: number;
    first_name: string;
    username: string | null;
    rating: number;
    created_at: Date;
  }[];
}

export interface DailyRewardTask {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  rewardCoins?: number;
  isClaimed: boolean;
  isCompleted: boolean;
  progressText?: string;
}

export interface AuthJwtPayload {
  userId: number;
  telegramId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
