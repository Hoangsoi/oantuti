import React, { useState, useEffect } from 'react';
import { User, ActivePage, Match, Move } from '../types';
import { api } from '../services/api';
import { Trophy, Swords, Flame, CheckCircle, XCircle, MinusCircle, Percent, Calendar, UserCheck, ShieldCheck, History, RefreshCw, Coins } from 'lucide-react';

interface ProfilePageProps {
  user: User | null;
  onUserUpdated?: (updatedUser: User) => void;
  onNavigate?: (page: ActivePage) => void;
}

const MOVE_EMOJI: Record<Move, { emoji: string; title: string }> = {
  rock: { emoji: '✊', title: 'BÚA' },
  paper: { emoji: '✋', title: 'BAO' },
  scissors: { emoji: '✌️', title: 'KÉO' },
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdated, onNavigate }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);

  const fetchHistory = async () => {
    setLoadingMatches(true);
    try {
      const [resMatches, updatedUser] = await Promise.all([
        api.getMatches(50),
        api.getMe().catch(() => null),
      ]);
      setMatches(resMatches || []);
      if (updatedUser && onUserUpdated) {
        onUserUpdated(updatedUser);
      }
    } catch (err) {
      console.error('Không thể tải lịch sử trận đấu:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (!user) return null;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Người chơi';
  const avatarUrl = user.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.telegram_id}`;

  const totalMatches = Math.max(user.total_matches || 0, matches.length);
  const winsCount = (user.wins || 0) > 0 ? user.wins : matches.filter((m) => m.result === 'win').length;
  const lossesCount = (user.losses || 0) > 0 ? user.losses : matches.filter((m) => m.result === 'lose').length;
  const drawsCount = (user.draws || 0) > 0 ? user.draws : matches.filter((m) => m.result === 'draw').length;
  const winRate = totalMatches > 0 ? Math.round((winsCount / totalMatches) * 100) : 0;
  const joinDate = new Date(user.created_at).toLocaleDateString('vi-VN');

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-7 h-7 text-amber-400" />
          <h1 className="text-2xl font-black text-white tracking-wide">HỒ SƠ CỦA TÔI</h1>
        </div>
      </div>

      {/* Main Profile Avatar Card */}
      <div className="card-glass p-5 text-center flex flex-col items-center border-amber-500/30 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="relative mb-3">
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-20 h-20 rounded-full ring-4 ring-amber-400 object-cover bg-slate-950 shadow-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.telegram_id}`;
            }}
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow">
            VIP
          </div>
        </div>

        <h2 className="text-xl font-black text-white">{fullName}</h2>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">
          @{user.username || `user_${user.telegram_id}`}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-2xl">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-lg font-black text-amber-400">{user.rating.toLocaleString()} ĐIỂM</span>
        </div>
      </div>

      {/* Detailed Game Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-glass p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Tổng số trận</div>
            <div className="text-lg font-black text-white">{totalMatches}</div>
          </div>
        </div>

        <div className="card-glass p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Số trận thắng</div>
            <div className="text-lg font-black text-emerald-400">{winsCount}</div>
          </div>
        </div>

        <div className="card-glass p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Số trận thua</div>
            <div className="text-lg font-black text-red-400">{lossesCount}</div>
          </div>
        </div>

        <div className="card-glass p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-400">
            <MinusCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Số trận hòa</div>
            <div className="text-lg font-black text-slate-300">{drawsCount}</div>
          </div>
        </div>

        <div className="card-glass p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Tỷ lệ thắng</div>
            <div className="text-lg font-black text-purple-400">{winRate}%</div>
          </div>
        </div>

        <div className="card-glass p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Chuỗi thắng</div>
            <div className="text-lg font-black text-amber-400">{user.best_streak} trận</div>
          </div>
        </div>
      </div>

      {/* MATCH HISTORY SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              LỊCH SỬ VÁN CHƠI ({matches.length})
            </h2>
          </div>

          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-transform"
            title="Làm mới lịch sử"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMatches ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingMatches ? (
          <div className="card-glass p-6 text-center text-xs text-slate-400 font-semibold">
            Đang tải lịch sử ván chơi...
          </div>
        ) : matches.length === 0 ? (
          <div className="card-glass p-6 text-center text-xs font-semibold text-slate-400">
            Bạn chưa thực hiện ván đấu nào. Hãy vào game để bắt đầu thách đấu!
          </div>
        ) : (
          <div className="space-y-2.5">
            {matches.map((m) => {
              const isWin = m.result === 'win';
              const isLose = m.result === 'lose';
              const playerMoveInfo = MOVE_EMOJI[m.player_move] || { emoji: '❓', title: 'NƯỚC ĐI' };
              const opponentMoveInfo = MOVE_EMOJI[m.opponent_move] || { emoji: '❓', title: 'NƯỚC ĐI' };
              const timeStr = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(m.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

              return (
                <div
                  key={m.id}
                  className={`card-glass p-3.5 border-slate-800 space-y-2 transition-all ${
                    isWin
                      ? 'border-l-4 border-l-emerald-500 bg-emerald-950/10'
                      : isLose
                      ? 'border-l-4 border-l-red-500 bg-red-950/10'
                      : 'border-l-4 border-l-blue-500 bg-blue-950/10'
                  }`}
                >
                  {/* Top Bar: Match Type & Time */}
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-400 font-extrabold flex items-center gap-1">
                      {m.opponent_type === 'pvp' ? '⚔️ Đấu Phòng PvP' : '🤖 Đấu Bot AI'}
                    </span>
                    <span className="text-slate-400">{timeStr}</span>
                  </div>

                  {/* Move Versus Row */}
                  <div className="grid grid-cols-2 gap-2 items-center text-center bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Bạn:</span>
                      <span className="text-xl">{playerMoveInfo.emoji}</span>
                      <span className="text-xs font-black text-amber-300">{playerMoveInfo.title}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 border-l border-slate-800">
                      <span className="text-xs font-bold text-slate-400">Đối thủ:</span>
                      <span className="text-xl">{opponentMoveInfo.emoji}</span>
                      <span className="text-xs font-black text-indigo-300">{opponentMoveInfo.title}</span>
                    </div>
                  </div>

                  {/* Bottom Stats: Outcome, Rating & Coins */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2 font-black">
                      {isWin && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
                          🎉 THẮNG
                        </span>
                      )}
                      {isLose && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px]">
                          😢 THUA
                        </span>
                      )}
                      {!isWin && !isLose && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px]">
                          🤝 HÒA
                        </span>
                      )}

                      <span className={m.rating_change > 0 ? 'text-emerald-400' : m.rating_change < 0 ? 'text-red-400' : 'text-slate-400'}>
                        {m.rating_change > 0 ? `+${m.rating_change}` : m.rating_change} điểm
                      </span>
                    </div>

                    {m.coins_change !== undefined && (
                      <div className="font-extrabold text-[11px] flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400" />
                        <span className={m.coins_change > 0 ? 'text-emerald-400' : m.coins_change < 0 ? 'text-red-400' : 'text-slate-400'}>
                          {m.coins_change > 0 ? `+${m.coins_change.toLocaleString()} Xu` : m.coins_change < 0 ? `${m.coins_change.toLocaleString()} Xu` : '0 Xu'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Info Footer */}
      <div className="card-glass p-4 text-xs font-semibold text-slate-400 space-y-2 border-slate-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Ngày tham gia:</span>
          </div>
          <span className="font-extrabold text-white">{joinDate}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <span>Mã giới thiệu:</span>
          <span className="font-black text-amber-400">{user.referral_code}</span>
        </div>
      </div>

      {/* Admin Entrance Button */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('admin')}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-sm border border-purple-400/40 shadow-xl shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <span>🛡️ DASHBOARD QUẢN TRỊ ADMIN (DUYỆT NẠP/RÚT)</span>
        </button>
      )}
    </div>
  );
};
