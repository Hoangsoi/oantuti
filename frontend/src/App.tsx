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

export const App: React.FC = () => {
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
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="text-4xl mb-2">⚠️</div>
        <h2 className="text-lg font-black text-red-400">Lỗi kết nối</h2>
        <p className="text-xs text-slate-300 font-semibold mt-2 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 btn-game-primary text-sm"
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
            onPlayAgain={() => navigateTo('game')}
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
