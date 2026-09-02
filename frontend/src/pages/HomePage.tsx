import React from 'react';
import { User, ActivePage } from '../types';
import { Header } from '../components/Header';
import { Gamepad2, Trophy, Gift, Users, UserCheck } from 'lucide-react';

interface HomePageProps {
  user: User | null;
  onNavigate: (page: ActivePage) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigate }) => {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <Header
        user={user}
        onProfileClick={() => onNavigate('profile')}
        onTopupClick={() => onNavigate('wallet')}
        onAdminClick={() => onNavigate('admin')}
      />

      {/* Main Game Center Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center">
        {/* Game Badge / Title */}
        <div className="relative mb-4">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 opacity-40 blur-xl animate-pulse"></div>
          <div className="relative bg-slate-900/90 border border-slate-700/80 px-8 py-4 rounded-3xl shadow-2xl overflow-visible">
            <h1 className="text-4xl sm:text-5xl font-black text-amber-400 tracking-wider drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)] pt-2 pb-1 leading-normal inline-block">
              OẲN TÙ TÌ
            </h1>
          </div>
        </div>

        {/* Animated Hand Gesture Icons */}
        <div className="flex items-center justify-center gap-4 my-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-3xl sm:text-4xl shadow-lg animate-bounce" style={{ animationDelay: '0s' }}>
            ✊
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/40 flex items-center justify-center text-3xl sm:text-4xl shadow-lg animate-bounce" style={{ animationDelay: '0.15s' }}>
            ✋
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl sm:text-4xl shadow-lg animate-bounce" style={{ animationDelay: '0.3s' }}>
            ✌️
          </div>
        </div>

        {/* Main Action Buttons Grid */}
        <div className="w-full max-w-xs space-y-3 my-4">
          <button
            onClick={() => onNavigate('lobby')}
            className="w-full py-4 px-6 btn-game-primary text-xl shadow-amber-500/50 shadow-xl group flex items-center justify-center"
          >
            <Gamepad2 className="w-7 h-7 mr-3 group-hover:scale-110 transition-transform" />
            <span>🎮 CHƠI NGAY</span>
          </button>

          <button
            onClick={() => onNavigate('room')}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg border border-blue-400/40 shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center group"
          >
            <Users className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
            <span>👥 CHẾ ĐỘ TẠO PHÒNG</span>
          </button>
        </div>

        {/* Quick Menu Grid */}
        <div className="w-full max-w-xs grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => onNavigate('leaderboard')}
            className="p-3.5 card-glass hover:bg-slate-800 flex items-center gap-3 text-left transition-all active:scale-95 border-amber-500/20"
          >
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Bảng Xếp Hạng</div>
              <div className="text-[10px] text-slate-400 font-semibold">Top 100 cao thủ</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('rewards')}
            className="p-3.5 card-glass hover:bg-slate-800 flex items-center gap-3 text-left transition-all active:scale-95 border-purple-500/20"
          >
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Phần Thưởng</div>
              <div className="text-[10px] text-slate-400 font-semibold">Nhiệm vụ ngày</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('referral')}
            className="p-3.5 card-glass hover:bg-slate-800 flex items-center gap-3 text-left transition-all active:scale-95 border-blue-500/20"
          >
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Mời Bạn Bè</div>
              <div className="text-[10px] text-slate-400 font-semibold">Tăng thưởng</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="p-3.5 card-glass hover:bg-slate-800 flex items-center gap-3 text-left transition-all active:scale-95 border-emerald-500/20"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Hồ Sơ Của Tôi</div>
              <div className="text-[10px] text-slate-400 font-semibold">Chỉ số cá nhân</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
