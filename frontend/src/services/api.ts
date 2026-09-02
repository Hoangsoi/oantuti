import { LeaderboardData, Match, Move, ReferralStat, DailyRewardTask, User, Room, WalletData, BankAccount, Transaction } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let authToken: string | null = localStorage.getItem('oantuti_token');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('oantuti_token', token);
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Đã có lỗi kết nối đến máy chủ');
  }

  return json.data;
}

export const api = {
  authTelegram: async (initData: string, refCode?: string) => {
    const data = await request<{ token: string; user: User }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData, refCode }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  getMe: async () => {
    return request<User>('/me');
  },

  topupCoins: async (amount: number) => {
    return request<User>('/me/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  playGame: async (move: Move) => {
    return request<{ match: Match; updatedUser: User }>('/game/play', {
      method: 'POST',
      body: JSON.stringify({ move }),
    });
  },

  getLeaderboard: async (period: 'all' | 'today' | 'week' = 'all') => {
    return request<LeaderboardData>(`/leaderboard?period=${period}`);
  },

  getMatches: async (limit: number = 20) => {
    return request<Match[]>(`/matches?limit=${limit}`);
  },

  getReferrals: async () => {
    return request<ReferralStat>('/referral');
  },

  getRewards: async () => {
    return request<DailyRewardTask[]>('/rewards');
  },

  claimReward: async (rewardType: string) => {
    return request<{ task: DailyRewardTask; updatedUser: User }>('/rewards/claim', {
      method: 'POST',
      body: JSON.stringify({ rewardType }),
    });
  },

  // Room APIs
  createRoom: async (betAmount: number = 0) => {
    return request<Room>('/room/create', {
      method: 'POST',
      body: JSON.stringify({ betAmount }),
    });
  },

  joinRoom: async (roomCode: string) => {
    return request<Room>('/room/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    });
  },

  getRoomState: async (roomCode: string) => {
    return request<Room>(`/room/${roomCode}`);
  },

  playRoomMove: async (roomCode: string, move: Move) => {
    return request<Room>(`/room/${roomCode}/move`, {
      method: 'POST',
      body: JSON.stringify({ move }),
    });
  },

  // Wallet APIs
  getWalletInfo: async () => {
    return request<WalletData>('/wallet/info');
  },

  linkBankAccount: async (bankName: string, accountNumber: string, accountHolder: string) => {
    return request<BankAccount>('/wallet/link-bank', {
      method: 'POST',
      body: JSON.stringify({ bankName, accountNumber, accountHolder }),
    });
  },

  deposit: async (method: 'bank' | 'usdt', amount: number, memo: string) => {
    return request<Transaction>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ method, amount, memo }),
    });
  },

  withdraw: async (method: 'bank' | 'usdt', coinsAmount: number) => {
    return request<{ transaction: Transaction; updatedUser: User }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ method, coinsAmount }),
    });
  },

  // Admin Approval APIs
  getAdminPendingTransactions: async () => {
    return request<Transaction[]>('/admin/pending');
  },

  approveAdminTransaction: async (txId: number) => {
    return request<Transaction>(`/admin/approve/${txId}`, {
      method: 'POST',
    });
  },

  rejectAdminTransaction: async (txId: number, note?: string) => {
    return request<Transaction>(`/admin/reject/${txId}`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },
};
