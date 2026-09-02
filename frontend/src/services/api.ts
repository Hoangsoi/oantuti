import { LeaderboardData, Match, Move, ReferralStat, DailyRewardTask, User, Room, WalletData, BankAccount, Transaction } from '../types';

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.endsWith('onrender.com')) {
      return 'https://oantuti-api.onrender.com/api';
    }
  }

  return 'http://localhost:5000/api';
}

const API_BASE_URL = getApiBaseUrl();

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

  const url = `${API_BASE_URL}${endpoint}`;

  // 30 seconds timeout to accommodate Render free tier cold starts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Lỗi máy chủ (${response.status}): ${response.statusText}`);
      }
      throw new Error('Phản hồi máy chủ không hợp lệ (không phải JSON)');
    }

    const json = await response.json();

    if (!response.ok || json.success === false) {
      throw new Error(json.message || `Yêu cầu thất bại (${response.status})`);
    }

    return json.data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error('[API Timeout]', { url });
      throw new Error(`Kết nối API quá thời hạn: ${API_BASE_URL}`);
    }

    // Network errors (Failed to fetch, Load failed, NetworkError)
    if (
      error instanceof TypeError ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Load failed') ||
      error.message?.includes('NetworkError')
    ) {
      console.error('[API Network Error]', { url, originalError: error.message });
      throw new Error(`Không thể kết nối API: ${API_BASE_URL}`);
    }

    throw error;
  }
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

  adminLogin: async (usernameInput: string, passwordInput: string) => {
    const data = await request<{ token: string; user: User }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
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

  getLeaderboard: async (period: 'all' | 'today' | 'week' | 'month' = 'all') => {
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
  getWaitingRooms: async () => {
    return request<Room[]>('/room/waiting');
  },

  createRoom: async (betAmount: number = 0, roomName?: string, password?: string) => {
    return request<Room>('/room/create', {
      method: 'POST',
      body: JSON.stringify({ betAmount, roomName, password }),
    });
  },

  joinRoom: async (roomCode: string, password?: string) => {
    return request<Room>('/room/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode, password }),
    });
  },

  spectateRoom: async (roomCode: string) => {
    return request<Room>(`/room/${roomCode}/spectate`, {
      method: 'POST',
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

  resetRoom: async (roomCode: string) => {
    return request<Room>(`/room/${roomCode}/reset`, {
      method: 'POST',
    });
  },

  leaveRoom: async (roomCode: string) => {
    return request<void>(`/room/${roomCode}/leave`, {
      method: 'POST',
    });
  },

  // Wallet APIs
  getWalletInfo: async () => {
    return request<WalletData>('/wallet/info');
  },

  linkBankAccount: async (bankName: string, accountNumber: string, accountHolder: string, usdtAddress?: string) => {
    return request<BankAccount>('/wallet/link-bank', {
      method: 'POST',
      body: JSON.stringify({ bankName, accountNumber, accountHolder, usdtAddress }),
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

  // Admin Management APIs
  getAdminPendingTransactions: async () => {
    return request<Transaction[]>('/admin/pending');
  },

  getAdminAllTransactions: async (status: string = 'all') => {
    return request<Transaction[]>(`/admin/transactions?status=${status}`);
  },

  approveAdminTransaction: async (txId: number) => {
    return request<Transaction>(`/admin/approve/${txId}`, {
      method: 'POST',
    });
  },

  rejectAdminTransaction: async (txId: number, adminNote?: string) => {
    return request<Transaction>(`/admin/reject/${txId}`, {
      method: 'POST',
      body: JSON.stringify({ adminNote }),
    });
  },

  getAdminUsers: async (search?: string) => {
    const queryStr = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<any[]>(`/admin/users${queryStr}`);
  },

  adjustAdminUserCoins: async (userId: number, amount: number, reason?: string) => {
    return request<User>(`/admin/users/${userId}/adjust-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  },

  toggleBlockAdminUser: async (userId: number) => {
    return request<User>(`/admin/users/${userId}/toggle-block`, {
      method: 'POST',
    });
  },

  toggleCompanyAdminUser: async (userId: number) => {
    return request<User>(`/admin/users/${userId}/toggle-company`, {
      method: 'POST',
    });
  },

  deleteAdminUser: async (userId: number) => {
    return request<any>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  getAdminGameStats: async () => {
    return request<any>('/admin/stats');
  },

  getAdminPaymentConfig: async () => {
    return request<any>('/admin/payment-config');
  },

  updateAdminPaymentConfig: async (data: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    usdtAddress?: string;
    adminTelegramUsername?: string;
  }) => {
    return request<any>('/admin/payment-config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  clearAdminData: async () => {
    return request<{ success: boolean; message: string }>('/admin/clear-data', {
      method: 'POST',
    });
  },

  // VIP & Monthly Reward APIs
  getVipInfo: async () => {
    return request<any>('/vip/info');
  },

  claimVipReward: async () => {
    return request<any>('/vip/claim', {
      method: 'POST',
    });
  },

  getAdminVipConfigs: async () => {
    return request<any>('/admin/vip-configs');
  },

  updateAdminVipConfigs: async (configs: any[]) => {
    return request<any>('/admin/vip-configs', {
      method: 'POST',
      body: JSON.stringify({ configs }),
    });
  },
};
