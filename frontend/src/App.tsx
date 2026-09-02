import React, { useEffect, useState } from 'react';
import { Room } from './types';
import { useGame } from './hooks/useGame';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReferralPage } from './pages/ReferralPage';
import { RewardsPage } from './pages/RewardsPage';
import { RoomPage } from './pages/RoomPage';
import { WalletPage } from './pages/WalletPage';
import { AdminPage } from './pages/AdminPage';
import { LobbyPage } from './pages/LobbyPage';
import { TopupModal } from './components/TopupModal';
import { getTelegramWebApp } from './services/telegram';
import { api } from './services/api';
import { startBgm } from './services/sound';

export const App: React.FC = () => {
  // Start BGM on user interaction (adhering to browser autoplay policy)
  useEffect(() => {
    const handleFirstInteraction = () => {
      startBgm();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);
  const {
    user,
    setUser,
    activePage,
    navigateTo,
    loading,
    error,
    currentMatch,
    submitMove,
    showResult,
  } = useGame();

  const [isTopupOpen, setIsTopupOpen] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // Check if opened from Telegram room deep link (startapp=room_839210)
  useEffect(() => {
    const tg = getTelegramWebApp();
    const startParam = tg?.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('room_')) {
      const roomCode = startParam.replace('room_', '');
      api.joinRoom(roomCode).then(() => {
        navigateTo('room');
      }).catch((e) => {
        console.error('Lỗi khi tự động tham gia phòng từ link:', e);
      });
    }
  }, []);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white px-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 animate-bounce mb-4">
          ✊
        </div>
        <h1 className="text-2xl font-black text-amber-400">OẲN TÙ TÌ</h1>
        <p className="text-xs text-slate-400 font-bold mt-1">Đang khởi tạo Telegram Mini App...</p>
        <div className="mt-6 animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-red-400">LỖI KẾT NỐI MÁY CHỦ</h2>
          <p className="text-xs text-slate-300 font-semibold max-w-xs mx-auto">{error}</p>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-amber-500/40 rounded-2xl text-[11px] text-slate-300 text-left space-y-2 max-w-xs mx-auto">
          <div className="font-extrabold text-amber-400 flex items-center gap-1">
            <span>💡 Nguyên nhân trên điện thoại:</span>
          </div>
          <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
            Máy tính chạy được vì truy cập <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">localhost</code> trực tiếp trên máy. Điện thoại không thể gọi đường dẫn localhost của PC và Telegram trên di động <strong>bắt buộc phải có đường dẫn HTTPS công khai</strong>.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3.5 btn-game-primary text-sm shadow-amber-500/20"
        >
          TẢI LẠI TRANG
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return <HomePage user={user} onNavigate={navigateTo} />;
      case 'game':
        return (
          <GamePage
            onPlay={submitMove}
            onFinishReveal={showResult}
            onCancel={() => navigateTo('home')}
            isLoading={loading}
            errorMessage={error}
          />
        );
      case 'room':
        return (
          <RoomPage
            currentUser={user}
            initialRoom={currentRoom}
            onFinishRoomMatch={(simulatedMatch) => {
              showResult(simulatedMatch);
            }}
            onBackHome={() => navigateTo('home')}
            onOpenTopup={() => navigateTo('wallet')}
          />
        );
      case 'wallet':
        return (
          <WalletPage
            currentUser={user}
            onUserUpdated={(updatedUser) => setUser(updatedUser)}
            onBackHome={() => navigateTo('home')}
          />
        );
      case 'lobby':
        return (
          <LobbyPage
            user={user}
            onBackHome={() => navigateTo('home')}
            onJoinRoom={(room) => {
              setCurrentRoom(room);
              navigateTo('room');
            }}
            onPlayBot={() => navigateTo('game')}
            onCreateRoomModal={() => {
              setCurrentRoom(null);
              navigateTo('room');
            }}
          />
        );
      case 'admin':
        return (
          <AdminPage
            currentUser={user}
            onAdminAuthenticated={(adminUser) => setUser(adminUser)}
            onBackHome={() => navigateTo('home')}
          />
        );
      case 'result':
        return (
          <ResultPage
            match={currentMatch}
            onPlayAgain={() => {
              if (currentMatch?.opponent_type === 'pvp') {
                navigateTo('room');
              } else {
                navigateTo('game');
              }
            }}
            onGoHome={() => navigateTo('home')}
          />
        );
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'profile':
        return <ProfilePage user={user} onNavigate={navigateTo} />;
      case 'referral':
        return <ReferralPage />;
      case 'rewards':
        return <RewardsPage onRewardClaimed={(updatedUser) => setUser(updatedUser)} />;
      default:
        return <HomePage user={user} onNavigate={navigateTo} />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={navigateTo}>
      {renderContent()}
      <TopupModal
        isOpen={isTopupOpen}
        onClose={() => setIsTopupOpen(false)}
        onSuccess={(updatedUser) => setUser(updatedUser)}
      />
    </Layout>
  );
};

export default App;
