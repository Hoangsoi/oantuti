import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivePage, Match, Move, User } from '../types';
import { api } from '../services/api';
import { waitForTelegramSdk, triggerHapticImpact, triggerHapticNotification } from '../services/telegram';

export function useGame() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  const authInProgressRef = useRef<boolean>(false);

  // Initialize auth after Telegram SDK is ready
  const initAuth = useCallback(async () => {
    if (authInProgressRef.current) return;
    authInProgressRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Safely poll and wait for Telegram WebApp SDK & initData initialization
      const { tg, initData } = await waitForTelegramSdk(20, 100);
      let rawRef = tg?.initDataUnsafe?.start_param;

      if (!rawRef && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        rawRef = urlParams.get('startapp') || urlParams.get('tgWebAppStartParam') || urlParams.get('start_param') || urlParams.get('ref') || undefined;
      }

      console.log('[API] POST /auth/telegram', { rawRef });
      const { user: authUser } = await api.authTelegram(initData, rawRef);
      setUser(authUser);
    } catch (err: any) {
      console.error('[Auth Error]', err);
      setError(err.message || 'Không thể đăng nhập vào ứng dụng');
    } finally {
      setLoading(false);
      authInProgressRef.current = false;
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
    refreshUser();
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
