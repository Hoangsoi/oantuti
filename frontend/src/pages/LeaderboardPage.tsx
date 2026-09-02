import React, { useState, useEffect } from 'react';
import { LeaderboardData } from '../types';
import { api } from '../services/api';
import { Trophy, RefreshCw } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [period, setPeriod] = useState<'all' | 'today' | 'week'>('all');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (selectedPeriod: 'all' | 'today' | 'week') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLeaderboard(selectedPeriod);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Không thể tải bảng xếp hạng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-sm font-black text-slate-400 w-7 text-center">#{rank}</span>;
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400" />
          <h1 className="text-2xl font-black text-white tracking-wide">BẢNG XẾP HẠNG</h1>
        </div>
        <button
          onClick={() => fetchLeaderboard(period)}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-4">
        <button
          onClick={() => setPeriod('all')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            period === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setPeriod('today')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            period === 'today'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            period === 'week'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tuần này
        </button>
      </div>

      {/* Error or Loading */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold text-center my-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {data?.top.map((entry) => {
            const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ');
            const avatar = entry.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.telegram_id}`;

            return (
              <div
                key={entry.id}
                className={`card-glass p-3 flex items-center justify-between border-slate-700/60 ${
                  entry.rank <= 3 ? 'bg-gradient-to-r from-slate-800/90 to-amber-950/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center justify-center">{getRankBadge(entry.rank)}</div>
                  <img
                    src={avatar}
                    alt={name}
                    className="w-10 h-10 rounded-full object-cover bg-slate-900 border border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.telegram_id}`;
                    }}
                  />
                  <div>
                    <div className="text-sm font-extrabold text-white truncate max-w-[140px]">
                      {name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold">
                      Thắng: <span className="text-emerald-400">{entry.wins}</span> | Thua: <span className="text-red-400">{entry.losses}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400 font-black text-sm">
                  <span>{entry.rating.toLocaleString()}</span>
                  <span className="text-[10px] text-amber-300">đ</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Rank for Current User if outside top 100 */}
      {data?.currentUserRank && data.currentUserRank.rank > 100 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="text-xs font-extrabold text-amber-400 mb-2">Vị trí của bạn:</div>
          <div className="card-glass p-3 flex items-center justify-between border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-amber-400 w-8 text-center">
                #{data.currentUserRank.rank}
              </span>
              <div>
                <div className="text-sm font-extrabold text-white">
                  {data.currentUserRank.first_name}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold">
                  Thắng: {data.currentUserRank.wins}
                </div>
              </div>
            </div>
            <div className="text-sm font-black text-amber-400">
              {data.currentUserRank.rating.toLocaleString()} điểm
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
