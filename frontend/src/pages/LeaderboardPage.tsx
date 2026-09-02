import React, { useState, useEffect } from 'react';
import { LeaderboardData } from '../types';
import { api } from '../services/api';
import { Trophy, RefreshCw, Crown } from 'lucide-react';

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

  const top1 = data?.top[0];
  const top2 = data?.top[1];
  const top3 = data?.top[2];
  const remaining = data?.top.slice(3) || [];

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400 animate-bounce" />
          <h1 className="text-2xl font-black text-white tracking-wide">BẢNG XẾP HẠNG</h1>
        </div>
        <button
          onClick={() => fetchLeaderboard(period)}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-transform"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setPeriod('all')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            period === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setPeriod('today')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            period === 'today'
              ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            period === 'week'
              ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tuần này
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-amber-400"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* TOP 3 PODIUM DISPLAY */}
          <div className="card-glass p-4 border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20">
            <div className="flex items-end justify-center gap-3 pt-2 pb-1">
              {/* TOP 2 (SILVER - LEFT) */}
              {top2 && (
                <div className="flex flex-col items-center w-1/3">
                  <div className="relative mb-1">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">🥈</span>
                    <img
                      src={top2.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top2.telegram_id}`}
                      alt={top2.first_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-300 shadow-md bg-slate-950"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${top2.telegram_id}`;
                      }}
                    />
                  </div>
                  <span className="text-xs font-black text-white truncate max-w-[85px] mt-1">
                    {top2.first_name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {top2.wins}W - {top2.losses}L
                  </span>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-black text-[11px]">
                    {top2.rating.toLocaleString()} Elo
                  </div>
                </div>
              )}

              {/* TOP 1 (GOLD - CENTER - ELEVATED) */}
              {top1 && (
                <div className="flex flex-col items-center w-1/3 -mt-4">
                  <div className="relative mb-1">
                    <Crown className="w-6 h-6 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                    <img
                      src={top1.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top1.telegram_id}`}
                      alt={top1.first_name}
                      className="w-18 h-18 rounded-full object-cover border-4 border-amber-400 shadow-xl shadow-amber-500/30 bg-slate-950"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${top1.telegram_id}`;
                      }}
                    />
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase shadow">
                      🥇 BÁ CHỦ
                    </span>
                  </div>
                  <span className="text-sm font-black text-amber-400 truncate max-w-[100px] mt-2">
                    {top1.first_name}
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-400">
                    {top1.wins}W - {top1.losses}L ({( (top1.wins / Math.max(1, top1.wins + top1.losses)) * 100 ).toFixed(0)}%)
                  </span>
                  <div className="mt-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20">
                    {top1.rating.toLocaleString()} Elo
                  </div>
                </div>
              )}

              {/* TOP 3 (BRONZE - RIGHT) */}
              {top3 && (
                <div className="flex flex-col items-center w-1/3">
                  <div className="relative mb-1">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">🥉</span>
                    <img
                      src={top3.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top3.telegram_id}`}
                      alt={top3.first_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-700 shadow-md bg-slate-950"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${top3.telegram_id}`;
                      }}
                    />
                  </div>
                  <span className="text-xs font-black text-white truncate max-w-[85px] mt-1">
                    {top3.first_name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {top3.wins}W - {top3.losses}L
                  </span>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-500 font-black text-[11px]">
                    {top3.rating.toLocaleString()} Elo
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RANKS 4 TO 100 LIST */}
          <div className="space-y-2">
            <div className="text-xs font-black text-slate-400 uppercase px-1">
              DANH SÁCH CAO THỦ XẾP HẠNG (#4 - #100)
            </div>

            <div className="space-y-2">
              {remaining.map((entry) => {
                const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ');
                const avatar = entry.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.telegram_id}`;

                return (
                  <div
                    key={entry.id}
                    className="card-glass p-3 flex items-center justify-between border-slate-800 hover:border-slate-700 bg-slate-900/90 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400 w-6 text-center">
                        #{entry.rank}
                      </span>

                      <img
                        src={avatar}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover bg-slate-950 border border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.telegram_id}`;
                        }}
                      />

                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-white truncate max-w-[130px]">
                          {name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          Thắng: <span className="text-emerald-400 font-bold">{entry.wins}</span> | Thua: <span className="text-red-400 font-bold">{entry.losses}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-black text-xs">
                      {entry.rating.toLocaleString()} Elo
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Rank for Current User */}
      {data?.currentUserRank && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="text-xs font-black text-amber-400 mb-1.5">VỊ TRÍ XẾP HẠNG CỦA BẠN:</div>
          <div className="card-glass p-3 flex items-center justify-between border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-amber-400 w-7 text-center">
                #{data.currentUserRank.rank}
              </span>
              <div>
                <div className="text-xs font-extrabold text-white">
                  {data.currentUserRank.first_name} (BẠN)
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  Thắng: {data.currentUserRank.wins} | Thua: {data.currentUserRank.losses}
                </div>
              </div>
            </div>
            <div className="text-xs font-black text-amber-400">
              {data.currentUserRank.rating.toLocaleString()} điểm
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
