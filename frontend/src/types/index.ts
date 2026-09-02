export type Move = 'rock' | 'paper' | 'scissors';
export type GameResult = 'win' | 'lose' | 'draw';

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
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
  created_at: string;
  updated_at: string;
  host_name?: string;
  host_avatar?: string;
  guest_name?: string;
  guest_avatar?: string;
  has_host_locked?: boolean;
  has_guest_locked?: boolean;
  is_bot_room?: boolean;
}

export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string;
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
  created_at: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  telegram_id?: number;
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
}

export interface AdminPaymentInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  usdtAddress: string;
  usdtNetwork: string;
  usdtRate: number;
  bankRate: number;
  qrCodeUrl?: string;
}

export interface WalletData {
  bankAccount: BankAccount | null;
  transactions: Transaction[];
  adminPayment: AdminPaymentInfo;
}

export interface LeaderboardEntry {
  rank: number;
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface LeaderboardData {
  period: string;
  top: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
}

export interface ReferralStat {
  totalReferrals: number;
  referralCode: string;
  referralLink: string;
  referredUsers: {
    id: number;
    first_name: string;
    username: string | null;
    rating: number;
    created_at: string;
  }[];
}

export interface DailyRewardTask {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  isClaimed: boolean;
  isCompleted: boolean;
  progressText?: string;
}

export type ActivePage = 'home' | 'game' | 'result' | 'leaderboard' | 'profile' | 'rewards' | 'referral' | 'room' | 'wallet' | 'admin' | 'lobby';
