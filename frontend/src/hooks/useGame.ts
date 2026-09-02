import { useState, useEffect, useCallback } from 'react';
import { ActivePage, Match, Move, User } from '../types';
import { api } from '../services/api';
import { getTelegramWebApp, triggerHapticImpact, triggerHapticNotification } from '../services/telegram';

export function useGame() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  // Initialize auth
  const initAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tg = getTelegramWebApp();
      const initData = tg?.initData || '';
      let refCode = tg?.initDataUnsafe?.start_param;

      if (refCode && refCode.startsWith('ref_')) {
        refCode = refCode.replace('ref_', '');
      }

      const { user: authUser } = await api.authTelegram(initData, refCode);
      setUser(authUser);
    } catch (err: any) {
      console.error('Lỗi khởi tạo ứng dụng:', err);
      setError(err.message || 'Không thể đăng nhập vào ứng dụng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const refreshUser = async () => {
    try {
      const updated = await api.getMe();
      setUser(updated);
    } catch (err) {
      console.error('Lỗi làm mới thông tin người dùng:', err);
    }
  };

  // Submit move to backend without immediately redirecting
  const submitMove = async (move: Move): Promise<Match> => {
    triggerHapticImpact('medium');
    setLoading(true);
    setError(null);
    try {
      const res = await api.playGame(move);
      setCurrentMatch(res.match);
      setUser(res.updatedUser);
      return res.match;
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi nước đi');
      triggerHapticNotification('error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Called when 10-second reveal countdown finishes
  const showResult = (match: Match) => {
    setCurrentMatch(match);
    if (match.result === 'win') {
      triggerHapticNotification('success');
    } else if (match.result === 'lose') {
      triggerHapticNotification('error');
    } else {
      triggerHapticImpact('light');
    }
    setActivePage('result');
  };

  const navigateTo = (page: ActivePage) => {
    triggerHapticImpact('light');
    setActivePage(page);
  };

  return {
    user,
    setUser,
    activePage,
    navigateTo,
    loading,
    error,
    currentMatch,
    submitMove,
    showResult,
    refreshUser,
  };
}
